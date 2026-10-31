from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.medicine import MedicineOut
from backend.app.schemas.batch import BatchOut

class AddStockRequest(BaseModel):
    medicine_name: str
    generic_name: Optional[str] = None
    brand: Optional[str] = None
    strength: Optional[str] = None
    category: Optional[str] = "General"
    manufacturer: Optional[str] = None
    batch_number: str
    supplier_id: Optional[str] = None
    manufacturing_date: Optional[str] = None
    expiry_date: str
    pieces_per_strip: int = 10
    quantity_strips: int = 0
    price_per_strip: float = 0.0
    price_per_piece: Optional[float] = None
    min_stock_pieces: int = 20

class StockAdjustRequest(BaseModel):
    inventoryId: Optional[str] = None
    newTotalPieces: int
    reason: Optional[str] = "Stock count correction"

class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    medicine_id: str
    batch_id: str
    pieces_per_strip: int = 10
    total_pieces: int = 0
    available_strips: int = 0
    loose_pieces: int = 0
    price_per_piece: float = 0.0
    price_per_strip: float = 0.0
    min_stock_pieces: int = 20
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    medicine: Optional[MedicineOut] = None
    batch: Optional[BatchOut] = None
