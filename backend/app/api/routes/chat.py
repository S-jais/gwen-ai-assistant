import json
import asyncio
import uuid
import logging
from typing import AsyncGenerator, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.session import get_db, async_session_factory
from app.database.models import Conversation, Message, AgentRun, User
from app.models.schemas import (
    MessageCreate,
    MessageRead,
    ConversationCreate,
    ConversationRead,
    AgentStreamEvent,
)
from app.agents.manager import ManagerAgent
from app.core.security import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List all active conversations for the authenticated user."""
    stmt = select(Conversation).order_by(Conversation.updated_at.desc())
    if current_user:
        stmt = stmt.where(Conversation.user_id == current_user.id)
    else:
        stmt = stmt.where(Conversation.user_id.is_(None))

    res = await db.execute(stmt)
    convs = res.scalars().all()
    out = []
    for c in convs:
        count_stmt = select(Message).where(Message.conversation_id == c.id)
        count_res = await db.execute(count_stmt)
        msg_count = len(count_res.scalars().all())
        out.append(ConversationRead(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=msg_count,
        ))
    return out


@router.post("/conversations", response_model=ConversationRead)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Create a new conversation session tied to the active user."""
    user_id = current_user.id if current_user else None
    conv = Conversation(
        title=payload.title or "New Conversation",
        user_id=user_id,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationRead(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageRead])
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Retrieve message history for a conversation owned by the current user."""
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    if current_user:
        conv_stmt = conv_stmt.where(Conversation.user_id == current_user.id)
    conv_res = await db.execute(conv_stmt)
    if not conv_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    stmt = select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Delete a conversation owned by the active user."""
    stmt = select(Conversation).where(Conversation.id == conversation_id)
    if current_user:
        stmt = stmt.where(Conversation.user_id == current_user.id)
    res = await db.execute(stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied")

    await db.delete(conv)
    await db.commit()
    return {"success": True, "conversation_id": conversation_id}


@router.post("/stream")
async def stream_chat(
    payload: MessageCreate,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Real-time SSE streaming endpoint for multi-agent execution with user context."""
    user_id = current_user.id if current_user else None
    conversation_id = payload.conversation_id

    if not conversation_id:
        async with async_session_factory() as db:
            title = (payload.content[:35] + "...") if len(payload.content) > 35 else payload.content
            conv = Conversation(title=title, user_id=user_id)
            db.add(conv)
            await db.commit()
            await db.refresh(conv)
            conversation_id = conv.id

    # Persist user message
    async with async_session_factory() as db:
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=payload.content,
            metadata_json={"document_ids": payload.document_ids or [], "user_id": user_id},
        )
        db.add(user_msg)
        await db.commit()

    async def event_generator() -> AsyncGenerator[dict, None]:
        event_queue = asyncio.Queue()

        async def queue_event_callback(event: AgentStreamEvent):
            await event_queue.put(event)

        # Initial connect event
        yield {
            "event": "connected",
            "data": json.dumps({"conversation_id": conversation_id}),
        }

        # Run manager agent in background task
        manager = ManagerAgent()
        run_task = asyncio.create_task(
            manager.run(
                objective=payload.content,
                context={
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "document_ids": payload.document_ids or [],
                },
                on_event=queue_event_callback,
            )
        )

        final_result = None
        while not run_task.done() or not event_queue.empty():
            try:
                event: AgentStreamEvent = await asyncio.wait_for(event_queue.get(), timeout=0.1)
                yield {
                    "event": event.event_type,
                    "data": json.dumps({
                        "agent_name": event.agent_name,
                        "task_id": event.task_id,
                        "message": event.message,
                        "data": event.data,
                        "timestamp": event.timestamp.isoformat(),
                    }),
                }
            except asyncio.TimeoutError:
                await asyncio.sleep(0.02)
            except Exception as e:
                logger.warning(f"Error in SSE stream loop: {e}")

        try:
            final_result = await run_task
        except Exception as e:
            logger.error(f"Error in manager run: {e}")
            final_result = {
                "status": "FAILED",
                "final_response": f"An error occurred while executing the multi-agent task: {str(e)}",
                "agents_used": ["Manager Agent"],
            }

        # Persist assistant message
        async with async_session_factory() as db:
            assistant_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=final_result.get("final_response", ""),
                agent_name="GWEN Manager",
                metadata_json={
                    "agents_used": final_result.get("agents_used", []),
                    "citations": final_result.get("citations", []),
                    "sources": final_result.get("sources", []),
                    "tasks_created": final_result.get("tasks_created", []),
                    "user_id": user_id,
                },
            )
            db.add(assistant_msg)
            await db.commit()

        # Send final complete payload
        yield {
            "event": "final_result",
            "data": json.dumps({
                "conversation_id": conversation_id,
                "content": final_result.get("final_response", ""),
                "agents_used": final_result.get("agents_used", []),
                "citations": final_result.get("citations", []),
                "sources": final_result.get("sources", []),
                "tasks_created": final_result.get("tasks_created", []),
            }),
        }

    return EventSourceResponse(event_generator())
