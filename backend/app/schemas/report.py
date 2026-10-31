from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SalesReportItem(BaseModel):
    date: str
    total_sales: int
    revenue: float

class InventorySummary(BaseModel):
    total_items: int
    total_pieces: int
    total_value: float
    low_stock_count: int
    expired_count: int
