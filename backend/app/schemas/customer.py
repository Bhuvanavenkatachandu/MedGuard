from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class CustomerCreateRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
