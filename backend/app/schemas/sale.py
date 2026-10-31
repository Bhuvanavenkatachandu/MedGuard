from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.customer import CustomerCreateRequest, CustomerOut

class SaleItemRequest(BaseModel):
    medicine_id: str
    batch_id: str
    unit_type: str  # 'strip' or 'piece'
    quantity_units: int
    pieces_count: int
    unit_price: float
    total_price: float

class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sale_id: str
    medicine_id: str
    batch_id: str
    unit_type: str
    quantity_units: int
    pieces_count: int
    unit_price: float
    total_price: float
    created_at: Optional[datetime] = None
    medicine_name: Optional[str] = None
    batch_number: Optional[str] = None

class SaleCheckoutRequest(BaseModel):
    customer_id: Optional[str] = None
    customer_data: Optional[CustomerCreateRequest] = None
    items: List[SaleItemRequest]
    subtotal: float
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float
    payment_method: str = "Cash"
    notes: Optional[str] = None

class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    customer_id: Optional[str] = None
    pharmacist_id: Optional[str] = None
    sale_number: str
    subtotal: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    payment_method: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[SaleItemOut] = []
    customer: Optional[CustomerOut] = None

class SaleCheckoutResponse(BaseModel):
    success: bool
    sale_id: str
    sale_number: str
    invoice_id: str
    invoice_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    total_amount: float
    items: List[dict] = []
