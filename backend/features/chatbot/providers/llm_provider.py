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
    def _is_empty_context(text: str) -> bool:
        if not text:
            return True
        clean = text.strip().lower()
        empty_markers = {
            "no live inventory queried.",
            "no live inventory queried",
            "no live inventory data queried.",
            "no live inventory data queried",
            "no pharmacy documents found.",
            "no pharmacy documents found",
            "no pharmacy-specific documents found.",
            "no pharmacy-specific documents found",
            "none",
            "0 matching records found.",
        }
        return clean in empty_markers or "0 matching records found" in clean

    @classmethod
    def _generate_offline_fallback(cls, system_prompt: str, user_message: str) -> str:
        """
        Generate an intelligent fallback response using context directly from the prompt
        when cloud API is unavailable, rate-limited, or unconfigured.
        """
        lower_msg = user_message.lower()

        # Extract contexts from system prompt
        inv_text = ""
        if "LIVE INVENTORY CONTEXT:" in system_prompt:
            inv_part = system_prompt.split("LIVE INVENTORY CONTEXT:")[-1]
            inv_text = inv_part.split("=")[0].strip()

        kb_text = ""
        if "KNOWLEDGE BASE CONTEXT:" in system_prompt:
            kb_part = system_prompt.split("KNOWLEDGE BASE CONTEXT:")[-1]
            kb_text = kb_part.split("LIVE INVENTORY CONTEXT:")[0].replace("=", "").strip()

        has_valid_inv = not cls._is_empty_context(inv_text)
        has_valid_kb = not cls._is_empty_context(kb_text)

        # 1. Policy & Operational Guidelines (Priority 1)
        policy_keywords = [
            "return", "refund", "exchange", "cancel", "policy", "policies",
            "opened", "unopened", "strip", "receipt", "bill", "invoice",
            "delivery", "shipping", "deliver", "hours", "timing", "open", "close",
            "rule", "rules", "guideline", "guidelines", "sop"
        ]
        is_policy_query = any(k in lower_msg for k in policy_keywords)

        if is_policy_query:
            if has_valid_kb:
                # If specific to returns / refunds / exchanges
                if any(w in lower_msg for w in ["return", "refund", "exchange", "opened", "strip", "day", "bill", "invoice"]):
                    lines = [line.strip() for line in kb_text.split("\n") if line.strip()]
                    relevant_lines = [
                        l for l in lines
                        if any(w in l.lower() for w in ["return", "refund", "opened", "unopened", "bill", "invoice", "receipt", "unused", "condition", "accept", "policy"])
                        and not l.startswith("[") and not l.lower().startswith("medical shop rules")
                    ]
                    if relevant_lines:
                        points = "\n".join(f"• {l.lstrip('-• 123456789. ')}" for l in relevant_lines[:5])
                        return (
                            f"According to our pharmacy's return policy:\n\n"
                            f"{points}\n\n"
                            f"*(Note: Returns require an original purchase bill/invoice. Opened strips or unsealed medicines cannot be accepted for health and safety compliance.)*"
                        )
                return f"According to our store guidelines:\n\n{kb_text}"
            else:
                return (
                    "I do not have specific return or store policy guidelines recorded for this pharmacy yet. "
                    "Please consult our pharmacy counter staff directly for store policies."
                )

        # 2. Inventory & Stock Inquiries (Priority 2)
        stock_keywords = [
            "stock", "have", "available", "availability", "price", "cost", "mrp", "quantity", "inventory", "buy", "purchase"
        ]
        is_stock_query = any(k in lower_msg for k in stock_keywords)
        if is_stock_query:
            if has_valid_inv:
                return (
                    f"Based on our current records:\n\n"
                    f"{inv_text}\n\n"
                    f"*(Note: Please consult a doctor or pharmacist before taking medications.)*"
                )
            return (
                "I checked our current stock, but that item is not listed in our available inventory right now.\n\n"
                "*(Note: Please consult a licensed doctor or pharmacist for alternative recommendations.)*"
            )

        # 3. General Knowledge Fallback
        if has_valid_kb:
            return f"Here is the relevant information from our pharmacy records:\n\n{kb_text}"

        # 4. Standard Greeting / Prompt
        return (
            "Hello! I am your MedGuard Pharmacy Assistant. I can help you with store policies, "
            "opening hours, delivery options, and checking medicine stock. How may I assist you today?"
        )
