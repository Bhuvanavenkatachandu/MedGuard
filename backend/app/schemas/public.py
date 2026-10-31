from typing import Optional
from pydantic import BaseModel

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
