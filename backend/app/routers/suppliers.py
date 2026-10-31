from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.supplier import Supplier
from backend.app.schemas.supplier import SupplierCreateRequest, SupplierOut
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierOut])
def list_suppliers(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    suppliers = db.query(Supplier).filter(Supplier.pharmacy_id == pharmacy.id).order_by(Supplier.name.asc()).all()
    return [SupplierOut.model_validate(s) for s in suppliers]

@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    req: SupplierCreateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    supp = Supplier(
        pharmacy_id=pharmacy.id,
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
    return SupplierOut.model_validate(supp)
