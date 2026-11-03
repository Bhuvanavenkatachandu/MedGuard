"""MedGuard AI - Chatbot Prompts Package"""

from backend.features.chatbot.prompts.pharmacy_assistant_prompt import (
    PHARMACY_ASSISTANT_SYSTEM_PROMPT,
    build_system_prompt,
)

__all__ = [
    "PHARMACY_ASSISTANT_SYSTEM_PROMPT",
    "build_system_prompt",
]
