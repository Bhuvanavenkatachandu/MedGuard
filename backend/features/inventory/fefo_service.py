"""MedGuard AI - FEFO Dispensing Engine (Inventory Feature)"""

from datetime import date
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.features.inventory.models import Batch, Inventory


def get_fefo_batches_for_medicine(
    db: Session,
    pharmacy_id: str,
    medicine_id: str,
) -> List[Dict[str, Any]]:
    """Returns unexpired batches containing available stock for a medicine, earliest expiry first."""
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
    db: Session,
    pharmacy_id: str,
    medicine_id: str,
    pieces_needed: int,
) -> List[Dict[str, Any]]:
    """Allocates quantities across batches following First-Expired, First-Out order."""
    today = date.today()
    available_batches = (
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

    total_avail = sum(inv.total_pieces for _, inv in available_batches)
    if total_avail < pieces_needed:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient unexpired stock: requested {pieces_needed} pieces, only {total_avail} pieces available.",
        )

    allocations = []
    remaining = pieces_needed

    for batch, inv in available_batches:
        if remaining <= 0:
            break
        take = min(inv.total_pieces, remaining)
        allocations.append({
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "expiry_date": batch.expiry_date,
            "pieces_taken": take,
            "price_per_piece": inv.price_per_piece,
            "price_per_strip": inv.price_per_strip,
            "pieces_per_strip": inv.pieces_per_strip,
        })
        remaining -= take

    return allocations
