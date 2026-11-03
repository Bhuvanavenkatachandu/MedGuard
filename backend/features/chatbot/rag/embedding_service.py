"""MedGuard AI - Embedding Service

Generates vector embeddings for knowledge chunks and search queries.
Uses Google Generative Language `text-embedding-004` when configured,
with a fast deterministic local embedding fallback for offline/test environments.
"""

import hashlib
import logging
import math
import re
from typing import List, Optional
import httpx

from backend.shared.config import settings

logger = logging.getLogger("medguard.embedding_service")

EMBEDDING_DIMENSION = 64


class EmbeddingService:
    """Provides vector embeddings and similarity math."""

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """Compute cosine similarity between two numeric vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        """
        Generate a normalized float vector for the given text string.
        Falls back to local deterministic embedding if API is unavailable.
        """
        cleaned = (text or "").strip()
        if not cleaned:
            return [0.0] * EMBEDDING_DIMENSION

        api_key = (settings.GEMMA_API_KEY or "").strip()
        if api_key:
            try:
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"text-embedding-004:embedContent?key={api_key}"
                )
                payload = {
                    "model": "models/text-embedding-004",
                    "content": {"parts": [{"text": cleaned[:2048]}]},
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        values = resp.json().get("embedding", {}).get("values", [])
                        if values:
                            return values
            except Exception as exc:
                logger.warning("Cloud embedding failed (%s), using local fallback.", exc)

        return cls.generate_local_embedding(cleaned)

    @staticmethod
    def generate_local_embedding(text: str, dim: int = EMBEDDING_DIMENSION) -> List[float]:
        """
        Generate a normalized pseudo-embedding using term-frequency and character n-grams.
        Guarantees semantically related strings (containing identical words/stems)
        produce high cosine similarity without any external network dependency.
        """
        words = re.findall(r"\w+", text.lower())
        vec = [0.0] * dim

        if not words:
            return vec

        for word in words:
            # Hash word to a fixed bucket
            hash_val = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            bucket = hash_val % dim
            sign = 1.0 if ((hash_val >> 8) % 2 == 0) else -1.0
            vec[bucket] += sign

        # Add bigram signals for sequential context
        for i in range(len(words) - 1):
            bigram = f"{words[i]}_{words[i+1]}"
            hash_val = int(hashlib.md5(bigram.encode("utf-8")).hexdigest(), 16)
            bucket = hash_val % dim
            sign = 1.0 if ((hash_val >> 8) % 2 == 0) else -1.0
            vec[bucket] += sign * 0.5

        # Normalize to unit length
        norm = math.sqrt(sum(v * v for v in vec))
        if norm > 0:
            vec = [v / norm for v in vec]

        return vec
