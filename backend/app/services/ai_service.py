import json
import re
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.ai_scan import AIScan
from backend.app.schemas.ai import AIScanResponse

SYSTEM_PROMPT = """You are MedGuard AI's high-precision medical packaging OCR and pharmacist assistant.
Analyze this image of a medicine pack, strip, bottle, or packaging box.
Extract ONLY the following fields in strict JSON format:
{
  "is_medicine": true,
  "confidence_score": 90,
  "medicine_name": "Full medicine commercial name (e.g. Dolo 650, Augmentin 625 Duo)",
  "generic_name": "Active pharmaceutical ingredient (API) composition (e.g. Paracetamol Tablets IP)",
  "brand": "Brand or marketer name",
  "strength": "e.g. 500mg, 650mg, 10ml, etc.",
  "manufacturer": "Manufacturing pharmaceutical company name",
  "batch_number": "Batch or Lot number if visible, otherwise null",
  "manufacturing_date": "YYYY-MM-DD or YYYY-MM if visible, otherwise null",
  "expiry_date": "YYYY-MM-DD or YYYY-MM if visible, otherwise null",
  "pieces_per_strip": 10,
  "unit_of_measure": "tablet",
  "price_per_strip": 50.0,
  "issues": ["list of issues: blurry image, missing batch, missing expiry, etc."],
  "needs_manual_verification": false
}

Guidelines:
1. Do NOT classify or detect packaging damage. Focus strictly on medicine identification, batch number, dates, and dosage.
2. If the image is blurry, dark, unreadable, or not a medicine, set confidence_score < 40 and needs_manual_verification = true.
3. If batch_number or expiry_date are missing or unclear, list them in issues and set needs_manual_verification = true.
4. Output STRICT JSON ONLY. Do not wrap in markdown quotes if possible.
"""

async def scan_medicine_image(
    db: Session,
    pharmacy_id: str,
    image_base64: str,
    image_url: Optional[str] = None,
) -> AIScanResponse:
    gemma_api_key = settings.GEMMA_API_KEY
    if not gemma_api_key or gemma_api_key.startswith("PASTE") or "placeholder" in gemma_api_key:
        return AIScanResponse(
            success=False,
            confidence=0.0,
            extracted_data={
                "medicine_name": "",
                "generic_name": "",
                "brand": "",
                "strength": "",
                "manufacturer": "",
                "batch_number": "",
                "manufacturing_date": "",
                "expiry_date": "",
                "pieces_per_strip": 10,
                "unit_of_measure": "tablet",
                "price_per_strip": 50.0,
            },
            needs_manual_verification=True,
            issues=["GEMMA_API_KEY not configured in backend environment."],
            warning="AI Key not configured. Please enter medicine details manually.",
        )

    # Clean Base64 and extract mime type
    mime_type = "image/jpeg"
    clean_base64 = image_base64.strip()
    if ";base64," in image_base64:
        parts = image_base64.split(";base64,")
        mime_type = parts[0].replace("data:", "").strip() or "image/jpeg"
        clean_base64 = parts[1].strip()

    # Ensure valid base64 padding
    missing_padding = len(clean_base64) % 4
    if missing_padding:
        clean_base64 += "=" * (4 - missing_padding)

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

    async with httpx.AsyncClient(timeout=25.0) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemma_api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": SYSTEM_PROMPT + "\nExtract medicine details, batch, and expiry from this packaging photo."},
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": clean_base64,
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
                    extracted_content = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if extracted_content:
                        break
                else:
                    error_msg = f"{model} status {res.status_code}: {res.text[:200]}"
            except Exception as e:
                error_msg = str(e)

    parsed_data = {}
    if extracted_content:
        try:
            # Clean possible markdown wrap
            cleaned = extracted_content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed_data = json.loads(cleaned.strip())
        except Exception:
            # Fallback regex extraction
            parsed_data = {"raw": extracted_content}

    confidence = float(parsed_data.get("confidence_score", 85.0 if parsed_data.get("medicine_name") else 30.0))
    needs_manual = parsed_data.get("needs_manual_verification", confidence < 70)
    issues = parsed_data.get("issues", [])

    # Format extracted data
    extracted_data = {
        "medicine_name": parsed_data.get("medicine_name", ""),
        "generic_name": parsed_data.get("generic_name", ""),
        "brand": parsed_data.get("brand", ""),
        "strength": parsed_data.get("strength", ""),
        "manufacturer": parsed_data.get("manufacturer", ""),
        "batch_number": parsed_data.get("batch_number", "") or "",
        "manufacturing_date": parsed_data.get("manufacturing_date", "") or "",
        "expiry_date": parsed_data.get("expiry_date", "") or "",
        "pieces_per_strip": int(parsed_data.get("pieces_per_strip", 10) or 10),
        "unit_of_measure": parsed_data.get("unit_of_measure", "tablet"),
        "price_per_strip": float(parsed_data.get("price_per_strip", 50.0) or 50.0),
    }

    # Record scan in database
    scan_record = AIScan(
        pharmacy_id=pharmacy_id,
        image_url=image_url or "base64_upload",
        raw_response=extracted_content or error_msg,
        extracted_data=extracted_data,
        confidence_score=confidence,
        status="completed" if extracted_content else "failed",
        error_message=error_msg if not extracted_content else None,
    )
    db.add(scan_record)
    db.commit()
    db.refresh(scan_record)

    return AIScanResponse(
        success=bool(extracted_content),
        confidence=confidence,
        extracted_data=extracted_data,
        needs_manual_verification=needs_manual,
        issues=issues if isinstance(issues, list) else [str(issues)],
        scan_id=scan_record.id,
        warning=error_msg if not extracted_content else None,
    )
