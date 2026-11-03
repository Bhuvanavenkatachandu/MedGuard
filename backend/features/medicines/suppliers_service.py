"""MedGuard AI - Supplier Service (Medicines Feature)"""

from typing import List
from sqlalchemy.orm import Session
from backend.features.medicines.models import Supplier
from backend.features.medicines.schemas import SupplierCreateRequest


class SupplierService:
    @staticmethod
    def list_suppliers(db: Session, pharmacy_id: str) -> List[Supplier]:
        return db.query(Supplier).filter(Supplier.pharmacy_id == pharmacy_id).order_by(Supplier.name.asc()).all()

    @staticmethod
    def create_supplier(db: Session, pharmacy_id: str, req: SupplierCreateRequest) -> Supplier:
        supp = Supplier(
            pharmacy_id=pharmacy_id,
            name=req.name.strip(),
            contact_person=req.contact_person.strip() if req.contact_person else None,
            phone=req.phone.strip() if req.phone else None,
            email=req.email.strip() if req.email else None,
            address=req.address.strip() if req.address else None,
            gst_number=req.gst_number.strip() if req.gst_number else None,
        )
        db.add(supp)
        db.commit()
        db.refresh(supp)
        return supp
