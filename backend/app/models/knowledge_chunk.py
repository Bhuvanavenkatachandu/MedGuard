"""MedGuard AI - Knowledge Chunk Model

Represents a text chunk extracted from a KnowledgeDocument.
Includes an embedding vector (stored as JSON array of floats) for RAG retrieval.
Strictly scoped by pharmacy_id to guarantee zero cross-pharmacy retrieval.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(
        String(36),
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pharmacy_id = Column(
        String(36),
        ForeignKey("pharmacies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    # Stored as a list of floats in JSON format: [0.012, -0.045, ...]
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    document = relationship("KnowledgeDocument", back_populates="chunks")
    pharmacy = relationship("Pharmacy")
