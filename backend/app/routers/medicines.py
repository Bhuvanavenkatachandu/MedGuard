from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.medicine import Medicine
from backend.app.schemas.medicine import MedicineCreateRequest, MedicineUpdateRequest, MedicineOut
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/medicines", tags=["Medicines"])

@router.get("", response_model=List[MedicineOut])
def list_medicines(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy.id).order_by(Medicine.name.asc()).all()
    return [MedicineOut.model_validate(m) for m in medicines]

@router.get("/{medicine_id}", response_model=MedicineOut)
def get_medicine(
    medicine_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    med = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.pharmacy_id == pharmacy.id).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found in this pharmacy inventory",
        )
    return MedicineOut.model_validate(med)

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

@router.put("/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: str,
    req: MedicineUpdateRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    med = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.pharmacy_id == pharmacy.id).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found in this pharmacy inventory",
        )
    if req.name is not None:
        med.name = req.name.strip()
    if req.generic_name is not None:
        med.generic_name = req.generic_name.strip() if req.generic_name else None
    if req.brand is not None:
        med.brand = req.brand.strip() if req.brand else None
    if req.strength is not None:
        med.strength = req.strength.strip() if req.strength else None
    if req.category is not None:
        med.category = req.category
    if req.manufacturer is not None:
        med.manufacturer = req.manufacturer.strip() if req.manufacturer else None
    if req.pieces_per_strip is not None:
        med.pieces_per_strip = req.pieces_per_strip
    if req.unit_of_measure is not None:
        med.unit_of_measure = req.unit_of_measure

    db.commit()
    db.refresh(med)
    return MedicineOut.model_validate(med)

@router.delete("/{medicine_id}")
def delete_medicine(
    medicine_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    med = db.query(Medicine).filter(Medicine.id == medicine_id, Medicine.pharmacy_id == pharmacy.id).first()
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found in this pharmacy inventory",
        )
    db.delete(med)
    db.commit()
    return {"message": f"Medicine '{med.name}' deleted successfully", "success": True}
