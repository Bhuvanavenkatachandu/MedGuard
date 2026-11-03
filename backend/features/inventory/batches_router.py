"""MedGuard AI - Batches Router (Inventory Feature)"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.features.inventory.models import Batch
from backend.features.inventory.fefo_service import get_fefo_batches_for_medicine
from backend.shared.auth.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/batches", tags=["Batches"])


@router.get("")
def list_batches(
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    batches = db.query(Batch).filter(Batch.pharmacy_id == pharmacy.id).order_by(Batch.expiry_date.asc()).all()
    results = []
    for b in batches:
        b_dict = {
            "id": b.id,
            "pharmacy_id": b.pharmacy_id,
            "medicine_id": b.medicine_id,
            "supplier_id": b.supplier_id,
            "batch_number": b.batch_number,
            "manufacturing_date": str(b.manufacturing_date) if b.manufacturing_date else None,
            "expiry_date": str(b.expiry_date),
            "mrp_per_strip": b.mrp_per_strip,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "suppliers": {"name": b.supplier.name} if b.supplier else None,
        }
        results.append(b_dict)
    return results


@router.get("/fefo/{medicine_id}")
def get_fefo_batches(
    medicine_id: str,
    pharmacy=Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return get_fefo_batches_for_medicine(db, pharmacy.id, medicine_id)
