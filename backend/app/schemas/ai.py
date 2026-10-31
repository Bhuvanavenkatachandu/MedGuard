from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class AIScanRequest(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    pharmacy_id: Optional[str] = None

class ExtractedMedicineData(BaseModel):
    medicine_name: str = ""
    generic_name: str = ""
    brand: str = ""
    strength: str = ""
    manufacturer: str = ""
    batch_number: str = ""
    manufacturing_date: str = ""
    expiry_date: str = ""
    pieces_per_strip: int = 10
    unit_of_measure: str = "tablet"
    price_per_strip: Optional[float] = 50.0

class AIScanResponse(BaseModel):
    success: bool
    confidence: float
    extracted_data: Dict[str, Any]
    needs_manual_verification: bool
    issues: List[str] = []
    scan_id: Optional[str] = None
    warning: Optional[str] = None
