"""MedGuard AI - Chatbot Knowledge Base Sub-Feature Package"""

from backend.features.chatbot.knowledge.router import router
from backend.features.chatbot.knowledge.service import KnowledgeService
from backend.features.chatbot.knowledge.schemas import (
    KnowledgeDocumentCreate,
    KnowledgeDocumentUpdate,
    KnowledgeDocumentOut,
    KnowledgeChunkOut,
)

__all__ = [
    "router",
    "KnowledgeService",
    "KnowledgeDocumentCreate",
    "KnowledgeDocumentUpdate",
    "KnowledgeDocumentOut",
    "KnowledgeChunkOut",
]
