"""MedGuard AI - Model Router

Dynamically selects the optimal model (fast flash model vs comprehensive Gemma/Pro model)
based on the complexity, intent, and length of the user query.
"""

from backend.app.config import settings

COMPLEX_INDICATORS = [
    "compare",
    "difference",
    "sop",
    "procedure",
    "protocol",
    "contraindication",
    "interaction",
    "regulation",
    "compliance",
    "audit",
    "dispute",
]


class ModelRouter:
    """Routes queries to appropriate model tier."""

    @staticmethod
    def select_model(query: str, has_large_context: bool = False) -> str:
        """
        Choose model for request.
        
        Simple queries -> gemini-2.0-flash / gemini-1.5-flash (fast, lower latency)
        Complex multi-step or policy reasoning -> GEMMA_MODEL or gemini-1.5-pro
        """
        text = (query or "").lower().strip()

        # If long query or mentions complex reasoning keywords
        if len(text) > 250 or has_large_context or any(ind in text for ind in COMPLEX_INDICATORS):
            return settings.GEMMA_MODEL or "gemini-1.5-pro"

        # Default to lightweight fast flash model
        return settings.FALLBACK_VISION_MODEL or "gemini-3.8-flash"
