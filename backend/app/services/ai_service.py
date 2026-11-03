import io
import json
import base64
import logging
import httpx
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.ai_scan import AIScan
from backend.app.schemas.ai import AIScanResponse, ProcessingMetadata, OCRRegion, BoundingBox
from backend.app.services.ocr_service import OCRService
from backend.app.services.validation_service import ValidationService, ValidationResult

logger = logging.getLogger("medguard.ai_service")

GEMMA_TARGETED_SYSTEM_PROMPT = """You are MedGuard AI's high-precision pharmaceutical vision assistant.
Analyze this medicine packaging photo to visually verify and recover medicine information.
Our first-stage Tesseract OCR identified certain fields, but some were flagged as uncertain, missing, or low confidence.

IMPORTANT INSTRUCTIONS:
1. Examine the packaging closely for Medicine Name, Active Composition, Strength, Batch Number, Manufacturing Date, and Expiry Date.
2. If text is blurry, truncated, or genuinely not visible on the packaging, DO NOT GUESS OR HALLUCINATE. Return null or "Unknown".
3. Return STRICT JSON ONLY without markdown wraps:
{
  "medicine_name": "Full medicine commercial name (e.g. Paracetamol, Augmentin 625 Duo)",
  "generic_name": "Active pharmaceutical ingredient (e.g. Paracetamol Tablets IP)",
  "brand": "Brand or marketer name",
  "strength": "e.g. 500 mg, 650 mg, 10 ml",
  "manufacturer": "Manufacturing pharmaceutical company name",
  "batch_number": "Batch or Lot number if visible, otherwise null",
  "manufacturing_date": "MM/YYYY or YYYY-MM if visible, otherwise null",
  "expiry_date": "MM/YYYY or YYYY-MM if visible, otherwise null",
  "pieces_per_strip": 10,
  "unit_of_measure": "tablet",
  "price_per_strip": 50.0,
  "confidence_score": 92.0,
  "issues": ["list any packaging readability issues or missing details"]
}
"""

def decode_image_base64(image_base64: str) -> Tuple[Image.Image, str, str]:
    mime_type = "image/jpeg"
    clean_base64 = image_base64.strip()
    if ";base64," in image_base64:
        parts = image_base64.split(";base64,")
        mime_type = parts[0].replace("data:", "").strip() or "image/jpeg"
        clean_base64 = parts[1].strip()

    missing_padding = len(clean_base64) % 4
    if missing_padding:
        clean_base64 += "=" * (4 - missing_padding)

    image_bytes = base64.b64decode(clean_base64)
    image = Image.open(io.BytesIO(image_bytes))
    return image, clean_base64, mime_type

async def call_gemma_vision(
    image_base64_clean: str,
    mime_type: str,
    targeted_context: str,
    gemma_api_key: str,
) -> Tuple[Dict[str, Any], str, str]:
    """
    Calls Gemma 4 Vision (or Gemini Flash fallback models) with targeted recovery context.
    """
    models = [
        "gemma-4-26b-a4b-it",
        "gemma-4-31b-it",
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
    ]

    extracted_content = ""
    error_msg = ""

    prompt_text = (
        f"{GEMMA_TARGETED_SYSTEM_PROMPT}\n\n"
        f"--- TARGETED OCR ANALYSIS CONTEXT ---\n"
        f"{targeted_context}\n"
        f"Please analyze the packaging image and provide recovered/verified structured fields."
    )

    async with httpx.AsyncClient(timeout=25.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemma_api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": prompt_text},
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
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            extracted_content = parts[0].get("text", "")
                    if extracted_content:
                        break
                else:
                    error_msg = f"{model} status {res.status_code}: {res.text[:200]}"
            except Exception as e:
                error_msg = str(e)

    parsed_data = {}
    if extracted_content:
        try:
            cleaned = extracted_content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed_data = json.loads(cleaned.strip())
        except Exception:
            parsed_data = {"raw": extracted_content}

    return parsed_data, extracted_content, error_msg

async def scan_medicine_image(
    db: Session,
    pharmacy_id: str,
    image_base64: str,
    image_url: Optional[str] = None,
) -> AIScanResponse:
    """
    Hybrid Medicine Image Processing Architecture:
    1. Medicine Image Ingestion & Preprocessing
    2. Tesseract OCR (text, bounding boxes, confidence)
    3. Multi-Factor Validation Layer:
       - TRUSTED PATH: OCR passes all validation rules -> return structured data (0 AI API calls).
       - UNCERTAIN PATH: OCR confidence low or missing fields -> route to Gemma 4 Vision for targeted recovery.
    4. Intelligent Merge (OCR trusted fields + Gemma recovered fields).
    5. Standardized response with transparent explainability metadata.
    """
    # 1. Decode Image
    try:
        image, clean_base64, mime_type = decode_image_base64(image_base64)
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        return AIScanResponse(
            success=False,
            confidence=0.0,
            validation_status="uncertain",
            processing=ProcessingMetadata(
                ocr_used=False,
                ocr_confidence=0.0,
                validation="uncertain",
                ai_fallback_used=False,
                reason=[f"Invalid or corrupted image format: {str(e)}"],
            ),
            needs_manual_verification=True,
            issues=["Could not decode uploaded image."],
            warning="Invalid image file uploaded.",
        )

    # 2. Stage 1: Tesseract OCR
    ocr_result = OCRService.run_ocr(image)
    ocr_used = ocr_result.get("success", False)
    bounding_boxes_raw = ocr_result.get("bounding_boxes", [])
    extracted_fields = ocr_result.get("extracted_fields", {})
    field_confidences = ocr_result.get("field_confidences", {})
    overall_ocr_conf = ocr_result.get("overall_confidence", 0.0)
    diagnostics = ocr_result.get("diagnostics", {})

    # Convert bounding boxes to schema objects
    ocr_regions = [
        OCRRegion(
            text=b["text"],
            confidence=b["confidence"],
            box=BoundingBox(**b["box"]),
        )
        for b in bounding_boxes_raw
    ]

    # 3. Stage 2: Validation Layer
    validation = ValidationService.validate_ocr_output(
        extracted_fields=extracted_fields,
        field_confidences=field_confidences,
        diagnostics=diagnostics,
        overall_confidence=overall_ocr_conf,
    )

    # 4. Stage 3: Decision Gate - TRUSTED vs UNCERTAIN
    if validation.status == "trusted":
        # ---------------------------------------------------------
        # TRUSTED PATH: OCR passed validation completely!
        # Do NOT call Gemma Vision API. Save cost and minimize latency.
        # ---------------------------------------------------------
        norm_data = validation.normalized_data
        medicine_name = norm_data.get("medicine_name") or ""
        strength = norm_data.get("strength") or ""
        batch_number = norm_data.get("batch_number") or ""
        mfg_date = norm_data.get("manufacturing_date") or ""
        exp_date = norm_data.get("expiry_date") or ""
        quantity = norm_data.get("quantity") or 10

        extracted_data_payload = {
            "medicine_name": medicine_name,
            "generic_name": "",
            "brand": "",
            "strength": strength,
            "manufacturer": "",
            "batch_number": batch_number,
            "manufacturing_date": mfg_date,
            "expiry_date": exp_date,
            "pieces_per_strip": quantity,
            "unit_of_measure": "tablet",
            "price_per_strip": 50.0,
        }

        processing_meta = ProcessingMetadata(
            ocr_used=True,
            ocr_confidence=validation.overall_confidence,
            validation="trusted",
            ai_fallback_used=False,
            reason=[],
        )

        # Record scan in database
        scan_record = AIScan(
            pharmacy_id=pharmacy_id,
            image_url=image_url or "base64_upload",
            raw_response=ocr_result.get("raw_text", ""),
            extracted_data={
                **extracted_data_payload,
                "source": "tesseract",
                "validation_status": "trusted",
                "confidence": validation.overall_confidence,
                "processing": processing_meta.model_dump(),
            },
            confidence_score=validation.overall_confidence,
            status="completed",
        )
        db.add(scan_record)
        db.commit()
        db.refresh(scan_record)

        return AIScanResponse(
            medicine_name=medicine_name,
            strength=strength,
            batch_number=batch_number,
            manufacturing_date=mfg_date,
            expiry_date=exp_date,
            quantity=quantity,
            source="tesseract",
            confidence=validation.overall_confidence,
            validation_status="trusted",
            processing=processing_meta,
            bounding_boxes=ocr_regions,
            success=True,
            extracted_data=extracted_data_payload,
            needs_manual_verification=False,
            issues=[],
            scan_id=scan_record.id,
        )

    # -------------------------------------------------------------
    # UNCERTAIN PATH: OCR confidence was low, format invalid, or fields missing
    # Route image to Gemma 4 Vision for targeted visual recovery
    # -------------------------------------------------------------
    gemma_api_key = settings.GEMMA_API_KEY
    if not gemma_api_key or gemma_api_key.startswith("PASTE") or "placeholder" in gemma_api_key:
        # Graceful handling if AI key is missing in development
        norm_data = validation.normalized_data
        fallback_data = {
            "medicine_name": norm_data.get("medicine_name") or "",
            "generic_name": "",
            "brand": "",
            "strength": norm_data.get("strength") or "",
            "manufacturer": "",
            "batch_number": norm_data.get("batch_number") or "",
            "manufacturing_date": norm_data.get("manufacturing_date") or "",
            "expiry_date": norm_data.get("expiry_date") or "",
            "pieces_per_strip": norm_data.get("quantity") or 10,
            "unit_of_measure": "tablet",
            "price_per_strip": 50.0,
        }
        processing_meta = ProcessingMetadata(
            ocr_used=ocr_used,
            ocr_confidence=validation.overall_confidence,
            validation="uncertain",
            ai_fallback_used=False,
            reason=validation.reasons + ["Gemma Vision API key not configured for fallback"],
        )
        return AIScanResponse(
            medicine_name=fallback_data["medicine_name"],
            strength=fallback_data["strength"],
            batch_number=fallback_data["batch_number"],
            manufacturing_date=fallback_data["manufacturing_date"],
            expiry_date=fallback_data["expiry_date"],
            quantity=fallback_data["pieces_per_strip"],
            source="tesseract",
            confidence=validation.overall_confidence,
            validation_status="uncertain",
            processing=processing_meta,
            bounding_boxes=ocr_regions,
            success=False,
            extracted_data=fallback_data,
            needs_manual_verification=True,
            issues=validation.reasons,
            warning="AI Vision fallback key not configured. Please confirm fields manually.",
        )

    # Build targeted prompt context informing Gemma what OCR found vs what is missing
    targeted_context = (
        f"OCR Success: {ocr_used}\n"
        f"OCR Overall Confidence: {validation.overall_confidence}%\n"
        f"Trusted Fields Already Extracted by OCR: {json.dumps(validation.trusted_fields)}\n"
        f"Uncertain or Missing Fields Requiring Vision Fallback: {json.dumps(validation.uncertain_fields)}\n"
        f"OCR Diagnostic Failure Reasons: {json.dumps(validation.reasons)}"
    )

    parsed_ai_data, raw_ai_response, ai_error = await call_gemma_vision(
        image_base64_clean=clean_base64,
        mime_type=mime_type,
        targeted_context=targeted_context,
        gemma_api_key=gemma_api_key,
    )

    # Intelligent Merge: Combine OCR trusted fields + Gemma recovered fields
    merged_data: Dict[str, Any] = dict(validation.normalized_data)
    ai_confidence = float(parsed_ai_data.get("confidence_score", 90.0 if parsed_ai_data.get("medicine_name") else 35.0))

    # Overwrite uncertain fields with Gemma's recovered fields if provided and non-empty
    for field in ["medicine_name", "strength", "batch_number", "manufacturing_date", "expiry_date", "quantity"]:
        val = parsed_ai_data.get(field)
        if field in validation.uncertain_fields or not merged_data.get(field):
            if val is not None and str(val).strip() and str(val).lower() not in ["null", "none", "unknown"]:
                merged_data[field] = val

    # Normalize dates if Gemma provided them in another format
    if merged_data.get("expiry_date"):
        _, norm_exp = ValidationService._parse_and_normalize_date(str(merged_data["expiry_date"]))
        if norm_exp:
            merged_data["expiry_date"] = norm_exp

    if merged_data.get("manufacturing_date"):
        _, norm_mfg = ValidationService._parse_and_normalize_date(str(merged_data["manufacturing_date"]))
        if norm_mfg:
            merged_data["manufacturing_date"] = norm_mfg

    # Check if critical fields are resolved
    has_med = bool(merged_data.get("medicine_name"))
    has_batch = bool(merged_data.get("batch_number"))
    has_exp = bool(merged_data.get("expiry_date"))

    is_recovered = has_med and has_batch and has_exp and ai_confidence >= 70.0
    final_validation_status = "ai_validated" if is_recovered else "uncertain"
    final_confidence = round(max(validation.overall_confidence, ai_confidence) if is_recovered else ai_confidence, 1)

    # Compile frontend payload
    extracted_data_payload = {
        "medicine_name": merged_data.get("medicine_name") or "",
        "generic_name": parsed_ai_data.get("generic_name") or "",
        "brand": parsed_ai_data.get("brand") or "",
        "strength": merged_data.get("strength") or "",
        "manufacturer": parsed_ai_data.get("manufacturer") or "",
        "batch_number": merged_data.get("batch_number") or "",
        "manufacturing_date": merged_data.get("manufacturing_date") or "",
        "expiry_date": merged_data.get("expiry_date") or "",
        "pieces_per_strip": int(merged_data.get("quantity") or parsed_ai_data.get("pieces_per_strip") or 10),
        "unit_of_measure": parsed_ai_data.get("unit_of_measure", "tablet"),
        "price_per_strip": float(parsed_ai_data.get("price_per_strip", 50.0) or 50.0),
    }

    issues_list = list(validation.reasons)
    if parsed_ai_data.get("issues"):
        for issue in parsed_ai_data["issues"]:
            if issue not in issues_list:
                issues_list.append(issue)

    processing_meta = ProcessingMetadata(
        ocr_used=ocr_used,
        ocr_confidence=validation.overall_confidence,
        validation="uncertain",
        ai_fallback_used=True,
        reason=validation.reasons,
    )

    # Save to database
    scan_record = AIScan(
        pharmacy_id=pharmacy_id,
        image_url=image_url or "base64_upload",
        raw_response=raw_ai_response or ai_error or ocr_result.get("raw_text", ""),
        extracted_data={
            **extracted_data_payload,
            "source": "gemma",
            "validation_status": final_validation_status,
            "confidence": final_confidence,
            "processing": processing_meta.model_dump(),
        },
        confidence_score=final_confidence,
        status="completed" if bool(raw_ai_response) else "failed",
        error_message=ai_error if not raw_ai_response else None,
    )
    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)

    return AIScanResponse(
        medicine_name=extracted_data_payload["medicine_name"],
        strength=extracted_data_payload["strength"],
        batch_number=extracted_data_payload["batch_number"],
        manufacturing_date=extracted_data_payload["manufacturing_date"],
        expiry_date=extracted_data_payload["expiry_date"],
        quantity=extracted_data_payload["pieces_per_strip"],
        source="gemma",
        confidence=final_confidence,
        validation_status=final_validation_status,
        processing=processing_meta,
        bounding_boxes=ocr_regions,
        success=bool(raw_ai_response) or bool(merged_data.get("medicine_name")),
        extracted_data=extracted_data_payload,
        needs_manual_verification=not is_recovered,
        issues=issues_list,
        scan_id=scan_record.id,
        warning=ai_error if not raw_ai_response else None,
    )
