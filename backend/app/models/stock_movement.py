import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

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
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="stock_movements")
    medicine = relationship("Medicine")
    batch = relationship("Batch")
