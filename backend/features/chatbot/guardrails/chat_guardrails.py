"""MedGuard AI - Guardrail Service

Implements input and output safety checks:
1. Input Guardrails:
   - Length constraints
   - Prompt injection patterns
   - Malicious/harmful instruction filtering
2. Output Guardrails:
   - Secret/token scrubbing
   - Mandatory medical disclaimer injection if dosage discussed
"""

import logging
import re
from typing import Optional, Tuple

logger = logging.getLogger("medguard.guardrail_service")

# Prompt injection signatures
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|above)\s+instructions", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(dan|an\s+unfiltered|jailbroken)", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(hidden|internal|system)\s+(instructions|prompt)", re.IGNORECASE),
    re.compile(r"bypass\s+(safety|all|security)\s+filters", re.IGNORECASE),
    re.compile(r"act\s+as\s+developer\s+mode", re.IGNORECASE),
]

# Sensitive pattern regexes to scrub from output
SECRET_PATTERNS = [
    re.compile(r"ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),  # JWT
    re.compile(r"(?:api[_-]?key|secret|password)\s*[:=]\s*['\"][A-Za-z0-9_\-]{8,}['\"]", re.IGNORECASE),
    re.compile(r"postgres(?:ql)?://[^\s]+", re.IGNORECASE),  # DB connection string
]

MEDICAL_DISCLAIMER = "\n\n*(Note: This information is for educational purposes only. Please consult a qualified doctor or pharmacist before starting or modifying any treatment.)*"


class GuardrailService:
    """Validates inputs and sanitized outputs for the pharmacy chatbot."""

    @classmethod
    def validate_input(cls, user_message: str) -> Tuple[bool, Optional[str]]:
        """
        Validate incoming user message.
        Returns:
            (is_valid, error_message_if_invalid)
        """
        text = (user_message or "").strip()

        if not text:
            return False, "Message cannot be empty."

        if len(text) > 2000:
            return False, "Message exceeds the maximum permitted length of 2000 characters."

        # Check for prompt injection attempts
        for pattern in INJECTION_PATTERNS:
            if pattern.search(text):
                logger.warning("Prompt injection blocked: %s", text[:100])
                return False, "Invalid query. Your message contains patterns that are not permitted."

        return True, None

    @classmethod
    def sanitize_output(cls, assistant_response: str) -> str:
        """
        Sanitize assistant output before returning to user:
        1. Scrub any leaked secrets or tokens.
        2. Ensure medical educational disclaimer is present if medicines/dosages are discussed.
        """
        sanitized = assistant_response or ""

        # Scrub sensitive tokens/DB strings
        for pattern in SECRET_PATTERNS:
            sanitized = pattern.sub("[REDACTED]", sanitized)

        # Ensure disclaimer if medication or dosage was mentioned
        has_medical_topic = any(
            w in sanitized.lower()
            for w in ["dosage", "prescribe", "treatment", "take tablet", "mg per day", "side effect"]
        )
        if has_medical_topic and "consult a" not in sanitized.lower():
            sanitized += MEDICAL_DISCLAIMER

        return sanitized.strip()


# Alias for feature-based architecture
ChatGuardrails = GuardrailService
