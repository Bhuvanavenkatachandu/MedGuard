"""MedGuard AI - AI Recognition Schemas (AI Recognition Feature)"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AIScanRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    pharmacy_id: Optional[str] = None


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class OCRRegion(BaseModel):
    text: str
    confidence: float
    box: BoundingBox


class ProcessingMetadata(BaseModel):
    ocr_used: bool = True
    ocr_confidence: float = 0.0
    validation: str = "uncertain"
    ai_fallback_used: bool = False
    ai_fields_requested: List[str] = Field(default_factory=list)
    targeted_crop_used: bool = False
    reason: List[str] = Field(default_factory=list)


class ExtractedMedicineData(BaseModel):
    medicine_name: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: Optional[int] = None
    pieces_per_strip: Optional[int] = None
    unit_of_measure: Optional[str] = "tablet"
    price_per_strip: Optional[float] = None


class AIScanResponse(BaseModel):
    medicine_name: Optional[str] = None
    strength: Optional[str] = None
    batch_number: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    quantity: Optional[int] = None
    source: str = "tesseract"
    confidence: float = 0.0
    validation_status: str = "trusted"
    processing: ProcessingMetadata
    bounding_boxes: List[OCRRegion] = Field(default_factory=list)

    success: bool = True
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    needs_manual_verification: bool = False
    issues: List[str] = Field(default_factory=list)
    scan_id: Optional[str] = None
    warning: Optional[str] = None
