"""MedGuard AI - Knowledge Schemas

Pydantic models for Knowledge Base documents and chunks.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


VALID_CATEGORIES = {
    "POLICY",
    "RETURN_POLICY",
    "REFUND_POLICY",
    "DELIVERY_POLICY",
    "FAQ",
    "SOP",
    "PHARMACY_INFORMATION",
    "OTHER",
}


class KnowledgeDocumentCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="OTHER")
    content: str = Field(..., min_length=1)


class KnowledgeDocumentUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    content: Optional[str] = Field(None, min_length=1)


class KnowledgeChunkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    pharmacy_id: str
    content: str
    created_at: datetime


class KnowledgeDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    title: str
    category: str
    content: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chunk_count: Optional[int] = 0
