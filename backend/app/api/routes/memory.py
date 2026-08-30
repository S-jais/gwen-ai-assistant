import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.session import get_db
from app.database.models import Memory, User
from app.models.schemas import MemoryCreate, MemoryRead
from app.core.security import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("", response_model=List[MemoryRead])
async def list_memories(
    category: Optional[str] = None,
    memory_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List memory items owned by the authenticated user."""
    query = select(Memory).order_by(Memory.importance.desc(), Memory.created_at.desc())
    if current_user:
        query = query.where(Memory.user_id == current_user.id)
    else:
        query = query.where(Memory.user_id.is_(None))

    if category:
        query = query.where(Memory.category == category)
    if memory_type:
        query = query.where(Memory.memory_type == memory_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=MemoryRead)
async def create_memory(
    payload: MemoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Create a new memory preference or fact tied to the authenticated user."""
    user_id = current_user.id if current_user else None
    mem = Memory(
        user_id=user_id,
        memory_type=payload.memory_type,
        category=payload.category,
        content=payload.content,
        importance=payload.importance,
        metadata_json=payload.metadata_json or {},
    )
    db.add(mem)
    await db.commit()
    await db.refresh(mem)
    return mem


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Delete a memory item owned by the active user."""
    stmt = select(Memory).where(Memory.id == memory_id)
    if current_user:
        stmt = stmt.where(Memory.user_id == current_user.id)

    res = await db.execute(stmt)
    mem = res.scalar_one_or_none()
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found or access denied")

    await db.delete(mem)
    await db.commit()
    return {"success": True, "memory_id": memory_id}
