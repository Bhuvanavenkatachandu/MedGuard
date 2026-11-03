"""MedGuard AI - RAG Service

Handles text chunking, embedding generation, and vector retrieval
strictly scoped by `pharmacy_id` to ensure absolute tenant isolation.
"""

import logging
import re
from typing import Any, Dict, List, Tuple
from sqlalchemy.orm import Session

from backend.features.chatbot.models import KnowledgeChunk, KnowledgeDocument
from backend.features.chatbot.rag.embedding_service import EmbeddingService

logger = logging.getLogger("medguard.rag_service")


class RAGService:
    """Retrieval-Augmented Generation service scoped by pharmacy."""

    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    SIMILARITY_THRESHOLD: float = 0.15

    STOPWORDS = {
        "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
        "by", "from", "is", "are", "was", "were", "be", "been", "can", "could", "should",
        "would", "i", "we", "you", "they", "it", "my", "your", "after", "before", "about"
    }

    @staticmethod
    def _stem(word: str) -> str:
        w = word.lower().strip()
        if len(w) > 4 and w.endswith("ies"):
            return w[:-3] + "y"
        if len(w) > 4 and w.endswith("ing"):
            return w[:-3]
        if len(w) > 3 and w.endswith("ed"):
            return w[:-2]
        if len(w) > 3 and w.endswith("s"):
            return w[:-1]
        return w

    @classmethod
    def chunk_text(cls, text: str) -> List[str]:
        """
        Split document text into overlapping chunks respecting sentence/paragraph breaks.
        """
        cleaned = re.sub(r"\r\n", "\n", (text or "").strip())
        if not cleaned:
            return []

        # Split by double newline first to preserve paragraphs
        paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
        chunks = []

        current_chunk = ""
        for para in paragraphs:
            if len(current_chunk) + len(para) <= cls.CHUNK_SIZE:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # If paragraph itself exceeds CHUNK_SIZE, slice by sentences
                if len(para) > cls.CHUNK_SIZE:
                    sentences = re.split(r"(?<=[.!?])\s+", para)
                    sub_chunk = ""
                    for s in sentences:
                        if len(sub_chunk) + len(s) <= cls.CHUNK_SIZE:
                            sub_chunk = f"{sub_chunk} {s}".strip()
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk)
                            sub_chunk = s
                    if sub_chunk:
                        current_chunk = sub_chunk
                else:
                    current_chunk = para

        if current_chunk:
            chunks.append(current_chunk)

        # Fallback if text couldn't be cleanly chunked by paragraphs
        if not chunks and cleaned:
            for i in range(0, len(cleaned), cls.CHUNK_SIZE - cls.CHUNK_OVERLAP):
                chunks.append(cleaned[i : i + cls.CHUNK_SIZE])

        return [c.strip() for c in chunks if len(c.strip()) > 10]

    @classmethod
    async def search_relevant_chunks(
        cls,
        db: Session,
        pharmacy_id: str,
        query: str,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        """
        Search and retrieve the most relevant knowledge chunks for a pharmacy.
        Strictly filters `KnowledgeChunk.pharmacy_id == pharmacy_id`.
        """
        clean_query = (query or "").strip()
        if not clean_query:
            return []

        # 1. Fetch all chunks for this pharmacy only
        chunks = (
            db.query(KnowledgeChunk)
            .filter(KnowledgeChunk.pharmacy_id == pharmacy_id)
            .all()
        )

        if not chunks:
            return []

        # 2. Compute query embedding
        query_vec = await EmbeddingService.get_embedding(clean_query)

        # 3. Score chunks using cosine similarity + keyword overlap boost
        scored: List[Tuple[float, KnowledgeChunk]] = []
        all_candidates: List[Tuple[float, KnowledgeChunk]] = []
        
        query_raw = re.findall(r"\w+", clean_query.lower())
        query_words = set(cls._stem(w) for w in query_raw if w not in cls.STOPWORDS and len(w) > 1)

        for chunk in chunks:
            sim = 0.0
            if chunk.embedding and isinstance(chunk.embedding, list):
                sim = EmbeddingService.cosine_similarity(query_vec, chunk.embedding)

            # Keyword presence boost
            chunk_raw = re.findall(r"\w+", chunk.content.lower())
            chunk_words = set(cls._stem(w) for w in chunk_raw)
            overlap = len(query_words.intersection(chunk_words))
            overlap_score = min(overlap * 0.15, 0.6)

            total_score = (sim * 0.5) + (overlap_score * 0.5)
            all_candidates.append((total_score, chunk))

            if total_score >= cls.SIMILARITY_THRESHOLD or overlap >= 1:
                scored.append((total_score, chunk))

        # If strict threshold didn't capture chunks but chunks exist, take best candidate
        if not scored and all_candidates:
            all_candidates.sort(key=lambda x: x[0], reverse=True)
            if all_candidates[0][0] > -0.2:
                scored = all_candidates[:top_k]

        # Sort descending by score
        scored.sort(key=lambda x: x[0], reverse=True)

        # 4. Format top_k results
        results = []
        for score, chunk in scored[:top_k]:
            doc_title = chunk.document.title if chunk.document else "Pharmacy Policy"
            doc_category = chunk.document.category if chunk.document else "POLICY"
            results.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "document_title": doc_title,
                "category": doc_category,
                "content": chunk.content,
                "score": round(score, 3),
            })

        return results


# Alias for feature-based architecture
RetrievalService = RAGService
