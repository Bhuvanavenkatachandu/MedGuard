"""MedGuard AI - Knowledge Service

Manages pharmacy knowledge documents and files (txt, pdf, docx).
Performs automatic text extraction, chunking, and embedding generation
strictly partitioned by `pharmacy_id`.
"""

import io
import logging
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.features.chatbot.models import KnowledgeChunk, KnowledgeDocument
from backend.features.chatbot.knowledge.schemas import KnowledgeDocumentCreate, KnowledgeDocumentUpdate
from backend.features.chatbot.rag.embedding_service import EmbeddingService
from backend.features.chatbot.rag.retrieval_service import RAGService
from backend.features.chatbot.rag.semantic_cache import SemanticCacheService

logger = logging.getLogger("medguard.knowledge_service")


class KnowledgeService:
    """Orchestrates document CRUD, text extraction, and vector index updates."""

    @classmethod
    def extract_text_from_file(cls, file_bytes: bytes, filename: str) -> str:
        """
        Extract clean text from uploaded files (.txt, .pdf, .docx).
        Raises HTTPException if file is unsupported or unreadable.
        """
        lower_name = (filename or "").lower()

        try:
            if lower_name.endswith(".txt"):
                try:
                    return file_bytes.decode("utf-8").strip()
                except UnicodeDecodeError:
                    return file_bytes.decode("latin-1").strip()

            elif lower_name.endswith(".pdf"):
                import pypdf
                pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                extracted = "\n\n".join(pages_text).strip()
                if not extracted:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The uploaded PDF does not contain readable text.",
                    )
                return extracted

            elif lower_name.endswith(".docx"):
                import docx
                doc = docx.Document(io.BytesIO(file_bytes))
                paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
                extracted = "\n\n".join(paragraphs).strip()
                if not extracted:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The uploaded Word document contains no readable text.",
                    )
                return extracted

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file format. Please upload a .txt, .pdf, or .docx file.",
                )

        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to parse document %s: %s", filename, exc)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read file: {str(exc)}",
            )

    @classmethod
    async def create_document(
        cls,
        db: Session,
        pharmacy_id: str,
        user_id: Optional[str],
        data: KnowledgeDocumentCreate,
    ) -> KnowledgeDocument:
        """Create a knowledge document and asynchronously index its chunks."""
        doc = KnowledgeDocument(
            pharmacy_id=pharmacy_id,
            title=data.title.strip(),
            category=data.category.upper().strip() if data.category else "OTHER",
            content=data.content.strip(),
            created_by=user_id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Chunk and index embeddings
        await cls._index_document_chunks(db, doc)

        # Invalidate cached chat answers for this pharmacy since knowledge changed
        SemanticCacheService.clear(pharmacy_id=pharmacy_id)

        return doc

    @classmethod
    async def _index_document_chunks(cls, db: Session, doc: KnowledgeDocument) -> None:
        """Split document text into chunks and generate vector embeddings."""
        chunks_text = RAGService.chunk_text(doc.content)

        for text_chunk in chunks_text:
            embedding = await EmbeddingService.get_embedding(text_chunk)
            chunk_rec = KnowledgeChunk(
                document_id=doc.id,
                pharmacy_id=doc.pharmacy_id,
                content=text_chunk,
                embedding=embedding,
            )
            db.add(chunk_rec)

        db.commit()

    @classmethod
    def list_documents(
        cls,
        db: Session,
        pharmacy_id: str,
        category: Optional[str] = None,
    ) -> List[KnowledgeDocument]:
        """Fetch all documents for a given pharmacy."""
        query = db.query(KnowledgeDocument).filter(
            KnowledgeDocument.pharmacy_id == pharmacy_id
        )
        if category:
            query = query.filter(KnowledgeDocument.category == category.upper())
        return query.order_by(KnowledgeDocument.updated_at.desc()).all()

    @classmethod
    def get_document(
        cls,
        db: Session,
        pharmacy_id: str,
        document_id: str,
    ) -> Optional[KnowledgeDocument]:
        """Fetch a single document strictly verifying pharmacy ownership."""
        return (
            db.query(KnowledgeDocument)
            .filter(
                KnowledgeDocument.id == document_id,
                KnowledgeDocument.pharmacy_id == pharmacy_id,
            )
            .first()
        )

    @classmethod
    async def update_document(
        cls,
        db: Session,
        pharmacy_id: str,
        document_id: str,
        data: KnowledgeDocumentUpdate,
    ) -> Optional[KnowledgeDocument]:
        """Update document attributes and re-index chunks if content changed."""
        doc = cls.get_document(db, pharmacy_id, document_id)
        if not doc:
            return None

        content_changed = False
        if data.title is not None:
            doc.title = data.title.strip()
        if data.category is not None:
            doc.category = data.category.upper().strip()
        if data.content is not None and data.content.strip() != doc.content:
            doc.content = data.content.strip()
            content_changed = True

        db.commit()

        if content_changed:
            # Delete old chunks
            db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc.id).delete()
            db.commit()
            # Re-index
            await cls._index_document_chunks(db, doc)

        SemanticCacheService.clear(pharmacy_id=pharmacy_id)
        return doc

    @classmethod
    def delete_document(
        cls,
        db: Session,
        pharmacy_id: str,
        document_id: str,
    ) -> bool:
        """Delete a document and its cascade chunks."""
        doc = cls.get_document(db, pharmacy_id, document_id)
        if not doc:
            return False

        db.delete(doc)
        db.commit()
        SemanticCacheService.clear(pharmacy_id=pharmacy_id)
        return True
