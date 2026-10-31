from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.customer import Customer
from backend.app.schemas.customer import CustomerCreateRequest, CustomerOut
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerOut])
def list_customers(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    customers = db.query(Customer).filter(Customer.pharmacy_id == pharmacy.id).order_by(Customer.created_at.desc()).all()
    return [CustomerOut.model_validate(c) for c in customers]

@router.get("/by-phone/{phone}", response_model=Optional[CustomerOut])
def get_customer_by_phone(
    phone: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    cleaned = phone.replace("+91", "").replace(" ", "").replace("-", "")
    customer = db.query(Customer).filter(
        Customer.pharmacy_id == pharmacy.id,
        Customer.phone.like(f"%{cleaned}%")
    ).first()
    if not customer:
        return None
    return CustomerOut.model_validate(customer)

@router.post("", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    req: CustomerCreateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    phone_clean = req.phone.strip()
    existing = db.query(Customer).filter(
        Customer.pharmacy_id == pharmacy.id,
        Customer.phone == phone_clean
    ).first()
    if existing:
        existing.name = req.name.strip()
        if req.email: existing.email = req.email.strip()
        if req.address: existing.address = req.address.strip()
        db.commit()
        db.refresh(existing)
        return CustomerOut.model_validate(existing)

    cust = Customer(
        pharmacy_id=pharmacy.id,
        name=req.name.strip(),
        phone=phone_clean,
        email=req.email.strip() if req.email else None,
        address=req.address.strip() if req.address else None,
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return CustomerOut.model_validate(cust)
