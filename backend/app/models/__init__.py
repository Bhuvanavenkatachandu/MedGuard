"""MedGuard AI - Backward-Compatible Models Registry.

Re-exports all ORM models from their respective feature packages.
"""

from backend.features.auth.models import User
from backend.features.pharmacy.models import Pharmacy, SearchSession
from backend.features.medicines.models import Medicine, Supplier
from backend.features.inventory.models import Batch, Inventory, StockMovement
from backend.features.customers.models import Customer
from backend.features.billing.models import Sale, SaleItem, Invoice
from backend.features.ai_recognition.models import AIScan
from backend.shared.email.models import EmailLog
from backend.features.chatbot.models import (
    KnowledgeDocument,
    KnowledgeChunk,
    ChatSession,
    ChatMessage,
)

__all__ = [
    "User",
    "Pharmacy",
    "Medicine",
    "Supplier",
    "Batch",
    "Inventory",
    "Customer",
    "Sale",
    "SaleItem",
    "Invoice",
    "AIScan",
    "SearchSession",
    "StockMovement",
    "EmailLog",
    "KnowledgeDocument",
    "KnowledgeChunk",
    "ChatSession",
    "ChatMessage",
]
