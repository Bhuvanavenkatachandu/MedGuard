"""MedGuard AI - Chat Message Model

Represents a single message turn (user, assistant, system) in a ChatSession.
Supports metadata for tool invocation history, references, and citations.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(
        String(36),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Role: 'user', 'assistant', 'system'
    role = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    # metadata column alias avoiding conflict with Base.metadata
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
