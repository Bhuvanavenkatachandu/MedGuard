"""MedGuard AI - Chat Assistant Router

REST endpoints for interacting with the AI Pharmacy Assistant.
Supports both Pharmacists (authenticated staff view) and Customers (public/guest view).
Guarantees strict tenant separation by enforcing pharmacy scoping on all calls.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.dependencies import get_optional_current_user
from backend.app.models.chat_message import ChatMessage
from backend.app.models.chat_session import ChatSession
from backend.app.models.pharmacy import Pharmacy
from backend.app.models.user import User
from backend.app.schemas.chat import (
    ChatMessageOut,
    ChatQueryRequest,
    ChatQueryResponse,
    ChatSessionDetailOut,
    ChatSessionOut,
)
from backend.app.services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["Pharmacy Chatbot"])


@router.post("/query", response_model=ChatQueryResponse)
async def chat_query(
    request: ChatQueryRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Send a message to the AI Pharmacy Assistant.
    - Pharmacists automatically query their own store with full inventory/SOP access.
    - Customers / Guests must specify pharmacy_id and query customer-facing information.
    """
    is_pharmacist = False
    pharmacy_id = request.pharmacy_id
    user_id = current_user.id if current_user else None

    # Check if user is an authenticated pharmacist
    if current_user and current_user.role in ["pharmacist", "admin"]:
        user_pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == current_user.id).first()
        if user_pharmacy:
            # If pharmacist, default to their pharmacy
            pharmacy_id = pharmacy_id or user_pharmacy.id
            if pharmacy_id == user_pharmacy.id:
                is_pharmacist = True

    if not pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="pharmacy_id is required to direct questions to a specific pharmacy assistant.",
        )

    return await ChatService.process_query(
        db=db,
        pharmacy_id=pharmacy_id,
        user_id=user_id,
        request=request,
        is_pharmacist=is_pharmacist,
    )


@router.get("/sessions", response_model=List[ChatSessionOut])
def list_sessions(
    pharmacy_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    List chat sessions.
    - Pharmacists view conversation history for their pharmacy.
    - Customers view their past conversations.
    """
    target_pharmacy_id = pharmacy_id

    if current_user and current_user.role in ["pharmacist", "admin"]:
        user_pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == current_user.id).first()
        if user_pharmacy:
            target_pharmacy_id = user_pharmacy.id

    query = db.query(ChatSession)
    if target_pharmacy_id:
        query = query.filter(ChatSession.pharmacy_id == target_pharmacy_id)
    if current_user and current_user.role not in ["pharmacist", "admin"]:
        query = query.filter(ChatSession.user_id == current_user.id)

    sessions = query.order_by(ChatSession.updated_at.desc()).limit(50).all()

    results = []
    for s in sessions:
        out = ChatSessionOut.model_validate(s)
        out.message_count = len(s.messages) if s.messages else 0
        results.append(out)

    return results


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailOut)
def get_session_detail(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Fetch complete message history for a specific chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )

    # Validate authorization
    if current_user and current_user.role in ["pharmacist", "admin"]:
        user_pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == current_user.id).first()
        if user_pharmacy and session.pharmacy_id != user_pharmacy.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to session from another pharmacy.",
            )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    out = ChatSessionDetailOut.model_validate(session)
    out.message_count = len(messages)
    out.messages = [
        ChatMessageOut(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            message=m.message,
            metadata=m.metadata_json,
            created_at=m.created_at,
        )
        for m in messages
    ]
    return out


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )

    # If pharmacist, must own the pharmacy
    if current_user and current_user.role in ["pharmacist", "admin"]:
        user_pharmacy = db.query(Pharmacy).filter(Pharmacy.owner_user_id == current_user.id).first()
        if user_pharmacy and session.pharmacy_id != user_pharmacy.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to session from another pharmacy.",
            )

    db.delete(session)
    db.commit()
    return None
