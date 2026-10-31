import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    generic_name = Column(String(255), nullable=True, index=True)
    brand = Column(String(255), nullable=True, index=True)
    strength = Column(String(100), nullable=True, index=True)
    category = Column(String(100), default="General")
    manufacturer = Column(String(255), nullable=True)
    pieces_per_strip = Column(Integer, default=10)
    unit_of_measure = Column(String(50), default="tablet")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("pharmacy_id", "name", "strength", name="uq_pharmacy_medicine_strength"),
    )

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="medicines")
    batches = relationship("Batch", back_populates="medicine", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="medicine", cascade="all, delete-orphan")
