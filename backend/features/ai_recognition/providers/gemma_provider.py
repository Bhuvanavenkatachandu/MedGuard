"""MedGuard AI - Gemma Vision Provider (AI Recognition Feature)"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from backend.shared.config import settings
from backend.features.ai_recognition.prompts import GEMMA_PROMPT

logger = logging.getLogger("medguard.gemma_provider")


class GemmaVisionProvider:
    """Manages pharmaceutical vision API fallback requests."""

    @staticmethod
    def models_to_try() -> List[str]:
        configured = [settings.PRIMARY_VISION_MODEL, settings.FALLBACK_VISION_MODEL, settings.GEMMA_MODEL]
        defaults = [
            "gemini-flash-lite-latest",
            "gemini-3.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemma-4-26b-a4b-it",
            "gemini-3.8-flash",
        ]
        return list(dict.fromkeys(model for model in configured + defaults if model))

    @staticmethod
    def parse_ai_response(text: str) -> Dict[str, Any]:
        """Convert Gemma's JSON text into a dictionary."""
        if not text:
            return {}

        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        try:
            return json.loads(cleaned.strip())
        except (json.JSONDecodeError, TypeError):
            return {"raw": text}

    @classmethod
    async def call_gemma_vision(
        cls,
        image_base64_clean: str,
        mime_type: str,
        targeted_context: str,
        gemma_api_key: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], str, str]:
        """Call configured vision models until one returns usable structured text."""
        api_key = (gemma_api_key or settings.GEMMA_API_KEY or "").strip()
        prompt = f"{GEMMA_PROMPT}\n\n--- OCR CONTEXT ---\n{targeted_context}\n"
        raw_response = ""
        error = ""

        if not api_key:
            return {}, "", "No GEMMA_API_KEY configured."

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model in cls.models_to_try():
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model}:generateContent?key={api_key}"
                )
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": mime_type,
                                        "data": image_base64_clean,
                                    }
                                },
                            ]
                        }
                    ],
                    "generationConfig": {
                        "response_mime_type": "application/json",
                        "temperature": 0.1,
                    },
                }

                try:
                    response = await client.post(url, json=payload)
                    if response.status_code != 200:
                        error = f"{model} status {response.status_code}: {response.text[:200]}"
                        continue

                    data = response.json()
                    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                    raw_response = parts[0].get("text", "") if parts else ""
                    if raw_response:
                        break
                except Exception as exc:
                    error = str(exc)

        return cls.parse_ai_response(raw_response), raw_response, error
