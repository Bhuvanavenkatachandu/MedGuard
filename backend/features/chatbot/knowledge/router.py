"""MedGuard AI - Knowledge Base Router

REST endpoints for pharmacists to create, upload, retrieve, update,
and delete pharmacy-specific knowledge documents and SOPs.
Strictly restricted to authenticated pharmacists for their own pharmacy.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.shared.database import get_db
from backend.shared.auth.dependencies import get_current_pharmacy, get_current_user
from backend.features.pharmacy.models import Pharmacy
from backend.features.auth.models import User
from backend.features.chatbot.knowledge.schemas import (
    KnowledgeDocumentCreate,
    KnowledgeDocumentOut,
    KnowledgeDocumentUpdate,
)
from backend.features.chatbot.knowledge.service import KnowledgeService

router = APIRouter(prefix="/api/knowledge", tags=["Knowledge Base"])


@router.get("", response_model=List[KnowledgeDocumentOut])
def list_documents(
    category: Optional[str] = None,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve all knowledge documents registered for the current pharmacy."""
    docs = KnowledgeService.list_documents(db, pharmacy_id=pharmacy.id, category=category)
    results = []
    for d in docs:
        out = KnowledgeDocumentOut.model_validate(d)
        out.chunk_count = len(d.chunks) if d.chunks else 0
        results.append(out)
    return results


@router.post("", response_model=KnowledgeDocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    data: KnowledgeDocumentCreate,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new knowledge document and index its vector embeddings."""
    doc = await KnowledgeService.create_document(
        db=db,
        pharmacy_id=pharmacy.id,
        user_id=current_user.id,
        data=data,
    )
    out = KnowledgeDocumentOut.model_validate(doc)
    out.chunk_count = len(doc.chunks) if doc.chunks else 0
    return out


@router.post("/upload", response_model=KnowledgeDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    category: Optional[str] = Form("OTHER"),
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a policy document (.txt, .pdf, or .docx).
    Extracts text automatically, indexes chunks, and saves to knowledge base.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # Max 10MB limit
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds maximum limit of 10 MB.",
        )

    extracted_text = KnowledgeService.extract_text_from_file(file_bytes, file.filename or "document.txt")

    doc_title = (title or "").strip()
    if not doc_title:
        # Use filename as title without extension
        doc_title = (file.filename or "Uploaded Document").rsplit(".", 1)[0].replace("_", " ").title()

    doc_data = KnowledgeDocumentCreate(
        title=doc_title,
        category=(category or "OTHER").upper().strip(),
        content=extracted_text,
    )

    doc = await KnowledgeService.create_document(
        db=db,
        pharmacy_id=pharmacy.id,
        user_id=current_user.id,
        data=doc_data,
    )
    out = KnowledgeDocumentOut.model_validate(doc)
    out.chunk_count = len(doc.chunks) if doc.chunks else 0
    return out


@router.get("/{document_id}", response_model=KnowledgeDocumentOut)
def get_document(
    document_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Retrieve a single knowledge document for the authenticated pharmacy."""
    doc = KnowledgeService.get_document(db, pharmacy_id=pharmacy.id, document_id=document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge document not found.",
        )
    out = KnowledgeDocumentOut.model_validate(doc)
    out.chunk_count = len(doc.chunks) if doc.chunks else 0
    return out


@router.put("/{document_id}", response_model=KnowledgeDocumentOut)
async def update_document(
    document_id: str,
    data: KnowledgeDocumentUpdate,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Update a knowledge document and re-index vector embeddings if text changed."""
    doc = await KnowledgeService.update_document(
        db=db,
        pharmacy_id=pharmacy.id,
        document_id=document_id,
        data=data,
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge document not found.",
        )
    out = KnowledgeDocumentOut.model_validate(doc)
    out.chunk_count = len(doc.chunks) if doc.chunks else 0
    return out


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    pharmacy: Pharmacy = Depends(get_current_pharmacy),
    db: Session = Depends(get_db),
):
    """Delete a knowledge document and all its embedded chunks."""
    deleted = KnowledgeService.delete_document(
        db=db,
        pharmacy_id=pharmacy.id,
        document_id=document_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge document not found.",
        )
    return None
