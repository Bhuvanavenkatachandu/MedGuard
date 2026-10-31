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
    near_expiry_threshold_days: int = 30
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
