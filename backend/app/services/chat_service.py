"""MedGuard AI - Chat Service

Orchestrates the entire pharmacy assistant conversation flow:
Input Guardrails -> Session Management -> Semantic Cache -> Tools/RAG Context
-> System Prompt Construction -> Model Routing -> LLM Generation -> Output Guardrails
-> Database Persistence.
"""

import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.chat_message import ChatMessage
from backend.app.models.chat_session import ChatSession
from backend.app.models.pharmacy import Pharmacy
from backend.app.prompts.pharmacy_assistant import build_system_prompt
from backend.app.schemas.chat import ChatQueryRequest, ChatQueryResponse
from backend.app.services.guardrail_service import GuardrailService
from backend.app.services.llm_service import LLMService
from backend.app.services.model_router import ModelRouter
from backend.app.services.rag_service import RAGService
from backend.app.services.semantic_cache_service import SemanticCacheService
from backend.app.services.tools_service import ToolsService

logger = logging.getLogger("medguard.chat_service")

# Keywords indicating inventory inquiry
INVENTORY_KEYWORDS = [
    "stock",
    "have",
    "available",
    "price",
    "cost",
    "mrp",
    "quantity",
    "buy",
    "inventory",
    "tablet",
    "capsule",
    "syrup",
    "strip",
    "paracetamol",
    "amoxicillin",
    "dolo",
    "azithromycin",
    "pantoprazole",
]


class ChatService:
    """Manages chat sessions and conversation turns."""

    @classmethod
    async def process_query(
        cls,
        db: Session,
        pharmacy_id: str,
        user_id: Optional[str],
        request: ChatQueryRequest,
        is_pharmacist: bool = False,
    ) -> ChatQueryResponse:
        """
        Execute full conversational turn with strict tenant isolation.
        """
        # 1. Input Guardrails
        is_valid, error_msg = GuardrailService.validate_input(request.message)
        if not is_valid:
            return ChatQueryResponse(
                session_id=request.session_id or "invalid-session",
                role="assistant",
                message=error_msg or "Invalid query.",
                sources=[],
                tools_used=[],
            )

        # 2. Verify Pharmacy Exists
        pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
        if not pharmacy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pharmacy not found.",
            )

        # 3. Session Resolution
        session = None
        if request.session_id:
            session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.id == request.session_id,
                    ChatSession.pharmacy_id == pharmacy_id,
                )
                .first()
            )
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found for this pharmacy.",
                )
        else:
            # Create a new session
            clean_title = request.message[:40] + ("..." if len(request.message) > 40 else "")
            session = ChatSession(
                pharmacy_id=pharmacy_id,
                user_id=user_id,
                title=clean_title,
            )
            db.add(session)
            db.commit()
            db.refresh(session)

        # 4. Check Semantic Cache
        cached_answer = SemanticCacheService.get(pharmacy_id, request.message)
        if cached_answer:
            logger.info("Semantic cache HIT for pharmacy %s", pharmacy_id)
            # Record user message and cached assistant reply to DB
            cls._save_turn(db, session.id, request.message, cached_answer, cached=True)
            return ChatQueryResponse(
                session_id=session.id,
                role="assistant",
                message=cached_answer,
                sources=[],
                tools_used=["semantic_cache"],
                cached=True,
            )

        # 5. Gather Context: Tools & RAG
        tools_used = []
        sources = []
        inventory_context = "No live inventory queried."
        knowledge_context = "No pharmacy documents found."

        # Detect inventory query intent
        lower_query = request.message.lower()
        if any(kw in lower_query for kw in INVENTORY_KEYWORDS):
            # Extract query terms
            search_term = cls._extract_medicine_query(lower_query)
            inv_items = ToolsService.search_inventory(
                db,
                pharmacy_id=pharmacy_id,
                query=search_term,
                is_pharmacist=is_pharmacist,
            )
            tools_used.append("search_inventory")
            if inv_items:
                inventory_context = cls._format_inventory_context(inv_items, is_pharmacist)
            else:
                inventory_context = f"Searched inventory for '{search_term}': 0 matching records found."

        # Search Knowledge Base via RAG
        relevant_chunks = await RAGService.search_relevant_chunks(
            db,
            pharmacy_id=pharmacy_id,
            query=request.message,
            top_k=3,
        )
        if relevant_chunks:
            tools_used.append("rag_knowledge_search")
            kb_lines = []
            for chunk in relevant_chunks:
                kb_lines.append(f"[{chunk['category']}: {chunk['document_title']}]\n{chunk['content']}")
                sources.append({
                    "title": chunk["document_title"],
                    "category": chunk["category"],
                    "score": chunk["score"],
                })
            knowledge_context = "\n\n".join(kb_lines)

        # 6. Build System Prompt & History
        system_prompt = build_system_prompt(
            pharmacy_name=pharmacy.name,
            pharmacy_address=pharmacy.address,
            pharmacy_phone=pharmacy.phone,
            pharmacy_email=pharmacy.email,
            is_pharmacist=is_pharmacist,
            knowledge_context=knowledge_context,
            inventory_context=inventory_context,
        )

        # Fetch recent session history (up to last 6 messages)
        history_msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
            .limit(6)
            .all()
        )
        conv_history = [
            {"role": m.role, "message": m.message}
            for m in history_msgs
        ]

        # 7. Model Router & LLM Generation
        selected_model = ModelRouter.select_model(
            query=request.message,
            has_large_context=len(knowledge_context) > 1000,
        )
        llm_result = await LLMService.generate_response(
            system_prompt=system_prompt,
            user_message=request.message,
            conversation_history=conv_history,
            model_override=selected_model,
        )

        raw_response = llm_result.get("text", "")
        model_used = llm_result.get("model", selected_model)

        # 8. Output Guardrails
        final_answer = GuardrailService.sanitize_output(raw_response)

        # 9. Persist Turn and Cache
        metadata = {
            "sources": sources,
            "tools_used": tools_used,
            "model_used": model_used,
        }
        cls._save_turn(db, session.id, request.message, final_answer, metadata=metadata)

        # Store in Semantic Cache
        SemanticCacheService.set(pharmacy_id, request.message, final_answer)

        return ChatQueryResponse(
            session_id=session.id,
            role="assistant",
            message=final_answer,
            sources=sources,
            tools_used=tools_used,
            model_used=model_used,
            cached=False,
        )

    @classmethod
    def _save_turn(
        cls,
        db: Session,
        session_id: str,
        user_message: str,
        assistant_message: str,
        metadata: Optional[Dict[str, Any]] = None,
        cached: bool = False,
    ) -> None:
        """Persist user and assistant messages in database."""
        user_msg_rec = ChatMessage(
            session_id=session_id,
            role="user",
            message=user_message,
        )
        db.add(user_msg_rec)

        meta = metadata or {}
        if cached:
            meta["cached"] = True

        assistant_msg_rec = ChatMessage(
            session_id=session_id,
            role="assistant",
            message=assistant_message,
            metadata_json=meta,
        )
        db.add(assistant_msg_rec)
        db.commit()

    @staticmethod
    def _extract_medicine_query(query: str) -> str:
        """Extract potential medicine name keywords from question."""
        # Remove common query framing words
        noise = [
            "do you have", "is there", "what is the price of", "price of", "how much is",
            "is", "in stock", "available", "cost of", "can i get", "any", "please",
            "tell me about", "check stock of", "stock of", "medicine",
        ]
        cleaned = query.lower()
        for phrase in sorted(noise, key=len, reverse=True):
            cleaned = cleaned.replace(phrase, " ")

        cleaned = re.sub(r"[^\w\s]", " ", cleaned)
        words = [w.strip() for w in cleaned.split() if len(w.strip()) > 2]
        return " ".join(words) if words else query

    @staticmethod
    def _format_inventory_context(items: List[Dict[str, Any]], is_pharmacist: bool) -> str:
        """Format live inventory query results into a readable context block."""
        lines = []
        for item in items:
            name = item.get("name", "Unknown")
            strength = item.get("strength") or ""
            brand = item.get("brand") or ""
            med_label = f"{name} {strength} ({brand})".strip()

            if is_pharmacist:
                pieces = item.get("total_pieces", 0)
                price = item.get("price_per_strip", 0.0)
                batches = item.get("batches", [])
                batch_summary = ", ".join(f"Batch {b['batch_number']} (exp: {b['expiry_date']}, {b['stock_pieces']} pcs)" for b in batches)
                lines.append(f"- {med_label}: {pieces} pcs in stock, Rs. {price}/strip. [{batch_summary}]")
            else:
                status_str = item.get("status", "Available")
                price = item.get("price_per_strip")
                price_str = f"Rs. {price}/strip" if isinstance(price, (int, float)) else str(price)
                lines.append(f"- {med_label}: Status: {status_str}, Price: {price_str}")

        return "\n".join(lines)
