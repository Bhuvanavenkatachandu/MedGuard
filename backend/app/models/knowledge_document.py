"""MedGuard AI - Knowledge Document Model

Represents a pharmacy-specific knowledge document (policy, FAQ, SOP, general info).
Strictly scoped by pharmacy_id for tenant isolation.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(
        String(36),
        ForeignKey("pharmacies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False)
    # Categories: POLICY, RETURN_POLICY, REFUND_POLICY, DELIVERY_POLICY, FAQ, SOP, PHARMACY_INFORMATION, OTHER
    category = Column(String(50), nullable=False, default="OTHER")
    content = Column(Text, nullable=False)
    created_by = Column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="knowledge_documents")
    creator = relationship("User", foreign_keys=[created_by])
    chunks = relationship(
        "KnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
