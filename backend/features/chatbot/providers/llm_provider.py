"""MedGuard AI - LLM Service

Centralized LLM client for Google Generative AI / Gemma models.
Provides unified text generation with automated model fallback,
timeout management, and graceful offline fallback for testing/dev environments.
"""

import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from backend.shared.config import settings

logger = logging.getLogger("medguard.llm_service")

# Candidate models in order of priority (fastest/most reliable first)
CHAT_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    settings.FALLBACK_VISION_MODEL or "gemini-1.5-flash",
    settings.GEMMA_MODEL,
    "gemini-1.5-pro",
]


class LLMService:
    """Manages chat completions via Google Generative AI REST endpoint."""

    @staticmethod
    def _get_api_key() -> str:
        """Fetch API key from settings."""
        return (settings.GEMMA_API_KEY or "").strip()

    @classmethod
    async def generate_response(
        cls,
        system_prompt: str,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        model_override: Optional[str] = None,
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Generate response from LLM using Google Generative AI API.

        Returns:
            Dict with:
                - text: generated assistant reply
                - model: model used
                - error: optional error string
        """
        api_key = cls._get_api_key()
        conversation_history = conversation_history or []

        # If no API key is configured (e.g. in development/testing without keys),
        # return a high-quality contextual fallback based on the system prompt context.
        if not api_key:
            logger.info("No GEMMA_API_KEY configured; using offline fallback response.")
            return {
                "text": cls._generate_offline_fallback(system_prompt, user_message),
                "model": "offline-fallback",
                "error": None,
            }

        models_to_try = [model_override] if model_override else [m for m in CHAT_MODELS if m]

        # Format Gemini contents payload
        contents = []
        for msg in conversation_history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("message") or msg.get("content", "")}],
            })

        # Append current user message
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}],
        })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}],
            },
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 1024,
            },
        }

        last_error = None
        async with httpx.AsyncClient(timeout=10.0) as client:
            for model in models_to_try:
                url = (
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                    f"?key={api_key}"
                )
                try:
                    response = await client.post(url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            text = parts[0].get("text", "").strip() if parts else ""
                            if text:
                                return {
                                    "text": text,
                                    "model": model,
                                    "error": None,
                                }
                    else:
                        last_error = f"{model} returned status {response.status_code}: {response.text[:200]}"
                        logger.warning("LLM API call failed: %s", last_error)
                        if response.status_code in (400, 401, 403):
                            # API key invalid or unauthorized; fallback immediately
                            break
                except Exception as exc:
                    last_error = str(exc)
                    logger.warning("LLM call exception on %s: %s", model, exc)

        logger.error("All LLM models failed. Using offline fallback. Last error: %s", last_error)
        return {
            "text": cls._generate_offline_fallback(system_prompt, user_message),
            "model": "offline-fallback",
            "error": last_error,
        }

    @staticmethod
    def _generate_offline_fallback(system_prompt: str, user_message: str) -> str:
        """
        Generate an intelligent fallback response using context directly from the prompt
        when cloud API is unavailable or unconfigured.
        """
        lower_msg = user_message.lower()

        # Check for inventory context in system prompt
        has_inventory = "LIVE INVENTORY CONTEXT:" in system_prompt
        has_knowledge = "KNOWLEDGE BASE CONTEXT:" in system_prompt

        # Extract contexts
        inv_text = ""
        if has_inventory:
            inv_part = system_prompt.split("LIVE INVENTORY CONTEXT:")[-1]
            inv_text = inv_part.split("=")[0].strip()

        kb_text = ""
        if has_knowledge:
            kb_part = system_prompt.split("KNOWLEDGE BASE CONTEXT:")[-1]
            kb_text = kb_part.split("LIVE INVENTORY CONTEXT:")[0].replace("=", "").strip()

        # If user asks about medicines/stock
        if any(w in lower_msg for w in ["stock", "have", "available", "price", "inventory", "medicine"]):
            if inv_text and inv_text != "No live inventory data queried." and inv_text != "None":
                return f"Based on our current records:\n\n{inv_text}\n\n*(Note: Please consult a doctor or pharmacist before taking medications.)*"
            return (
                "I checked our current stock, but that item is not listed in our available inventory right now.\n\n"
                "*(Note: Please consult a licensed doctor or pharmacist for alternative recommendations.)*"
            )

        # If user asks about return/refund/delivery policies
        if any(w in lower_msg for w in ["return", "refund", "exchange", "policy", "delivery", "shipping", "hours", "timing", "open"]):
            if kb_text and kb_text != "No pharmacy-specific documents found." and kb_text != "None":
                return f"Here is the policy information from our store guidelines:\n\n{kb_text}"
            return (
                "I do not have specific information regarding that policy for this pharmacy. "
                "Please consult our pharmacy staff directly for clarification."
            )

        # General helpful fallback
        if kb_text and kb_text != "No pharmacy-specific documents found." and kb_text != "None":
            return f"Here is the relevant information from our pharmacy records:\n\n{kb_text}"

        return (
            "Hello! I am your MedGuard Pharmacy Assistant. I can help you with store policies, "
            "opening hours, delivery options, and checking medicine stock. How may I assist you today?"
        )
