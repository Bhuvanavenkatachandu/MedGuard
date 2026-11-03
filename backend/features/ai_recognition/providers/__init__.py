"""MedGuard AI - AI Recognition Providers"""

from backend.features.ai_recognition.providers.ocr_provider import OCRService, OCRProvider
from backend.features.ai_recognition.providers.gemma_provider import GemmaVisionProvider

__all__ = [
    "OCRService",
    "OCRProvider",
    "GemmaVisionProvider",
]
