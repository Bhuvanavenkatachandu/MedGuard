import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.app.database import Base

class AIScan(Base):
    __tablename__ = "ai_scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pharmacy_id = Column(String(36), ForeignKey("pharmacies.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    raw_response = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)    # Native JSON in PostgreSQL
    confidence_score = Column(Float, default=0.0)
    status = Column(String(50), default="completed")  # 'pending', 'completed', 'failed', 'verified'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="ai_scans")
