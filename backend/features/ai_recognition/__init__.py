"""MedGuard AI - AI Recognition Feature Package"""

from backend.features.ai_recognition.models import AIScan
from backend.features.ai_recognition.router import router
from backend.features.ai_recognition.service import scan_medicine_image
from backend.features.ai_recognition.providers.ocr_provider import OCRService, OCRProvider
from backend.features.ai_recognition.providers.gemma_provider import GemmaVisionProvider
from backend.features.ai_recognition.validation import ValidationService, ValidationResult
from backend.features.ai_recognition.prompts import GEMMA_PROMPT, GEMMA_TARGETED_SYSTEM_PROMPT
from backend.features.ai_recognition.schemas import (
    AIScanRequest,
    AIScanResponse,
    BoundingBox,
    OCRRegion,
    ProcessingMetadata,
    ExtractedMedicineData,
)

__all__ = [
    "AIScan",
    "router",
    "scan_medicine_image",
    "OCRService",
    "OCRProvider",
    "GemmaVisionProvider",
    "ValidationService",
    "ValidationResult",
    "GEMMA_PROMPT",
    "GEMMA_TARGETED_SYSTEM_PROMPT",
    "AIScanRequest",
    "AIScanResponse",
    "BoundingBox",
    "OCRRegion",
    "ProcessingMetadata",
    "ExtractedMedicineData",
]
