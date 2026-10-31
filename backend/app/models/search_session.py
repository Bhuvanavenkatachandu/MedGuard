import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime
from backend.app.database import Base

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_token = Column(String(100), unique=True, nullable=False, index=True)
    search_query = Column(String(255), nullable=True)
    user_lat = Column(Float, nullable=True)
    user_lng = Column(Float, nullable=True)
    results_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
