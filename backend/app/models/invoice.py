import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    sale_id = Column(String(36), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    invoice_number = Column(String(100), unique=True, nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=True)
    total_amount = Column(Float, nullable=False)
    pdf_url = Column(String(500), nullable=True)
    status = Column(String(50), default="generated")  # 'generated', 'emailed', 'email_failed'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="invoices")
    sale = relationship("Sale", back_populates="invoice")
    email_logs = relationship("EmailLog", back_populates="invoice", cascade="all, delete-orphan")
