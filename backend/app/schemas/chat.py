"""MedGuard AI - Chat Schemas

Pydantic models for pharmacy assistant chat requests, responses, and session history.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    message: str
    metadata: Optional[Dict[str, Any]] = Field(default=None, alias="metadata_json")
    created_at: datetime


class ChatSessionCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    pharmacy_id: Optional[str] = None
    title: Optional[str] = "New Conversation"


class ChatSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    pharmacy_id: str
    user_id: Optional[str] = None
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0


class ChatSessionDetailOut(ChatSessionOut):
    messages: List[ChatMessageOut] = []


class ChatQueryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None
    pharmacy_id: Optional[str] = None


class ChatQueryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str
    role: str = "assistant"
    message: str
    sources: List[Dict[str, Any]] = []
    tools_used: List[str] = []
    model_used: Optional[str] = None
    cached: bool = False
