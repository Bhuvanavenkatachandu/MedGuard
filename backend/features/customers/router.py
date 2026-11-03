"""MedGuard AI - Customer Router (Customers Feature)"""

from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.customers.schemas import CustomerCreateRequest, CustomerOut
from backend.features.customers.service import CustomerService
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=List[CustomerOut])
def list_customers(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    customers = CustomerService.list_customers(db, pharmacy.id)
    return [CustomerOut.model_validate(c) for c in customers]


@router.get("/by-phone/{phone}", response_model=Optional[CustomerOut])
def get_customer_by_phone(
    phone: str,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    customer = CustomerService.get_by_phone(db, pharmacy.id, phone)
    if not customer:
        return None
    return CustomerOut.model_validate(customer)


@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    req: CustomerCreateRequest,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    customer = CustomerService.create_or_update_customer(db, pharmacy.id, req)
    return CustomerOut.model_validate(customer)
