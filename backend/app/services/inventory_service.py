from datetime import datetime, date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.pharmacy import Pharmacy
from backend.app.models.medicine import Medicine
from backend.app.models.batch import Batch
from backend.app.models.inventory import Inventory
from backend.app.models.stock_movement import StockMovement
from backend.app.schemas.inventory import AddStockRequest, InventoryOut
from backend.app.schemas.medicine import MedicineOut
from backend.app.schemas.batch import BatchOut

def get_pharmacy_inventory(db: Session, pharmacy_id: str) -> List[InventoryOut]:
    items = db.query(Inventory).filter(Inventory.pharmacy_id == pharmacy_id).all()
    out = []
    for item in items:
        med_out = MedicineOut.model_validate(item.medicine) if item.medicine else None
        batch_out = BatchOut.model_validate(item.batch) if item.batch else None
        
        pieces_per_strip = item.pieces_per_strip or (item.medicine.pieces_per_strip if item.medicine else 10) or 10
        total_pieces = item.total_pieces or 0
        available_strips = total_pieces // pieces_per_strip
        loose_pieces = total_pieces % pieces_per_strip

        inv_out = InventoryOut(
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
        out.append(inv_out)
    return out

def add_stock(db: Session, pharmacy_id: str, req: AddStockRequest) -> InventoryOut:
    med_name = req.medicine_name.strip()
    batch_num = req.batch_number.strip()
    pieces_per_strip = req.pieces_per_strip if req.pieces_per_strip and req.pieces_per_strip > 0 else 10
    qty_strips = req.quantity_strips if req.quantity_strips is not None else 0
    added_pieces = qty_strips * pieces_per_strip
    price_per_strip = float(req.price_per_strip or 0.0)
    price_per_piece = float(req.price_per_piece) if req.price_per_piece else (price_per_strip / pieces_per_strip if pieces_per_strip > 0 else 0.0)
    min_stock_pieces = req.min_stock_pieces or 20

    # Parse dates
    exp_date = datetime.strptime(req.expiry_date.strip()[:10], "%Y-%m-%d").date()
    mfg_date = None
    if req.manufacturing_date:
        try:
            mfg_date = datetime.strptime(req.manufacturing_date.strip()[:10], "%Y-%m-%d").date()
        except Exception:
            mfg_date = None

    # 1. Find or create Medicine
    medicine = db.query(Medicine).filter(
        Medicine.pharmacy_id == pharmacy_id,
        func.lower(Medicine.name) == med_name.lower(),
        Medicine.strength == (req.strength.strip() if req.strength else None)
    ).first()

    if not medicine:
        # Check without strength
        medicine = db.query(Medicine).filter(
            Medicine.pharmacy_id == pharmacy_id,
            func.lower(Medicine.name) == med_name.lower()
        ).first()

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
        # Update existing metadata if provided
        if req.generic_name: medicine.generic_name = req.generic_name.strip()
        if req.brand: medicine.brand = req.brand.strip()
        if req.strength: medicine.strength = req.strength.strip()
        if req.manufacturer: medicine.manufacturer = req.manufacturer.strip()
        if req.category: medicine.category = req.category

    # 2. Find or create Batch
    batch = db.query(Batch).filter(
        Batch.pharmacy_id == pharmacy_id,
        Batch.medicine_id == medicine.id,
        Batch.batch_number == batch_num
    ).first()

    if not batch:
        batch = Batch(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine.id,
            supplier_id=req.supplier_id or None,
            batch_number=batch_num,
            manufacturing_date=mfg_date,
            expiry_date=exp_date,
            mrp_per_strip=price_per_strip,
        )
        db.add(batch)
        db.flush()
    else:
        batch.expiry_date = exp_date
        if mfg_date: batch.manufacturing_date = mfg_date
        if req.supplier_id: batch.supplier_id = req.supplier_id
        if price_per_strip > 0: batch.mrp_per_strip = price_per_strip

    # 3. Find or create Inventory
    inventory = db.query(Inventory).filter(
        Inventory.pharmacy_id == pharmacy_id,
        Inventory.batch_id == batch.id
    ).first()

    is_new = False
    if not inventory:
        is_new = True
        inventory = Inventory(
            pharmacy_id=pharmacy_id,
            medicine_id=medicine.id,
            batch_id=batch.id,
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

    # 4. Log Stock Movement
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

    med_out = MedicineOut.model_validate(medicine)
    batch_out = BatchOut.model_validate(batch)

    return InventoryOut(
        id=inventory.id,
        pharmacy_id=inventory.pharmacy_id,
        medicine_id=inventory.medicine_id,
        batch_id=inventory.batch_id,
        pieces_per_strip=inventory.pieces_per_strip,
        total_pieces=inventory.total_pieces,
        available_strips=inventory.total_pieces // inventory.pieces_per_strip,
        loose_pieces=inventory.total_pieces % inventory.pieces_per_strip,
        price_per_piece=inventory.price_per_piece,
        price_per_strip=inventory.price_per_strip,
        min_stock_pieces=inventory.min_stock_pieces,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
        medicine=med_out,
        batch=batch_out,
    )

def adjust_stock(db: Session, pharmacy_id: str, inventory_id: str, new_total_pieces: int, reason: str = "Stock count correction") -> InventoryOut:
    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.pharmacy_id == pharmacy_id
    ).first()
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

    med_out = MedicineOut.model_validate(inventory.medicine) if inventory.medicine else None
    batch_out = BatchOut.model_validate(inventory.batch) if inventory.batch else None

    return InventoryOut(
        id=inventory.id,
        pharmacy_id=inventory.pharmacy_id,
        medicine_id=inventory.medicine_id,
        batch_id=inventory.batch_id,
        pieces_per_strip=inventory.pieces_per_strip,
        total_pieces=inventory.total_pieces,
        available_strips=inventory.total_pieces // inventory.pieces_per_strip,
        loose_pieces=inventory.total_pieces % inventory.pieces_per_strip,
        price_per_piece=inventory.price_per_piece,
        price_per_strip=inventory.price_per_strip,
        min_stock_pieces=inventory.min_stock_pieces,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
        medicine=med_out,
        batch=batch_out,
    )

def delete_inventory_item(db: Session, pharmacy_id: str, inventory_id: str):
    inventory = db.query(Inventory).filter(
        Inventory.id == inventory_id,
        Inventory.pharmacy_id == pharmacy_id
    ).first()
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
    inventory = db.query(Inventory).filter(
        Inventory.batch_id == batch_id,
        Inventory.pharmacy_id == pharmacy_id
    ).first()
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

    return {"success": True, "message": f"Successfully wrote off {pieces_to_write_off} pieces of expired stock"}
