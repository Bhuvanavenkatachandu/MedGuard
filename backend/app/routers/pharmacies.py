from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.pharmacy import PharmacyCreateRequest, PharmacyUpdateRequest, PharmacyOut
from backend.app.services.pharmacy_service import create_pharmacy_for_user, get_pharmacy_by_user, update_pharmacy
from backend.app.dependencies import get_current_user, get_current_pharmacy

router = APIRouter(prefix="/api/pharmacies", tags=["Pharmacies"])

@router.post("", response_model=PharmacyOut, status_code=status.HTTP_201_CREATED)
def create_pharmacy(
    req: PharmacyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_pharmacy_for_user(db, current_user, req)

@router.get("/me", response_model=PharmacyOut)
def get_my_pharmacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pharm = get_pharmacy_by_user(db, current_user)
    if not pharm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pharmacy registered for current user",
        )
    return pharm

@router.put("/me", response_model=PharmacyOut)
def update_my_pharmacy(
    req: PharmacyUpdateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return update_pharmacy(db, pharmacy, req)
