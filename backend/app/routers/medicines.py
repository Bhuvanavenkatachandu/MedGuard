"""
MedGuard AI - Medicine Endpoints Router
========================================
Exposes REST endpoints for managing the medicine catalog.
Delegates all database and validation logic to MedicineService.
"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.medicine import MedicineCreateRequest, MedicineUpdateRequest, MedicineOut
from backend.app.dependencies import get_current_pharmacy
from backend.app.services.medicine_service import MedicineService

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


@router.get("", response_model=List[MedicineOut])
def list_medicines(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all cataloged medicines for the authenticated pharmacy."""
    medicines = MedicineService.list_medicines(db, pharmacy.id)
    return [MedicineOut.model_validate(m) for m in medicines]


@router.get("/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Fetch details for a single medicine by its unique ID."""
    med = MedicineService.get_medicine_by_id(db, medicine_id, pharmacy.id)
    return MedicineOut.model_validate(med)


@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(
    req: MedicineCreateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Register a new medicine entry in the pharmacy catalog."""
    med = MedicineService.create_medicine(db, pharmacy.id, req)
    return MedicineOut.model_validate(med)


@router.put("/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: str,
    req: MedicineUpdateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Update details for an existing cataloged medicine."""
    med = MedicineService.update_medicine(db, medicine_id, pharmacy.id, req)
    return MedicineOut.model_validate(med)


@router.delete("/{medicine_id}")
def delete_medicine(
    medicine_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Delete a medicine from the pharmacy catalog."""
    med = MedicineService.delete_medicine(db, medicine_id, pharmacy.id)
    return {"message": f"Medicine '{med.name}' deleted successfully", "success": True}
