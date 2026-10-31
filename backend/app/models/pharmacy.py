import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Pharmacy(Base):
    __tablename__ = "pharmacies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    owner_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    license_number = Column(String(100), nullable=True)
    near_expiry_threshold_days = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="pharmacy")
    medicines = relationship("Medicine", back_populates="pharmacy", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="pharmacy", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="pharmacy", cascade="all, delete-orphan")
    inventory = relationship("Inventory", back_populates="pharmacy", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="pharmacy", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="pharmacy", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="pharmacy", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="pharmacy", cascade="all, delete-orphan")
    ai_scans = relationship("AIScan", back_populates="pharmacy", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="pharmacy", cascade="all, delete-orphan")
