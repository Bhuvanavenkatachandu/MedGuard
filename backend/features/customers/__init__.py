"""MedGuard AI - Customers Feature Package"""

from backend.features.customers.models import Customer
from backend.features.customers.router import router
from backend.features.customers.service import CustomerService
from backend.features.customers.schemas import CustomerCreateRequest, CustomerOut

__all__ = [
    "Customer",
    "router",
    "CustomerService",
    "CustomerCreateRequest",
    "CustomerOut",
]
