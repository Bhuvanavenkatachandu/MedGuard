"""MedGuard AI - Pharmacy Router (Pharmacy Feature)"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.pharmacy.schemas import PharmacyCreateRequest, PharmacyUpdateRequest, PharmacyOut
from backend.features.pharmacy.service import create_pharmacy_for_user, get_pharmacy_by_user, update_pharmacy
from backend.shared.auth.dependencies import get_current_user, get_current_pharmacy

router = APIRouter(prefix="/api/pharmacies", tags=["Pharmacies"])


@router.post("", response_model=PharmacyOut)
def setup_pharmacy(
    req: PharmacyCreateRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register or initialize a pharmacy profile for the authenticated pharmacist."""
    return create_pharmacy_for_user(db, current_user, req)


@router.get("/me", response_model=PharmacyOut)
def get_my_pharmacy(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve pharmacy profile configuration for current authenticated user."""
    pharmacy = get_pharmacy_by_user(db, current_user)
    if not pharmacy:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy not configured.")
    return pharmacy


@router.put("/me", response_model=PharmacyOut)
def update_my_pharmacy(
    req: PharmacyUpdateRequest,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Update contact, address, or notification thresholds for authenticated pharmacy."""
    return update_pharmacy(db, pharmacy, req)
