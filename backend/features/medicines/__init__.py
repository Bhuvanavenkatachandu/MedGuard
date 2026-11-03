"""MedGuard AI - Medicines Feature Package"""

from backend.features.medicines.models import Medicine, Supplier
from backend.features.medicines.router import router
from backend.features.medicines.suppliers_router import router as suppliers_router
from backend.features.medicines.service import MedicineService
from backend.features.medicines.suppliers_service import SupplierService
from backend.features.medicines.schemas import (
    MedicineCreateRequest,
    MedicineUpdateRequest,
    MedicineOut,
    SupplierCreateRequest,
    SupplierOut,
)

__all__ = [
    "Medicine",
    "Supplier",
    "router",
    "suppliers_router",
    "MedicineService",
    "SupplierService",
    "MedicineCreateRequest",
    "MedicineUpdateRequest",
    "MedicineOut",
    "SupplierCreateRequest",
    "SupplierOut",
]
