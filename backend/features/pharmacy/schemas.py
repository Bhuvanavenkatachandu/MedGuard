"""MedGuard AI - Pharmacy & Public Search Schemas (Pharmacy Feature)"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PharmacyCreateRequest(BaseModel):
    name: str
    ownerName: Optional[str] = None
    owner_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: float
    longitude: float
    licenseNumber: Optional[str] = None
    license_number: Optional[str] = None
    near_expiry_threshold_days: Optional[int] = 30


class PharmacyUpdateRequest(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    license_number: Optional[str] = None
    near_expiry_threshold_days: Optional[int] = None


class PharmacyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_user_id: str
    name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    address: str
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: float
    longitude: float
    license_number: Optional[str] = None
    near_expiry_threshold_days: int
    created_at: datetime
    updated_at: datetime


class PublicMedicineSearchItem(BaseModel):
    medicine_id: str
    medicine_name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    category: Optional[str] = "General"
    pharmacy_id: str
    pharmacy_name: str
    pharmacy_address: str
    pharmacy_phone: str
    pharmacy_lat: float
    pharmacy_lng: float
    distance_km: float
    available_pieces: int
    pieces_per_strip: int
    available_strips: int
    loose_pieces: int
    price_per_piece: float
    price_per_strip: float
    directions_url: str
