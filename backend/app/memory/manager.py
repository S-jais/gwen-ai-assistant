import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select, delete
from app.database.session import async_session_factory
from app.database.models import Memory, Message
from app.documents.vector_store import vector_store

logger = logging.getLogger(__name__)


class MemoryManager:
    """3-Tier Memory Engine:
    1. Short-Term: Active conversation messages
    2. Long-Term: Persistent user preferences, profile facts, habits (isolated per user)
    3. Knowledge: Semantic document retrieval (isolated per user)
    """

    # --- Short-Term Memory ---
    async def get_conversation_history(
        self, conversation_id: str, limit: int = 12
    ) -> List[Dict[str, str]]:
        if not conversation_id:
            return []
        async with async_session_factory() as session:
            stmt = (
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at.desc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            messages = result.scalars().all()
            return [
                {"role": m.role, "content": m.content, "agent_name": m.agent_name or ""}
                for m in reversed(messages)
            ]

    # --- Long-Term Memory ---
    async def save_preference(
        self,
        content: str,
        category: str = "preference",
        importance: int = 3,
        metadata_json: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        async with async_session_factory() as session:
            mem = Memory(
                memory_type="long_term",
                user_id=user_id,
                category=category,
                content=content,
                importance=importance,
                metadata_json=metadata_json or {},
            )
            session.add(mem)
            await session.commit()
            await session.refresh(mem)
            return {
                "id": mem.id,
                "content": mem.content,
                "category": mem.category,
                "importance": mem.importance,
                "user_id": mem.user_id,
                "created_at": mem.created_at.isoformat(),
            }

    async def get_long_term_memories(
        self,
        category: Optional[str] = None,
        limit: int = 20,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        async with async_session_factory() as session:
            query = (
                select(Memory)
                .where(Memory.memory_type == "long_term")
                .order_by(Memory.importance.desc(), Memory.created_at.desc())
                .limit(limit)
            )
            if user_id:
                query = query.where(Memory.user_id == user_id)
            else:
                query = query.where(Memory.user_id.is_(None))

            if category:
                query = query.where(Memory.category == category)

            result = await session.execute(query)
            mems = result.scalars().all()
            return [
                {
                    "id": m.id,
                    "content": m.content,
                    "category": m.category,
                    "importance": m.importance,
                    "user_id": m.user_id,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in mems
            ]

    async def delete_memory(self, memory_id: str, user_id: Optional[str] = None) -> bool:
        async with async_session_factory() as session:
            stmt = delete(Memory).where(Memory.id == memory_id)
            if user_id:
                stmt = stmt.where(Memory.user_id == user_id)
            res = await session.execute(stmt)
            await session.commit()
            return res.rowcount > 0

    # --- Knowledge Memory ---
    async def query_knowledge(
        self,
        query: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return await vector_store.search(
            query=query, top_k=top_k, document_ids=document_ids, user_id=user_id
        )


memory_manager = MemoryManager()
