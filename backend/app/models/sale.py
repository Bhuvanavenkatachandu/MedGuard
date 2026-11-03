"""Backward-compatibility bridge for Sale and SaleItem models."""
from backend.features.billing.models import Sale, SaleItem
__all__ = ["Sale", "SaleItem"]
