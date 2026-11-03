"""MedGuard AI - Stock Movements Router (Inventory Feature)"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.inventory.models import StockMovement
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/movements", tags=["Stock Movements"])


@router.get("")
def list_stock_movements(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    movements = db.query(StockMovement).filter(StockMovement.pharmacy_id == pharmacy.id).order_by(StockMovement.created_at.desc()).all()
    results = []
    for m in movements:
        results.append({
            "id": m.id,
            "pharmacy_id": m.pharmacy_id,
            "medicine_id": m.medicine_id,
            "batch_id": m.batch_id,
            "movement_type": m.movement_type,
            "pieces_quantity": m.pieces_quantity,
            "balance_after": m.balance_after,
            "reference_id": m.reference_id,
            "notes": m.notes,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "medicine_name": m.medicine.name if m.medicine else "Medicine",
            "batch_number": m.batch.batch_number if m.batch else "N/A",
            "medicines": {"name": m.medicine.name} if m.medicine else None,
            "batches": {"batch_number": m.batch.batch_number} if m.batch else None,
        })
    return results
