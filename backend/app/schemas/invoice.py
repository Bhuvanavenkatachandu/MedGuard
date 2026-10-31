from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    sale_id: str
    invoice_number: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    total_amount: float
    pdf_url: Optional[str] = None
    status: str = "generated"
    created_at: Optional[datetime] = None
