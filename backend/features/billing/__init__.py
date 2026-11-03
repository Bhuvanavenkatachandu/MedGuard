"""MedGuard AI - Billing Feature Package"""

from backend.features.billing.models import Sale, SaleItem, Invoice
from backend.features.billing.sales_router import router as sales_router
from backend.features.billing.invoices_router import router as invoices_router
from backend.features.billing.sales_service import checkout_sale
from backend.features.billing.invoice_service import generate_invoice_pdf
from backend.features.billing.schemas import (
    SaleItemRequest,
    SaleItemOut,
    SaleCheckoutRequest,
    SaleOut,
    SaleCheckoutResponse,
    InvoiceOut,
)

__all__ = [
    "Sale",
    "SaleItem",
    "Invoice",
    "sales_router",
    "invoices_router",
    "checkout_sale",
    "generate_invoice_pdf",
    "SaleItemRequest",
    "SaleItemOut",
    "SaleCheckoutRequest",
    "SaleOut",
    "SaleCheckoutResponse",
    "InvoiceOut",
]
