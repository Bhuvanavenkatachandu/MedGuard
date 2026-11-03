"""MedGuard AI: hybrid Tesseract + Gemma medicine scanning service.

Flow:
    Image -> Tesseract -> validation -> Gemma only when needed -> validation
    -> merge -> save scan -> response
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

from backend.app.config import settings
from backend.app.models.ai_scan import AIScan
from backend.app.schemas.ai import AIScanResponse, BoundingBox, OCRRegion, ProcessingMetadata
from backend.app.services.ocr_service import OCRService
from backend.app.services.validation_service import ValidationResult, ValidationService

logger = logging.getLogger("medguard.ai_service")

GEMMA_PROMPT = """You are MedGuard AI's high-precision pharmaceutical vision assistant.
Analyze this medicine packaging photo to verify or recover medicine information.

Rules:
1. Read Medicine Name, Active Composition, Strength, Batch Number, Manufacturing Date, and Expiry Date.
2. If text is blurry, incomplete, or not visible, return null. NEVER guess.
3. Never fabricate price or quantity. Return null if not explicitly visible.
4. Return null for partial or invalid dates.
5. Return STRICT JSON only:
{
  "medicine_name": "Full medicine name or null",
  "generic_name": "Active ingredient or null",
  "brand": "Brand or marketer or null",
  "strength": "e.g. 500 mg or null",
  "manufacturer": "Manufacturer or null",
  "batch_number": "Batch/Lot number or null",
  "manufacturing_date": "MM/YYYY or DD/MM/YYYY or null",
  "expiry_date": "MM/YYYY or DD/MM/YYYY or null",
  "pieces_per_strip": null,
  "unit_of_measure": "tablet",
  "price_per_strip": null,
  "confidence_score": 92.0,
  "issues": []
}
"""

# Alias for backward-compatibility with external callers
GEMMA_TARGETED_SYSTEM_PROMPT = GEMMA_PROMPT

FIELD_KEYWORDS = {
    "batch_number": ["batch", "b.no", "b.no.", "lot", "b.n.", "bno", "b."],
    "expiry_date": ["exp", "expiry", "date", "use", "before", "e.d.", "valid"],
    "manufacturing_date": ["mfg", "mfd", "m.d.", "date", "manuf"],
    "strength": ["mg", "ml", "mcg", "gm", "g", "%", "iu"],
    "medicine_name": [],
}


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

    # Medicine names usually appear near the upper part of packaging.
    if not matches:
        if list(uncertain_fields) == ["medicine_name"]:
            bottom = int(height * 0.45)
            return image.crop((0, 0, width, bottom)), True, [0, 0, width, bottom]
        return image, False, []

    x1 = max(0, min(box["x"] for box in matches) - 40)
    y1 = max(0, min(box["y"] for box in matches) - 35)
    x2 = min(width, max(box["x"] + box["width"] for box in matches) + 120)
    y2 = min(height, max(box["y"] + box["height"] for box in matches) + 75)

    crop_width = x2 - x1
    crop_height = y2 - y1
    area = crop_width * crop_height

    # Skip crops that are too small or almost the entire image.
    if crop_width < 80 or crop_height < 40 or area > 0.85 * width * height:
        return image, False, []

    return image.crop((x1, y1, x2, y2)), True, [x1, y1, crop_width, crop_height]


def _models_to_try() -> List[str]:
    """Build a unique model fallback list from configuration and defaults."""
    configured = [
        getattr(settings, "PRIMARY_VISION_MODEL", "gemma-4-26b-a4b-it"),
        getattr(settings, "FALLBACK_VISION_MODEL", "gemini-3.8-flash"),
    ]
    defaults = [
        "gemma-4-26b-a4b-it",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ]
    return list(dict.fromkeys(model for model in configured + defaults if model))


def _parse_ai_response(text: str) -> Dict[str, Any]:
    """Convert Gemma's JSON text into a dictionary."""
    if not text:
        return {}

    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    try:
        return json.loads(cleaned.strip())
    except (json.JSONDecodeError, TypeError):
        return {"raw": text}


async def call_gemma_vision(
    image_base64_clean: str,
    mime_type: str,
    targeted_context: str,
    gemma_api_key: str,
) -> Tuple[Dict[str, Any], str, str]:
    """Call the configured vision models until one returns usable text."""
    prompt = f"{GEMMA_PROMPT}\n\n--- OCR CONTEXT ---\n{targeted_context}\n"
    raw_response = ""
    error = ""

    async with httpx.AsyncClient(timeout=25.0) as client:
        for model in _models_to_try():
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent?key={gemma_api_key}"
            )
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": image_base64_clean,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.1,
                },
            }

            try:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    error = f"{model} status {response.status_code}: {response.text[:200]}"
                    continue

                data = response.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                raw_response = parts[0].get("text", "") if parts else ""
                if raw_response:
                    break
            except Exception as exc:
                error = str(exc)

    return _parse_ai_response(raw_response), raw_response, error


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
    """Save one AI/OCR scan audit record."""
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


def _missing_key_response(
    ocr_used: bool,
    validation: ValidationResult,
    regions: List[OCRRegion],
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

    return AIScanResponse(
        medicine_name=data["medicine_name"],
        strength=data["strength"],
        batch_number=data["batch_number"],
        manufacturing_date=data["manufacturing_date"],
        expiry_date=data["expiry_date"],
        quantity=data["pieces_per_strip"],
        source="tesseract",
        confidence=validation.overall_confidence,
        validation_status="uncertain",
        processing=processing,
        bounding_boxes=regions,
        success=False,
        extracted_data=data,
        needs_manual_verification=True,
        issues=validation.reasons,
        warning="AI Vision fallback key not configured. Please confirm fields manually.",
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
        success=False,
        confidence=0.0,
        validation_status="uncertain",
        processing=processing,
        needs_manual_verification=True,
        issues=["Could not decode uploaded image."],
        warning="Invalid image file uploaded.",
    )


async def scan_medicine_image(
    db: Session,
    pharmacy_id: str,
    image_base64: str,
    image_url: Optional[str] = None,
) -> AIScanResponse:
    """Run OCR first and use Gemma only when OCR validation needs help."""
    try:
        image, clean_base64, mime_type = decode_image_base64(image_base64)
    except Exception as exc:
        logger.error("Image decode error: %s", exc)
        return _corrupt_image_response(str(exc))

    # Gate 1: local OCR + validation.
    ocr_result = OCRService.run_ocr(image)
    regions = _ocr_regions(ocr_result)
    validation = ValidationService.validate_ocr_output(
        extracted_fields=ocr_result.get("extracted_fields", {}),
        field_confidences=ocr_result.get("field_confidences", {}),
        diagnostics=ocr_result.get("diagnostics", {}),
        overall_confidence=ocr_result.get("overall_confidence", 0.0),
    )

    # Trusted OCR needs no external AI call.
    if validation.status == "trusted":
        return _save_trusted_scan(db, pharmacy_id, image_url, ocr_result, validation, regions)

    key = settings.GEMMA_API_KEY
    if not key or key.startswith("PASTE") or "placeholder" in key:
        return _missing_key_response(ocr_result.get("success", False), validation, regions)

    return await _recover_with_gemma(
        db,
        pharmacy_id,
        image,
        clean_base64,
        mime_type,
        image_url,
        ocr_result,
        validation,
        regions,
        key,
    )


def _save_trusted_scan(
    db: Session,
    pharmacy_id: str,
    image_url: Optional[str],
    ocr_result: Dict[str, Any],
    validation: ValidationResult,
    regions: List[OCRRegion],
) -> AIScanResponse:
    """Save and return a fully trusted OCR result."""
    data = _build_data(validation.normalized_data)
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
        "source": "tesseract",
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
        medicine_name=data["medicine_name"],
        strength=data["strength"],
        batch_number=data["batch_number"],
        manufacturing_date=data["manufacturing_date"],
        expiry_date=data["expiry_date"],
        quantity=data["pieces_per_strip"],
        source="tesseract",
        confidence=validation.overall_confidence,
        validation_status="trusted",
        processing=processing,
        bounding_boxes=regions,
        success=True,
        extracted_data=data,
        needs_manual_verification=False,
        issues=[],
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
) -> AIScanResponse:
    """Crop uncertain areas, call Gemma, validate it, merge, and save."""
    fields = list(validation.uncertain_fields)
    crop, crop_used, _ = crop_uncertain_regions(
        image, ocr_result.get("bounding_boxes", []), validation.uncertain_fields
    )
    ai_base64 = image_to_base64(crop) if crop_used else clean_base64
    ai_mime = "image/jpeg" if crop_used else mime_type

    context = _build_gemma_context(validation, ocr_result.get("success", False), crop_used)
    ai_data, raw_response, ai_error = await call_gemma_vision(
        ai_base64, ai_mime, context, api_key
    )

    # Gate 2: never trust Gemma output before validation.
    clean_ai, ai_issues = ValidationService.validate_gemma_output(
        raw_ai_data=ai_data,
        uncertain_fields=validation.uncertain_fields,
    )

    merged = dict(validation.normalized_data)
    for field in [
        "medicine_name",
        "strength",
        "batch_number",
        "manufacturing_date",
        "expiry_date",
        "quantity",
    ]:
        value = clean_ai.get(field)
        if (field in validation.uncertain_fields or not merged.get(field)) and value is not None:
            merged[field] = value

    ai_confidence = float(
        ai_data.get("confidence_score", 90.0 if clean_ai.get("medicine_name") else 35.0)
    )
    recovered = (
        bool(merged.get("medicine_name"))
        and bool(merged.get("batch_number"))
        and bool(merged.get("expiry_date"))
        and ai_confidence >= 70.0
        and not ai_issues
    )
    status = "ai_validated" if recovered else "uncertain"
    confidence = round(
        max(validation.overall_confidence, ai_confidence) if recovered else ai_confidence, 1
    )

    data = _build_data(
        {
            **merged,
            "generic_name": clean_ai.get("generic_name"),
            "brand": clean_ai.get("brand"),
            "manufacturer": clean_ai.get("manufacturer"),
            "pieces_per_strip": merged.get("quantity") or clean_ai.get("pieces_per_strip"),
            "unit_of_measure": clean_ai.get("unit_of_measure"),
            "price_per_strip": clean_ai.get("price_per_strip"),
        },
        source="gemma",
    )

    issues = validation.reasons + ai_issues
    processing = _processing(
        ocr_confidence=validation.overall_confidence,
        validation="uncertain",
        ai_used=True,
        fields=fields,
        crop_used=crop_used,
        reasons=issues,
    )

    audit_data = {
        **data,
        "source": "gemma",
        "validation_status": status,
        "confidence": confidence,
        "processing": processing.model_dump(),
    }
    record = _save_scan(
        db,
        pharmacy_id,
        image_url,
        raw_response or ai_error or ocr_result.get("raw_text", ""),
        audit_data,
        confidence,
        status="completed" if raw_response else "failed",
        error_message=ai_error if not raw_response else None,
    )

    return AIScanResponse(
        medicine_name=data["medicine_name"],
        strength=data["strength"],
        batch_number=data["batch_number"],
        manufacturing_date=data["manufacturing_date"],
        expiry_date=data["expiry_date"],
        quantity=data["pieces_per_strip"],
        source="gemma",
        confidence=confidence,
        validation_status=status,
        processing=processing,
        bounding_boxes=regions,
        success=bool(raw_response) or bool(merged.get("medicine_name")),
        extracted_data=data,
        needs_manual_verification=not recovered,
        issues=issues,
        scan_id=record.id,
        warning=ai_error if not raw_response else None,
    )


def _build_gemma_context(
    validation: ValidationResult,
    ocr_success: bool,
    crop_used: bool,
) -> str:
    """Create the small, readable context sent alongside the image."""
    mode = "Focused subregion crop" if crop_used else "Full image"
    return (
        f"Targeted Recovery Mode: {mode}\n"
        f"Fields Requiring Recovery: {', '.join(validation.uncertain_fields)}\n"
        f"OCR Success: {ocr_success}\n"
        f"OCR Overall Confidence: {validation.overall_confidence}%\n"
        f"Trusted OCR Fields: {json.dumps(validation.trusted_fields)}\n"
        f"Uncertain Fields: {json.dumps(validation.uncertain_fields)}\n"
        f"OCR Failure Reasons: {json.dumps(validation.reasons)}"
    )
