"""MedGuard AI Chatbot Feature."""

from backend.features.chatbot.models import (
    KnowledgeDocument,
    KnowledgeChunk,
    ChatSession,
    ChatMessage,
)
from backend.features.chatbot.schemas import (
    ChatMessageOut,
    ChatSessionCreate,
    ChatSessionOut,
    ChatSessionDetailOut,
    ChatQueryRequest,
    ChatQueryResponse,
)
from backend.features.chatbot.service import ChatService

# Alias for convenience
ChatbotService = ChatService

from backend.features.chatbot.router import router

__all__ = [
    "KnowledgeDocument",
    "KnowledgeChunk",
    "ChatSession",
    "ChatMessage",
    "ChatMessageOut",
    "ChatSessionCreate",
    "ChatSessionOut",
    "ChatSessionDetailOut",
    "ChatQueryRequest",
    "ChatQueryResponse",
    "ChatService",
    "ChatbotService",
    "router",
]
