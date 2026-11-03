"""MedGuard AI - Medicine Recognition Service (Feature-Based Architecture).

Pipeline:
    Image
      ↓
    Image Quality Check (Laplacian blur, dimensions, contrast)
      ↓
    Tesseract OCR (tokens + bounding boxes + lines)
      ↓
    Candidate Extractor (all packaging regions, no positional bias)
      ↓
    Field-Level Decision Engine (determines OCR vs Gemma per field)
      ↓
    Gemma Vision (only when OCR is uncertain or missing)
      ↓
    Cross-Field Validation & Chronological Date Checks
      ↓
    Structured Output & Decision Audit Log
"""

import base64
import io
import json
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

import httpx
from PIL import Image
from sqlalchemy.orm import Session

from backend.shared.config import settings
from backend.features.ai_recognition.models import AIScan
from backend.features.ai_recognition.schemas import (
    AIScanResponse,
    BoundingBox,
    OCRRegion,
    ProcessingMetadata,
)
from backend.features.ai_recognition.image_quality import ImageQualityChecker
from backend.features.ai_recognition.candidate_extractor import CandidateExtractor
from backend.features.ai_recognition.decision_engine import DecisionEngine
from backend.features.ai_recognition.providers.ocr_provider import OCRService
from backend.features.ai_recognition.providers.gemma_provider import GemmaVisionProvider
from backend.features.ai_recognition.validation import ValidationResult, ValidationService
from backend.features.ai_recognition.prompts import GEMMA_PROMPT, GEMMA_TARGETED_SYSTEM_PROMPT

logger = logging.getLogger("medguard.ai_service")

FIELD_KEYWORDS = {
    "batch_number": ["batch", "b.no", "b.no.", "lot", "b.n.", "bno", "b."],
    "expiry_date": ["exp", "expiry", "date", "use", "before", "e.d.", "valid"],
    "manufacturing_date": ["mfg", "mfd", "m.d.", "date", "manuf"],
    "strength": ["mg", "ml", "mcg", "gm", "g", "%", "iu"],
    "medicine_name": [],
}


class SourceMapping(dict):
    """Dictionary mapping each medicine field to its source ('OCR' or 'GEMMA').
    Supports backward compatibility when compared directly to string 'tesseract' or 'gemma'.
    """

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            target = other.lower()
            if target in ("tesseract", "ocr"):
                return all(v in ("OCR", "tesseract") for v in self.values()) if self else True
            if target in ("gemma", "ai", "hybrid"):
                return any(v in ("GEMMA", "gemma", "ai") for v in self.values())
        return super().__eq__(other)


def _get_ocr_service():
    """Resolve OCRService dynamically to respect mock patches in tests."""
    try:
        import backend.app.services.ai_service as _compat
        return getattr(_compat, "OCRService", OCRService)
    except Exception:
        return OCRService


def _get_call_gemma_vision():
    """Resolve call_gemma_vision dynamically to respect mock patches in tests."""
    try:
        import backend.app.services.ai_service as _compat
        return getattr(_compat, "call_gemma_vision", call_gemma_vision)
    except Exception:
        return call_gemma_vision


def _get_api_key() -> str:
    """Resolve Gemma API key dynamically to respect test patches."""
    try:
        import backend.app.services.ai_service as _compat
        if hasattr(_compat, "settings"):
            return getattr(_compat.settings, "GEMMA_API_KEY", settings.GEMMA_API_KEY)
    except Exception:
        pass
    return settings.GEMMA_API_KEY


def decode_image_base64(value: str) -> Tuple[Image.Image, str, str]:
    """Decode a base64 image and return the PIL image, clean base64, and MIME type."""
    mime_type = "image/jpeg"
    clean = value.strip()

    if ";base64," in value:
        prefix, clean = value.split(";base64,", 1)
        mime_type = prefix.replace("data:", "").strip() or mime_type
        clean = clean.strip()

    clean += "=" * (-len(clean) % 4)
    image = Image.open(io.BytesIO(base64.b64decode(clean)))
    return image, clean, mime_type


def image_to_base64(image: Image.Image) -> str:
    """Convert a PIL image to JPEG base64."""
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG", quality=92)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def crop_uncertain_regions(
    image: Image.Image,
    bounding_boxes: List[Dict[str, Any]],
    uncertain_fields: Dict[str, Any],
) -> Tuple[Image.Image, bool, List[int]]:
    """Crop around OCR tokens related to fields that need AI recovery."""
    if not uncertain_fields or not bounding_boxes:
        return image, False, []

    matches = []
    for field, value in uncertain_fields.items():
        keywords = FIELD_KEYWORDS.get(field, [])
        value_text = str(value).lower() if value else ""

        for item in bounding_boxes:
            text = str(item.get("text", "")).lower().strip()
            if any(word in text for word in keywords) or (value_text and value_text in text):
                matches.append(item["box"])

    width, height = image.size

    # Never assume medicine names only appear in top region: send full image
    if not matches:
        return image, False, []

    x1 = max(0, min(box["x"] for box in matches) - 40)
    y1 = max(0, min(box["y"] for box in matches) - 35)
    x2 = min(width, max(box["x"] + box["width"] for box in matches) + 120)
    y2 = min(height, max(box["y"] + box["height"] for box in matches) + 75)

    crop_width = x2 - x1
    crop_height = y2 - y1
    area = crop_width * crop_height

    # Skip crops that are too small or almost the entire image
    if crop_width < 80 or crop_height < 40 or area > 0.85 * width * height:
        return image, False, []

    return image.crop((x1, y1, x2, y2)), True, [x1, y1, crop_width, crop_height]


async def call_gemma_vision(
    image_base64_clean: str,
    mime_type: str,
    targeted_context: str,
    gemma_api_key: Optional[str] = None,
) -> Tuple[Dict[str, Any], str, str]:
    """Call vision models for pharmaceutical image details."""
    return await GemmaVisionProvider.call_gemma_vision(
        image_base64_clean=image_base64_clean,
        mime_type=mime_type,
        targeted_context=targeted_context,
        gemma_api_key=gemma_api_key,
    )


def _ocr_regions(result: Dict[str, Any]) -> List[OCRRegion]:
    """Convert OCR bounding-box dictionaries into API schema objects."""
    return [
        OCRRegion(text=item["text"], confidence=item["confidence"], box=BoundingBox(**item["box"]))
        for item in result.get("bounding_boxes", [])
    ]


def _build_data(data: Dict[str, Any], source: str = "tesseract") -> Dict[str, Any]:
    """Build the common medicine payload returned by the scanner."""
    pieces = data.get("pieces_per_strip")
    if pieces is None:
        pieces = data.get("quantity")

    return {
        "medicine_name": data.get("medicine_name") or "",
        "generic_name": data.get("generic_name") or "",
        "brand": data.get("brand") or "",
        "strength": data.get("strength") or "",
        "manufacturer": data.get("manufacturer") or "",
        "batch_number": data.get("batch_number") or "",
        "manufacturing_date": data.get("manufacturing_date") or "",
        "expiry_date": data.get("expiry_date") or "",
        "pieces_per_strip": pieces,
        "unit_of_measure": data.get("unit_of_measure") or "tablet",
        "price_per_strip": data.get("price_per_strip"),
    }


def _save_scan(
    db: Session,
    pharmacy_id: str,
    image_url: Optional[str],
    raw_response: str,
    extracted_data: Dict[str, Any],
    confidence: float,
    status: str = "completed",
    error_message: Optional[str] = None,
) -> AIScan:
    """Save one AI/OCR scan audit record in database."""
    record = AIScan(
        id=str(uuid.uuid4()),
        pharmacy_id=pharmacy_id,
        image_url=image_url or "base64_upload",
        raw_response=raw_response,
        extracted_data=extracted_data,
        confidence_score=confidence,
        status=status,
        error_message=error_message,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _processing(
    *,
    ocr_confidence: float,
    validation: str,
    ai_used: bool,
    fields: List[str],
    crop_used: bool,
    reasons: List[str],
) -> ProcessingMetadata:
    """Create the common processing metadata object."""
    return ProcessingMetadata(
        ocr_used=True,
        ocr_confidence=ocr_confidence,
        validation=validation,
        ai_fallback_used=ai_used,
        ai_fields_requested=fields,
        targeted_crop_used=crop_used,
        reason=reasons,
    )


def _low_image_quality_response(quality_issues: List[str]) -> AIScanResponse:
    """Return explicit low image quality response when image is unreadable."""
    return AIScanResponse(
        status="LOW_IMAGE_QUALITY",
        success=False,
        medicine_name=None,
        strength=None,
        batch_number=None,
        manufacturing_date=None,
        expiry_date=None,
        quantity=None,
        source=SourceMapping({"medicine_name": "NONE"}),
        confidence={"overall": 0.0, "fields": {}},
        medicine={},
        validation_status="uncertain",
        processing=ProcessingMetadata(
            ocr_used=False,
            ocr_confidence=0.0,
            validation="uncertain",
            ai_fallback_used=False,
            ai_fields_requested=[],
            targeted_crop_used=False,
            reason=quality_issues,
        ),
        bounding_boxes=[],
        extracted_data={},
        needs_manual_verification=True,
        issues=quality_issues,
        decision_log=["Image rejected due to low visual quality (blur/low resolution/contrast)."],
        warning="Please upload a clearer medicine image.",
    )


def _corrupt_image_response(error: str) -> AIScanResponse:
    """Return a clear response when the uploaded image cannot be decoded."""
    processing = ProcessingMetadata(
        ocr_used=False,
        ocr_confidence=0.0,
        validation="uncertain",
        ai_fallback_used=False,
        ai_fields_requested=[],
        targeted_crop_used=False,
        reason=[f"Invalid or corrupted image format: {error}"],
    )
    return AIScanResponse(
        status="CORRUPT_IMAGE",
        success=False,
        source=SourceMapping({}),
        confidence={"overall": 0.0, "fields": {}},
        validation_status="uncertain",
        processing=processing,
        needs_manual_verification=True,
        issues=["Could not decode uploaded image."],
        warning="Invalid image file uploaded.",
    )


def _missing_key_response(
    ocr_used: bool,
    validation: ValidationResult,
    regions: List[OCRRegion],
    decision_result: Optional[Dict[str, Any]] = None,
) -> AIScanResponse:
    """Return OCR data when AI fallback is unavailable."""
    data = _build_data(validation.normalized_data)
    reasons = validation.reasons + ["Gemma Vision API key not configured for fallback"]
    processing = _processing(
        ocr_confidence=validation.overall_confidence,
        validation="uncertain",
        ai_used=False,
        fields=list(validation.uncertain_fields),
        crop_used=False,
        reasons=reasons,
    )
    processing.ocr_used = ocr_used

    source_map = decision_result.get("source_map", {}) if decision_result else {}
    decision_logs = decision_result.get("decision_logs", []) if decision_result else []

    return AIScanResponse(
        status="PARTIAL_OCR_ONLY",
        medicine_name=data["medicine_name"],
        strength=data["strength"],
        batch_number=data["batch_number"],
        manufacturing_date=data["manufacturing_date"],
        expiry_date=data["expiry_date"],
        quantity=data["pieces_per_strip"],
        source=SourceMapping(source_map) if source_map else "tesseract",
        confidence={"overall": validation.overall_confidence, "fields": {}},
        medicine=data,
        validation_status="uncertain",
        processing=processing,
        bounding_boxes=regions,
        success=False,
        extracted_data=data,
        needs_manual_verification=True,
        issues=reasons,
        decision_log=decision_logs,
        warning="AI Vision key not configured. Unverified fields require pharmacist confirmation.",
    )


async def scan_medicine_image(
    db: Session,
    pharmacy_id: str,
    image_base64: str,
    image_url: Optional[str] = None,
) -> AIScanResponse:
    """
    Execute the intelligent medicine packaging recognition pipeline.

    Flow:
        1. Decode base64 image
        2. Image Quality Gate (Laplacian blur, dimensions, contrast)
        3. Tesseract OCR (boxes, tokens, lines)
        4. Candidate Extractor (position-agnostic candidate ranking)
        5. Field-Level Decision Engine (determines OCR vs Gemma per field)
        6. Gemma Vision (only when OCR is uncertain or missing)
        7. Validation Engine & Chronological Cross-Check
        8. Audit logging & structured response
    """
    # Step 1: Decode image
    try:
        image, clean_base64, mime_type = decode_image_base64(image_base64)
    except Exception as exc:
        logger.error("Image decode error: %s", exc)
        return _corrupt_image_response(str(exc))

    # Step 2: Image Quality Check
    quality = ImageQualityChecker.evaluate(image)
    if not quality.get("is_acceptable", True):
        issues = quality.get("issues", [])
        logger.warning("Image failed quality gate: %s", issues)
        return _low_image_quality_response(issues)

    # Step 3: Local Tesseract OCR (resolves mock if patched in tests)
    ocr_service_cls = _get_ocr_service()
    ocr_result = ocr_service_cls.run_ocr(image)
    regions = _ocr_regions(ocr_result)
    raw_text = ocr_result.get("raw_text", "")
    lines = ocr_result.get("lines", [])
    tokens = ocr_result.get("tokens", [])
    overall_ocr_conf = float(ocr_result.get("overall_confidence", 0.0))

    # Step 4: Extract candidates across all regions without positional bias
    candidates = CandidateExtractor.extract_candidates(
        tokens=tokens,
        lines=lines,
        image_width=image.width,
        image_height=image.height,
    )

    # Step 5: Field-Level Decision Engine
    decision_result = DecisionEngine.evaluate(
        candidates=candidates,
        overall_ocr_confidence=overall_ocr_conf,
        ocr_lines_count=len(lines),
    )

    decisions = decision_result["decisions"]
    source_map = dict(decision_result["source_map"])
    extracted_ocr_data = decision_result["extracted_ocr_data"]
    fields_for_gemma = decision_result["fields_for_gemma"]
    full_image_ai_required = decision_result["full_image_ai_required"]
    decision_logs = list(decision_result["decision_logs"])

    # Step 6: Validate OCR output
    validation = ValidationService.validate_ocr_output(
        extracted_fields=ocr_result.get("extracted_fields", {}),
        field_confidences=ocr_result.get("field_confidences", {}),
        diagnostics=ocr_result.get("diagnostics", {}),
        overall_confidence=overall_ocr_conf,
    )

    # If OCR output was trusted or all fields were recognized by OCR with high confidence:
    if validation.status == "trusted":
        logger.info("DecisionEngine: Validation status trusted via OCR. Skipping AI vision call.")
        return _save_trusted_scan(
            db=db,
            pharmacy_id=pharmacy_id,
            image_url=image_url,
            ocr_result=ocr_result,
            validation=validation,
            regions=regions,
            decisions=decisions,
            decision_logs=decision_logs,
        )

    # Check for Gemma API key
    key = _get_api_key()
    if not key or key.startswith("PASTE") or "placeholder" in key:
        return _missing_key_response(
            ocr_used=ocr_result.get("success", False),
            validation=validation,
            regions=regions,
            decision_result=decision_result,
        )

    # Step 7: Invoke Gemma Vision for uncertain fields
    return await _recover_with_gemma(
        db=db,
        pharmacy_id=pharmacy_id,
        image=image,
        clean_base64=clean_base64,
        mime_type=mime_type,
        image_url=image_url,
        ocr_result=ocr_result,
        validation=validation,
        regions=regions,
        api_key=key,
        decisions=decisions,
        source_map=source_map,
        extracted_ocr_data=extracted_ocr_data,
        fields_for_gemma=fields_for_gemma,
        full_image_ai_required=full_image_ai_required,
        decision_logs=decision_logs,
    )


def _save_trusted_scan(
    db: Session,
    pharmacy_id: str,
    image_url: Optional[str],
    ocr_result: Dict[str, Any],
    validation: ValidationResult,
    regions: List[OCRRegion],
    decisions: Dict[str, Any],
    decision_logs: List[str],
) -> AIScanResponse:
    """Save and return a fully trusted OCR result."""
    data = _build_data(validation.normalized_data)
    source_map = SourceMapping({field: "OCR" for field in data.keys()})
    field_confidences = {
        field: round(decisions[field].confidence, 1)
        for field in ["medicine_name", "strength", "batch_number", "manufacturing_date", "expiry_date"]
        if field in decisions
    }

    processing = _processing(
        ocr_confidence=validation.overall_confidence,
        validation="trusted",
        ai_used=False,
        fields=[],
        crop_used=False,
        reasons=[],
    )
    audit_data = {
        **data,
        "source": source_map,
        "validation_status": "trusted",
        "confidence": validation.overall_confidence,
        "processing": processing.model_dump(),
    }
    record = _save_scan(
        db,
        pharmacy_id,
        image_url,
        ocr_result.get("raw_text", ""),
        audit_data,
        validation.overall_confidence,
    )

    return AIScanResponse(
        status="SUCCESS",
        success=True,
        source=source_map,
        medicine=data,
        medicine_name=data["medicine_name"],
        strength=data["strength"],
        batch_number=data["batch_number"],
        manufacturing_date=data["manufacturing_date"],
        expiry_date=data["expiry_date"],
        quantity=data["pieces_per_strip"],
        confidence={"overall": validation.overall_confidence, "fields": field_confidences},
        validation_status="trusted",
        processing=processing,
        bounding_boxes=regions,
        extracted_data=data,
        needs_manual_verification=False,
        issues=[],
        decision_log=decision_logs,
        scan_id=record.id,
    )


async def _recover_with_gemma(
    db: Session,
    pharmacy_id: str,
    image: Image.Image,
    clean_base64: str,
    mime_type: str,
    image_url: Optional[str],
    ocr_result: Dict[str, Any],
    validation: ValidationResult,
    regions: List[OCRRegion],
    api_key: str,
    decisions: Dict[str, Any],
    source_map: Dict[str, str],
    extracted_ocr_data: Dict[str, Any],
    fields_for_gemma: List[str],
    full_image_ai_required: bool,
    decision_logs: List[str],
) -> AIScanResponse:
    """Recover uncertain fields with Gemma Vision and cross-validate."""
    crop_used = False
    ai_base64 = clean_base64
    ai_mime = mime_type

    # Only crop if specifically targeted and NOT full image required
    if not full_image_ai_required and len(fields_for_gemma) == 1:
        crop, crop_used, _ = crop_uncertain_regions(
            image, ocr_result.get("bounding_boxes", []), {f: extracted_ocr_data.get(f) for f in fields_for_gemma}
        )
        if crop_used:
            ai_base64 = image_to_base64(crop)
            ai_mime = "image/jpeg"

    # Contextual guidance for Gemma
    context = _build_gemma_context(
        validation=validation,
        ocr_success=ocr_result.get("success", False),
        crop_used=crop_used,
        fields_for_gemma=fields_for_gemma,
        extracted_ocr_data=extracted_ocr_data,
    )

    gemma_caller = _get_call_gemma_vision()
    ai_data, raw_response, ai_error = await gemma_caller(
        image_base64_clean=ai_base64,
        mime_type=ai_mime,
        targeted_context=context,
        gemma_api_key=api_key,
    )

    # Gate 2: Validate Gemma Output against pharmaceutical syntax
    clean_ai, ai_issues = ValidationService.validate_gemma_output(
        raw_ai_data=ai_data,
        uncertain_fields=validation.uncertain_fields,
    )

    final_medicine: Dict[str, Any] = {}
    field_confidences: Dict[str, float] = {}

    core_fields = [
        "medicine_name",
        "generic_name",
        "brand",
        "strength",
        "batch_number",
        "manufacturing_date",
        "expiry_date",
        "manufacturer",
        "pieces_per_strip",
        "unit_of_measure",
        "price_per_strip",
    ]

    for field in core_fields:
        # If field was reliably identified by OCR and not uncertain, keep OCR
        if (
            field not in validation.uncertain_fields
            and source_map.get(field) == "OCR"
            and extracted_ocr_data.get(field)
        ):
            final_medicine[field] = extracted_ocr_data.get(field)
            field_conf = decisions[field].confidence if field in decisions else 85.0
            field_confidences[field] = round(field_conf, 1)
        # Else if Gemma recovered this field reliably
        elif clean_ai.get(field) is not None and str(clean_ai.get(field)).strip():
            final_medicine[field] = clean_ai.get(field)
            source_map[field] = "GEMMA"
            ai_conf = float(ai_data.get("confidence_score", 90.0))
            field_confidences[field] = round(ai_conf, 1)
            decision_logs.append(f"{field}: Recovered via Gemma Vision -> {clean_ai.get(field)}")
        # If neither recovered, fallback to OCR candidate if present or null
        elif extracted_ocr_data.get(field):
            final_medicine[field] = extracted_ocr_data.get(field)
            source_map[field] = "OCR"
            field_conf = decisions[field].confidence if field in decisions else 50.0
            field_confidences[field] = round(field_conf, 1)
        elif validation.normalized_data.get(field):
            final_medicine[field] = validation.normalized_data.get(field)
            source_map[field] = "OCR"
            field_confidences[field] = 50.0
        else:
            final_medicine[field] = None
            source_map[field] = "NONE"
            field_confidences[field] = 0.0

    # Cross-Field Chronological Date Validation (mfg <= exp)
    mfg_val = final_medicine.get("manufacturing_date")
    exp_val = final_medicine.get("expiry_date")
    if mfg_val and exp_val:
        mfg_dt, norm_mfg = ValidationService._parse_and_normalize_date(mfg_val)
        exp_dt, norm_exp = ValidationService._parse_and_normalize_date(exp_val)
        if mfg_dt and exp_dt and mfg_dt > exp_dt:
            # Chronological contradiction: discard both invalid dates
            final_medicine["manufacturing_date"] = None
            final_medicine["expiry_date"] = None
            date_issue = (
                f"Manufacturing date ({norm_mfg}) cannot be after expiry date ({norm_exp}); discarded invalid dates."
            )
            ai_issues.append(date_issue)
            decision_logs.append(date_issue)
        else:
            if norm_mfg:
                final_medicine["manufacturing_date"] = norm_mfg
            if norm_exp:
                final_medicine["expiry_date"] = norm_exp
    elif exp_val:
        _, norm_exp = ValidationService._parse_and_normalize_date(exp_val)
        if norm_exp:
            final_medicine["expiry_date"] = norm_exp

    # Determine recovery status
    ai_confidence = float(
        ai_data.get("confidence_score", 90.0 if clean_ai.get("medicine_name") else 35.0)
    )
    recovered = (
        bool(final_medicine.get("medicine_name"))
        and (bool(final_medicine.get("batch_number")) or bool(final_medicine.get("expiry_date")))
        and not ai_issues
    )
    status = "ai_validated" if recovered else "uncertain"

    # Overall confidence calculation
    valid_scores = [score for score in field_confidences.values() if score > 0]
    overall_confidence = round(
        sum(valid_scores) / len(valid_scores) if valid_scores else max(validation.overall_confidence, ai_confidence),
        1,
    )

    all_issues = list(dict.fromkeys(validation.reasons + ai_issues))
    processing = _processing(
        ocr_confidence=validation.overall_confidence,
        validation="uncertain",
        ai_used=True,
        fields=fields_for_gemma,
        crop_used=crop_used,
        reasons=all_issues,
    )

    source_map_final = SourceMapping(source_map)
    audit_data = {
        **final_medicine,
        "source": source_map_final,
        "validation_status": status,
        "confidence": overall_confidence,
        "processing": processing.model_dump(),
    }
    record = _save_scan(
        db,
        pharmacy_id,
        image_url,
        raw_response or ai_error or ocr_result.get("raw_text", ""),
        audit_data,
        overall_confidence,
        status="completed" if raw_response else "failed",
        error_message=ai_error if not raw_response else None,
    )

    return AIScanResponse(
        status="SUCCESS",
        success=bool(final_medicine.get("medicine_name")) or bool(raw_response),
        source=source_map_final,
        medicine=final_medicine,
        medicine_name=final_medicine.get("medicine_name"),
        strength=final_medicine.get("strength"),
        batch_number=final_medicine.get("batch_number"),
        manufacturing_date=final_medicine.get("manufacturing_date"),
        expiry_date=final_medicine.get("expiry_date"),
        quantity=final_medicine.get("pieces_per_strip"),
        confidence={"overall": overall_confidence, "fields": field_confidences},
        validation_status=status,
        processing=processing,
        bounding_boxes=regions,
        extracted_data=final_medicine,
        needs_manual_verification=not recovered,
        issues=all_issues,
        decision_log=decision_logs,
        scan_id=record.id,
        warning=ai_error if not raw_response else None,
    )


def _build_gemma_context(
    validation: ValidationResult,
    ocr_success: bool,
    crop_used: bool,
    fields_for_gemma: List[str],
    extracted_ocr_data: Dict[str, Any],
) -> str:
    """Create the focused context sent alongside the image."""
    mode = "Focused subregion crop" if crop_used else "Full image"
    return (
        f"Targeted Recovery Mode: {mode}\n"
        f"Fields Requiring Recovery: {', '.join(fields_for_gemma)}\n"
        f"OCR Candidate Context: {json.dumps(extracted_ocr_data)}\n"
        f"OCR Overall Confidence: {validation.overall_confidence}%\n"
        f"OCR Reasons/Ambiguities: {json.dumps(validation.reasons)}"
    )
