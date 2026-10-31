from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class BatchCreateRequest(BaseModel):
    medicine_id: str
    supplier_id: Optional[str] = None
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    mrp_per_strip: Optional[float] = 0.0

class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    medicine_id: str
    supplier_id: Optional[str] = None
    batch_number: str
    manufacturing_date: Optional[date] = None
    expiry_date: date
    mrp_per_strip: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
