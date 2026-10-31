from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.pharmacy import Pharmacy
from backend.app.schemas.inventory import AddStockRequest, StockAdjustRequest, InventoryOut
from backend.app.services.inventory_service import (
    get_pharmacy_inventory,
    add_stock,
    adjust_stock,
    delete_inventory_item,
    mark_batch_expired,
)
from backend.app.dependencies import get_current_pharmacy

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("", response_model=List[InventoryOut])
def get_inventory(
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return get_pharmacy_inventory(db, pharmacy.id)

@router.post("", response_model=InventoryOut, status_code=status.HTTP_201_CREATED)
def post_add_stock(
    req: AddStockRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return add_stock(db, pharmacy.id, req)

@router.put("/{inventory_id}/adjust", response_model=InventoryOut)
def put_adjust_stock(
    inventory_id: str,
    req: StockAdjustRequest,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return adjust_stock(db, pharmacy.id, inventory_id, req.newTotalPieces, req.reason or "Stock count correction")

@router.delete("/{inventory_id}")
def delete_inventory(
    inventory_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return delete_inventory_item(db, pharmacy.id, inventory_id)

@router.post("/batches/{batch_id}/expire")
def post_mark_batch_expired(
    batch_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    return mark_batch_expired(db, pharmacy.id, batch_id)
