from datetime import date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.batch import Batch
from backend.app.models.inventory import Inventory

def get_fefo_batches_for_medicine(db: Session, pharmacy_id: str, medicine_id: str) -> List[Dict[str, Any]]:
    today = date.today()
    batches = (
        db.query(Batch, Inventory)
        .join(Inventory, Inventory.batch_id == Batch.id)
        .filter(
            Batch.pharmacy_id == pharmacy_id,
            Batch.medicine_id == medicine_id,
            Batch.expiry_date >= today,
            Inventory.total_pieces > 0,
        )
        .order_by(Batch.expiry_date.asc())
        .all()
    )

    result = []
    for batch, inv in batches:
        result.append({
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "expiry_date": str(batch.expiry_date),
            "days_to_expiry": (batch.expiry_date - today).days,
            "total_pieces": inv.total_pieces,
            "pieces_per_strip": inv.pieces_per_strip,
            "price_per_piece": inv.price_per_piece,
            "price_per_strip": inv.price_per_strip,
        })
    return result

def allocate_fefo_stock(
    db: Session, pharmacy_id: str, medicine_id: str, pieces_needed: int
) -> List[Dict[str, Any]]:
    """
    Returns an allocation plan across available batches sorted by earliest expiry date.
    """
    batches = get_fefo_batches_for_medicine(db, pharmacy_id, medicine_id)
    allocations = []
    remaining = pieces_needed

    for b in batches:
        if remaining <= 0:
            break
        available = b["total_pieces"]
        take = min(available, remaining)
        allocations.append({
            "batch_id": b["batch_id"],
            "batch_number": b["batch_number"],
            "expiry_date": b["expiry_date"],
            "pieces_allocated": take,
            "unit_price_piece": b["price_per_piece"],
            "unit_price_strip": b["price_per_strip"],
        })
        remaining -= take

    if remaining > 0:
        raise ValueError(f"Insufficient stock for medicine. Needed {pieces_needed}, but only {pieces_needed - remaining} available across valid batches.")

    return allocations
