"""MedGuard AI - Inventory & Stock Management Service (Inventory Feature)"""

from datetime import datetime, date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.features.medicines.models import Medicine
from backend.features.inventory.models import Batch, Inventory, StockMovement
from backend.features.inventory.schemas import AddStockRequest, InventoryOut
from backend.features.medicines.schemas import MedicineOut
from backend.features.inventory.schemas import BatchOut


def format_inventory_out(item: Inventory) -> InventoryOut:
    """Transforms an Inventory ORM model into a standardized InventoryOut schema."""
    med_out = MedicineOut.model_validate(item.medicine) if item.medicine else None
    batch_out = BatchOut.model_validate(item.batch) if item.batch else None

    pieces_per_strip = (
        item.pieces_per_strip
        or (item.medicine.pieces_per_strip if item.medicine else 10)
        or 10
    )
    total_pieces = item.total_pieces or 0
    available_strips = total_pieces // pieces_per_strip
    loose_pieces = total_pieces % pieces_per_strip

    return InventoryOut(
        id=item.id,
        pharmacy_id=item.pharmacy_id,
        medicine_id=item.medicine_id,
        batch_id=item.batch_id,
        pieces_per_strip=pieces_per_strip,
        total_pieces=total_pieces,
        available_strips=available_strips,
        loose_pieces=loose_pieces,
        price_per_piece=item.price_per_piece,
        price_per_strip=item.price_per_strip,
        min_stock_pieces=item.min_stock_pieces,
        created_at=item.created_at,
        updated_at=item.updated_at,
        medicine=med_out,
        batch=batch_out,
    )


def get_pharmacy_inventory(db: Session, pharmacy_id: str) -> List[InventoryOut]:
    """Retrieve all inventory items with associated medicine and batch details for a pharmacy."""
    items = db.query(Inventory).filter(Inventory.pharmacy_id == pharmacy_id).all()
    return [format_inventory_out(item) for item in items]


def get_inventory_for_medicine(db: Session, pharmacy_id: str, medicine_id: str) -> List[Inventory]:
    """Fetch all inventory records for a given medicine in a pharmacy."""
    return (
        db.query(Inventory)
        .filter(Inventory.pharmacy_id == pharmacy_id, Inventory.medicine_id == medicine_id)
        .all()
    )


def add_stock(db: Session, pharmacy_id: str, req: AddStockRequest) -> InventoryOut:
    """Stock Intake Workflow: Resolve medicine, batch, inventory, and record ledger movement."""
    med_name = req.medicine_name.strip()
    batch_num = req.batch_number.strip()
    pieces_per_strip = req.pieces_per_strip if req.pieces_per_strip and req.pieces_per_strip > 0 else 10
    qty_strips = req.quantity_strips if req.quantity_strips is not None else 0
    added_pieces = qty_strips * pieces_per_strip
    price_per_strip = float(req.price_per_strip or 0.0)
    price_per_piece = (
        float(req.price_per_piece)
        if req.price_per_piece
        else (price_per_strip / pieces_per_strip if pieces_per_strip > 0 else 0.0)
    )
    min_stock_pieces = req.min_stock_pieces or 20

    exp_date = datetime.strptime(req.expiry_date.strip()[:10], "%Y-%m-%d").date()
    mfg_date = None
    if req.manufacturing_date:
        try:
            mfg_date = datetime.strptime(req.manufacturing_date.strip()[:10], "%Y-%m-%d").date()
        except Exception:
            mfg_date = None

    # Step 1: Find or create Medicine
    medicine = _find_or_create_medicine(
        db=db,
        pharmacy_id=pharmacy_id,
        med_name=med_name,
        pieces_per_strip=pieces_per_strip,
        req=req,
    )

    # Step 2: Find or create Batch
    batch = _find_or_create_batch(
        db=db,
        pharmacy_id=pharmacy_id,
        medicine_id=medicine.id,
        batch_num=batch_num,
        exp_date=exp_date,
        mfg_date=mfg_date,
        price_per_strip=price_per_strip,
        supplier_id=req.supplier_id,
    )

    # Step 3: Find or update Inventory
    inventory, is_new = _find_or_update_inventory(
        db=db,
        pharmacy_id=pharmacy_id,
        medicine_id=medicine.id,
        batch_id=batch.id,
        pieces_per_strip=pieces_per_strip,
        added_pieces=added_pieces,
        price_per_piece=price_per_piece,
        price_per_strip=price_per_strip,
        min_stock_pieces=min_stock_pieces,
    )

    # Step 4: Record stock movement
    movement = StockMovement(
        pharmacy_id=pharmacy_id,
        medicine_id=medicine.id,
        batch_id=batch.id,
        movement_type="initial_stock" if is_new and added_pieces > 0 else "stock_added",
        pieces_quantity=added_pieces,
        balance_after=inventory.total_pieces,
        reference_id=f"BATCH-{batch.batch_number}",
        notes=f"Stock inward ({qty_strips} strips / {added_pieces} pieces)",
    )
    db.add(movement)
    db.commit()
    db.refresh(inventory)

    return format_inventory_out(inventory)


def adjust_stock(
    db: Session,
    pharmacy_id: str,
    inventory_id: str,
    new_total_pieces: int,
    reason: str = "Stock count correction",
) -> InventoryOut:
    """Manually correct stock on hand."""
    inventory = (
        db.query(Inventory)
        .filter(Inventory.id == inventory_id, Inventory.pharmacy_id == pharmacy_id)
        .first()
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    old_total = inventory.total_pieces
    delta = new_total_pieces - old_total
    inventory.total_pieces = max(0, new_total_pieces)

    movement = StockMovement(
        pharmacy_id=pharmacy_id,
        medicine_id=inventory.medicine_id,
        batch_id=inventory.batch_id,
        movement_type="adjustment",
        pieces_quantity=delta,
        balance_after=inventory.total_pieces,
        reference_id="MANUAL-ADJUSTMENT",
        notes=reason or f"Count adjustment from {old_total} to {new_total_pieces}",
    )
    db.add(movement)
    db.commit()
    db.refresh(inventory)

    return format_inventory_out(inventory)


def delete_inventory_item(db: Session, pharmacy_id: str, inventory_id: str):
    """Remove an inventory item and write down remaining balance in the ledger."""
    inventory = (
        db.query(Inventory)
        .filter(Inventory.id == inventory_id, Inventory.pharmacy_id == pharmacy_id)
        .first()
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    if inventory.total_pieces > 0:
        movement = StockMovement(
            pharmacy_id=pharmacy_id,
            medicine_id=inventory.medicine_id,
            batch_id=inventory.batch_id,
            movement_type="adjustment",
            pieces_quantity=-inventory.total_pieces,
            balance_after=0,
            reference_id="ITEM-DELETED",
            notes="Item deleted from inventory catalog",
        )
        db.add(movement)

    db.delete(inventory)
    db.commit()
    return {"success": True, "message": "Inventory item deleted successfully"}


def mark_batch_expired(db: Session, pharmacy_id: str, batch_id: str):
    """Write off unsellable expired units."""
    inventory = (
        db.query(Inventory)
        .filter(Inventory.batch_id == batch_id, Inventory.pharmacy_id == pharmacy_id)
        .first()
    )
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory item not found for batch")

    pieces_to_write_off = inventory.total_pieces
    if pieces_to_write_off > 0:
        inventory.total_pieces = 0
        movement = StockMovement(
            pharmacy_id=pharmacy_id,
            medicine_id=inventory.medicine_id,
            batch_id=inventory.batch_id,
            movement_type="expired_stock",
            pieces_quantity=-pieces_to_write_off,
            balance_after=0,
            reference_id=f"WRITE-OFF-{batch_id[:8]}",
            notes=f"Expired stock write-off: {pieces_to_write_off} pieces removed from saleable inventory",
        )
        db.add(movement)
        db.commit()
        db.refresh(inventory)

    return {
        "success": True,
        "message": f"Successfully wrote off {pieces_to_write_off} pieces of expired stock",
    }


def _find_or_create_medicine(
    db: Session,
    pharmacy_id: str,
    med_name: str,
    pieces_per_strip: int,
    req: AddStockRequest,
) -> Medicine:
    medicine = (
        db.query(Medicine)
        .filter(
            Medicine.pharmacy_id == pharmacy_id,
            func.lower(Medicine.name) == med_name.lower(),
            Medicine.strength == (req.strength.strip() if req.strength else None),
        )
        .first()
    )

    if not medicine:
        medicine = (
            db.query(Medicine)
            .filter(
                Medicine.pharmacy_id == pharmacy_id,
                func.lower(Medicine.name) == med_name.lower(),
            )
            .first()
        )

    if not medicine:
        medicine = Medicine(
            pharmacy_id=pharmacy_id,
            name=med_name,
            generic_name=req.generic_name.strip() if req.generic_name else None,
            brand=req.brand.strip() if req.brand else None,
            strength=req.strength.strip() if req.strength else None,
            category=req.category or "General",
            manufacturer=req.manufacturer.strip() if req.manufacturer else None,
            pieces_per_strip=pieces_per_strip,
            unit_of_measure="tablet",
        )
        db.add(medicine)
        db.flush()
    else:
        if req.generic_name:
            medicine.generic_name = req.generic_name.strip()
        if req.brand:
            medicine.brand = req.brand.strip()
        if req.strength:
            medicine.strength = req.strength.strip()
        if req.manufacturer:
            medicine.manufacturer = req.manufacturer.strip()
        if req.category:
            medicine.category = req.category

    return medicine


def _find_or_create_batch(
    db: Session,
    pharmacy_id: str,
    medicine_id: str,
    batch_num: str,
    exp_date: date,
    mfg_date: Optional[date],
    price_per_strip: float,
    supplier_id: Optional[str],
) -> Batch:
    batch = (
        db.query(Batch)
        .filter(
            Batch.pharmacy_id == pharmacy_id,
            Batch.medicine_id == medicine_id,
            Batch.batch_number == batch_num,
        )
        .first()
    )

    if not batch:
        batch = Batch(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine_id,
            supplier_id=supplier_id or None,
            batch_number=batch_num,
            manufacturing_date=mfg_date,
            expiry_date=exp_date,
            mrp_per_strip=price_per_strip,
        )
        db.add(batch)
        db.flush()
    else:
        batch.expiry_date = exp_date
        if mfg_date:
            batch.manufacturing_date = mfg_date
        if supplier_id:
            batch.supplier_id = supplier_id
        if price_per_strip > 0:
            batch.mrp_per_strip = price_per_strip

    return batch


def _find_or_update_inventory(
    db: Session,
    pharmacy_id: str,
    medicine_id: str,
    batch_id: str,
    pieces_per_strip: int,
    added_pieces: int,
    price_per_piece: float,
    price_per_strip: float,
    min_stock_pieces: int,
) -> tuple[Inventory, bool]:
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.pharmacy_id == pharmacy_id,
            Inventory.batch_id == batch_id,
        )
        .first()
    )

    is_new = False
    if not inventory:
        is_new = True
        inventory = Inventory(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine_id,
            batch_id=batch_id,
            pieces_per_strip=pieces_per_strip,
            total_pieces=added_pieces,
            price_per_piece=price_per_piece,
            price_per_strip=price_per_strip,
            min_stock_pieces=min_stock_pieces,
        )
        db.add(inventory)
        db.flush()
    else:
        inventory.total_pieces += added_pieces
        inventory.pieces_per_strip = pieces_per_strip
        if price_per_strip > 0:
            inventory.price_per_strip = price_per_strip
            inventory.price_per_piece = price_per_piece
        if min_stock_pieces:
            inventory.min_stock_pieces = min_stock_pieces

    return inventory, is_new
