"""MedGuard AI - Medicine & Supplier Schemas (Medicines Feature)"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MedicineCreateRequest(BaseModel):
    name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    category: Optional[str] = "General"
    manufacturer: Optional[str] = None
    pieces_per_strip: Optional[int] = 10
    unit_of_measure: Optional[str] = "tablet"


class MedicineUpdateRequest(BaseModel):
    name: Optional[str] = None
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None
    pieces_per_strip: Optional[int] = None
    unit_of_measure: Optional[str] = None


class MedicineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    category: Optional[str] = "General"
    manufacturer: Optional[str] = None
    pieces_per_strip: int = 10
    unit_of_measure: str = "tablet"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SupplierCreateRequest(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
