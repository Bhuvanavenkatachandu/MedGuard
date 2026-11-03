"""MedGuard AI - Customer Service (Customers Feature)"""

from typing import List, Optional
from sqlalchemy.orm import Session
from backend.features.customers.models import Customer
from backend.features.customers.schemas import CustomerCreateRequest


class CustomerService:
    @staticmethod
    def list_customers(db: Session, pharmacy_id: str) -> List[Customer]:
        return db.query(Customer).filter(Customer.pharmacy_id == pharmacy_id).order_by(Customer.created_at.desc()).all()

    @staticmethod
    def get_by_phone(db: Session, pharmacy_id: str, phone: str) -> Optional[Customer]:
        cleaned = phone.replace("+91", "").replace(" ", "").replace("-", "")
        return db.query(Customer).filter(
            Customer.pharmacy_id == pharmacy_id,
            Customer.phone.like(f"%{cleaned}%")
        ).first()

    @staticmethod
    def create_or_update_customer(db: Session, pharmacy_id: str, req: CustomerCreateRequest) -> Customer:
        phone_clean = req.phone.strip()
        existing = db.query(Customer).filter(
            Customer.pharmacy_id == pharmacy_id,
            Customer.phone == phone_clean
        ).first()

        if existing:
            existing.name = req.name.strip()
            if req.email:
                existing.email = req.email.strip()
            if req.address:
                existing.address = req.address.strip()
            db.commit()
            db.refresh(existing)
            return existing

        new_cust = Customer(
            pharmacy_id=pharmacy_id,
            name=req.name.strip(),
            phone=phone_clean,
            email=req.email.strip() if req.email else None,
            address=req.address.strip() if req.address else None,
        )
        db.add(new_cust)
        db.commit()
        db.refresh(new_cust)
        return new_cust
