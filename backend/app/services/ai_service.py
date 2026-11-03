"""MedGuard AI - AI Recognition Service Bridge (Backward Compatibility)."""

from backend.shared.config import settings
from backend.features.ai_recognition.providers.ocr_provider import OCRService
from backend.features.ai_recognition.service import (
    decode_image_base64,
    image_to_base64,
    crop_uncertain_regions,
    scan_medicine_image,
    call_gemma_vision,
    _save_scan,
    _processing,
    _ocr_regions,
    _build_data,
    _missing_key_response,
    _corrupt_image_response,
    _save_trusted_scan,
    _recover_with_gemma,
    _build_gemma_context,
    GEMMA_PROMPT,
    GEMMA_TARGETED_SYSTEM_PROMPT,
    FIELD_KEYWORDS,
)

__all__ = [
    "settings",
    "OCRService",
    "call_gemma_vision",
    "decode_image_base64",
    "image_to_base64",
    "crop_uncertain_regions",
    "scan_medicine_image",
    "_save_scan",
    "_processing",
    "_ocr_regions",
    "_build_data",
    "_missing_key_response",
    "_corrupt_image_response",
    "_save_trusted_scan",
    "_recover_with_gemma",
    "_build_gemma_context",
    "GEMMA_PROMPT",
    "GEMMA_TARGETED_SYSTEM_PROMPT",
    "FIELD_KEYWORDS",
]
