import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    pieces_per_strip = Column(Integer, default=10)
    total_pieces = Column(Integer, default=0, index=True)  # Authoritative source of truth
    price_per_piece = Column(Float, default=0.0)
    price_per_strip = Column(Float, default=0.0)
    min_stock_pieces = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("pharmacy_id", "batch_id", name="uq_pharmacy_batch_inventory"),
    )

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="inventory")
    medicine = relationship("Medicine", back_populates="inventory")
    batch = relationship("Batch", back_populates="inventory_item")

    @property
    def available_strips(self) -> int:
        strip_size = self.pieces_per_strip if self.pieces_per_strip and self.pieces_per_strip > 0 else 10
        return self.total_pieces // strip_size

    @property
    def loose_pieces(self) -> int:
        strip_size = self.pieces_per_strip if self.pieces_per_strip and self.pieces_per_strip > 0 else 10
        return self.total_pieces % strip_size
