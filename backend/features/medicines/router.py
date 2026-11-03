"""MedGuard AI - Medicine Router (Medicines Feature)"""

from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.medicines.schemas import MedicineCreateRequest, MedicineUpdateRequest, MedicineOut
from backend.features.medicines.service import MedicineService
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])


@router.get("", response_model=List[MedicineOut])
def list_medicines(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all cataloged medicines for the authenticated pharmacy."""
    medicines = MedicineService.list_medicines(db, pharmacy.id)
    return [MedicineOut.model_validate(m) for m in medicines]


@router.get("/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: str,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Fetch details for a single medicine by its unique ID."""
    med = MedicineService.get_medicine_by_id(db, medicine_id, pharmacy.id)
    return MedicineOut.model_validate(med)


@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(
    req: MedicineCreateRequest,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Register a new medicine entry in the pharmacy catalog."""
    med = MedicineService.create_medicine(db, pharmacy.id, req)
    return MedicineOut.model_validate(med)


@router.put("/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: str,
    req: MedicineUpdateRequest,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Update details for a specific medicine."""
    med = MedicineService.update_medicine(db, medicine_id, pharmacy.id, req)
    return MedicineOut.model_validate(med)


@router.delete("/{medicine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medicine(
    medicine_id: str,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Remove a medicine from the catalog."""
    MedicineService.delete_medicine(db, medicine_id, pharmacy.id)
    return None
