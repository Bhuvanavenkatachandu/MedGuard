"""MedGuard AI - Reports Feature Package"""

from backend.features.reports.router import router
from backend.features.reports.schemas import SalesReportItem, InventorySummary

__all__ = [
    "router",
    "SalesReportItem",
    "InventorySummary",
]
