"""MedGuard AI - Medicine Catalog Service (Medicines Feature)"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status

from backend.features.medicines.models import Medicine
from backend.features.medicines.schemas import MedicineCreateRequest, MedicineUpdateRequest


class MedicineService:
    """Business operations for managing the pharmacy's medicine catalog."""

    @staticmethod
    def list_medicines(db: Session, pharmacy_id: str) -> List[Medicine]:
        """Fetch all medicines registered under a specific pharmacy, sorted alphabetically."""
        return (
            db.query(Medicine)
            .filter(Medicine.pharmacy_id == pharmacy_id)
            .order_by(Medicine.name.asc())
            .all()
        )

    @staticmethod
    def search_medicines(db: Session, pharmacy_id: str, query: str, limit: int = 5) -> List[Medicine]:
        """Search medicines for a pharmacy by name, generic name, or brand."""
        clean_query = (query or "").strip()
        if not clean_query:
            return []
        search_filter = f"%{clean_query}%"
        return (
            db.query(Medicine)
            .filter(
                Medicine.pharmacy_id == pharmacy_id,
                or_(
                    Medicine.name.ilike(search_filter),
                    Medicine.generic_name.ilike(search_filter),
                    Medicine.brand.ilike(search_filter),
                ),
            )
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_medicine_by_id(db: Session, medicine_id: str, pharmacy_id: str) -> Medicine:
        """Fetch a specific medicine by ID for a pharmacy. Raises 404 if not found."""
        med = (
            db.query(Medicine)
            .filter(Medicine.id == medicine_id, Medicine.pharmacy_id == pharmacy_id)
            .first()
        )
        if not med:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found in this pharmacy inventory",
            )
        return med

    @staticmethod
    def create_medicine(
        db: Session,
        pharmacy_id: str,
        req: MedicineCreateRequest,
    ) -> Medicine:
        """Create a new medicine catalog entry for a pharmacy."""
        med = Medicine(
            pharmacy_id=pharmacy_id,
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
        return med

    @staticmethod
    def update_medicine(
        db: Session,
        medicine_id: str,
        pharmacy_id: str,
        req: MedicineUpdateRequest,
    ) -> Medicine:
        """Update an existing medicine's details."""
        med = MedicineService.get_medicine_by_id(db, medicine_id, pharmacy_id)

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
        return med

    @staticmethod
    def delete_medicine(
        db: Session,
        medicine_id: str,
        pharmacy_id: str,
    ) -> Medicine:
        """Remove a medicine from the pharmacy catalog."""
        med = MedicineService.get_medicine_by_id(db, medicine_id, pharmacy_id)
        db.delete(med)
        db.commit()
        return med
