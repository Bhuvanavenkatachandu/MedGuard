"""MedGuard AI - Inventory Feature Package"""

from backend.features.inventory.models import Inventory, Batch, StockMovement
from backend.features.inventory.router import router
from backend.features.inventory.batches_router import router as batches_router
from backend.features.inventory.movements_router import router as movements_router
from backend.features.inventory.service import (
    get_pharmacy_inventory,
    get_inventory_for_medicine,
    add_stock,
    adjust_stock,
    delete_inventory_item,
    mark_batch_expired,
    format_inventory_out,
)
from backend.features.inventory.fefo_service import (
    get_fefo_batches_for_medicine,
    allocate_fefo_stock,
)
from backend.features.inventory.schemas import (
    AddStockRequest,
    StockAdjustRequest,
    InventoryOut,
    BatchCreateRequest,
    BatchOut,
)

__all__ = [
    "Inventory",
    "Batch",
    "StockMovement",
    "router",
    "batches_router",
    "movements_router",
    "get_pharmacy_inventory",
    "get_inventory_for_medicine",
    "add_stock",
    "adjust_stock",
    "delete_inventory_item",
    "mark_batch_expired",
    "format_inventory_out",
    "get_fefo_batches_for_medicine",
    "allocate_fefo_stock",
    "AddStockRequest",
    "StockAdjustRequest",
    "InventoryOut",
    "BatchCreateRequest",
    "BatchOut",
]
