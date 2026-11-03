"""MedGuard AI - Semantic Cache Service

In-memory cache for pharmacy assistant responses.
Enforces strict tenant isolation: every cache entry is keyed by
`{pharmacy_id}:{normalized_query}` so different pharmacies never share responses.
Includes TTL expiration to prevent stale inventory or policy answers.
"""

import re
import time
from typing import Dict, Optional, Tuple


class SemanticCacheService:
    """Fast tenant-isolated cache for frequent customer and pharmacist queries."""

    # Storage structure: {cache_key: (response_text, expire_timestamp)}
    _cache: Dict[str, Tuple[str, float]] = {}
    _max_entries: int = 1000

    @classmethod
    def _normalize_key(cls, pharmacy_id: str, query: str) -> str:
        """Create a consistent normalized key."""
        clean_text = re.sub(r"[^\w\s]", "", (query or "").lower().strip())
        clean_text = re.sub(r"\s+", " ", clean_text)
        return f"{pharmacy_id}:{clean_text}"

    @classmethod
    def get(cls, pharmacy_id: str, query: str) -> Optional[str]:
        """Retrieve cached response if not expired."""
        key = cls._normalize_key(pharmacy_id, query)
        entry = cls._cache.get(key)
        if not entry:
            return None

        response_text, expire_time = entry
        if time.time() > expire_time:
            # Expired
            cls._cache.pop(key, None)
            return None

        return response_text

    @classmethod
    def set(
        cls,
        pharmacy_id: str,
        query: str,
        response_text: str,
        ttl_seconds: int = 300,
    ) -> None:
        """Store response with TTL (default 5 minutes)."""
        if len(cls._cache) >= cls._max_entries:
            # Purge oldest expired or oldest 20%
            now = time.time()
            expired_keys = [k for k, (_, exp) in cls._cache.items() if exp < now]
            for k in expired_keys:
                cls._cache.pop(k, None)
            if len(cls._cache) >= cls._max_entries:
                # Evict first 100 keys
                for k in list(cls._cache.keys())[:100]:
                    cls._cache.pop(k, None)

        key = cls._normalize_key(pharmacy_id, query)
        cls._cache[key] = (response_text, time.time() + ttl_seconds)

    @classmethod
    def clear(cls, pharmacy_id: Optional[str] = None) -> None:
        """Clear cache for a specific pharmacy or all."""
        if pharmacy_id:
            keys_to_remove = [k for k in cls._cache if k.startswith(f"{pharmacy_id}:")]
            for k in keys_to_remove:
                cls._cache.pop(k, None)
        else:
            cls._cache.clear()
