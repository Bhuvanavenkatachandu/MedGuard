"""MedGuard AI - Supplier Router (Medicines Feature)"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.medicines.schemas import SupplierCreateRequest, SupplierOut
from backend.features.medicines.suppliers_service import SupplierService
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


@router.get("", response_model=List[SupplierOut])
def list_suppliers(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all suppliers configured for the authenticated pharmacy."""
    suppliers = SupplierService.list_suppliers(db, pharmacy.id)
    return [SupplierOut.model_validate(s) for s in suppliers]


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    req: SupplierCreateRequest,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Register a new supplier for the pharmacy."""
    supp = SupplierService.create_supplier(db, pharmacy.id, req)
    return SupplierOut.model_validate(supp)
