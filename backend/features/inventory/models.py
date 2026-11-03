"""MedGuard AI - Inventory, Batch & StockMovement Models (Inventory Feature)"""

import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.shared.database import Base


class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(String(36), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    batch_number = Column(String(100), nullable=False)
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=False, index=True)
    mrp_per_strip = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("pharmacy_id", "medicine_id", "batch_number", name="uq_pharmacy_medicine_batch"),
    )

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="batches")
    medicine = relationship("Medicine", back_populates="batches")
    supplier = relationship("Supplier", back_populates="batches")
    inventory_item = relationship("Inventory", back_populates="batch", uselist=False, cascade="all, delete-orphan")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    pieces_per_strip = Column(Integer, default=10)
    total_pieces = Column(Integer, default=0, index=True)
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


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    medicine_id = Column(String(36), ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id"), nullable=False)
    movement_type = Column(String(50), nullable=False)  # 'initial_stock', 'stock_added', 'sale', 'adjustment', 'return', 'expired_stock'
    pieces_quantity = Column(Integer, nullable=False)    # positive for addition, negative for deduction
    balance_after = Column(Integer, nullable=False)
    reference_id = Column(String(100), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="stock_movements")
    medicine = relationship("Medicine")
    batch = relationship("Batch")
