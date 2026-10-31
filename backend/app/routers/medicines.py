from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.medicine import Medicine
from backend.app.schemas.medicine import MedicineCreateRequest, MedicineOut
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])

@router.get("", response_model=List[MedicineOut])
def list_medicines(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy.id).order_by(Medicine.name.asc()).all()
    return [MedicineOut.model_validate(m) for m in medicines]

@router.post("", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(
    req: MedicineCreateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    med = Medicine(
        pharmacy_id=pharmacy.id,
        name=req.name.strip(),
        generic_name=req.generic_name.strip() if req.generic_name else None,
        brand=req.brand.strip() if req.brand else None,
        strength=req.strength.strip() if req.strength else None,
        category=req.category or "General",
        manufacturer=req.manufacturer.strip() if req.manufacturer else None,
        pieces_per_strip=req.pieces_per_strip or 10,
        unit_of_measure=req.unit_of_measure or "tablet",
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return MedicineOut.model_validate(med)
