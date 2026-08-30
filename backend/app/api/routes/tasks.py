import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database.session import get_db
from app.database.models import Task, User
from app.models.schemas import TaskCreate, TaskUpdate, TaskRead
from app.core.security import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskRead])
async def list_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List tasks owned by the current user."""
    query = select(Task).order_by(Task.day_number.asc().nulls_last(), Task.created_at.desc())
    if current_user:
        query = query.where(Task.user_id == current_user.id)
    else:
        query = query.where(Task.user_id.is_(None))

    if status and status != "all":
        query = query.where(Task.status == status)
    if priority and priority != "all":
        query = query.where(Task.priority == priority)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TaskRead)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Create a new task tied to the authenticated user."""
    user_id = current_user.id if current_user else None
    task = Task(
        title=payload.title,
        user_id=user_id,
        description=payload.description or "",
        priority=payload.priority,
        status=payload.status,
        deadline=payload.deadline,
        day_number=payload.day_number,
        agent_source=payload.agent_source or "user",
        parent_task_id=payload.parent_task_id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Update a task owned by the active user."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user:
        stmt = stmt.where(Task.user_id == current_user.id)
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.status is not None:
        task.status = payload.status
        if payload.status == "completed":
            task.completed_at = datetime.utcnow()
        elif payload.status != "completed":
            task.completed_at = None
    if payload.deadline is not None:
        task.deadline = payload.deadline
    if payload.day_number is not None:
        task.day_number = payload.day_number

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Delete a task owned by the active user."""
    stmt = select(Task).where(Task.id == task_id)
    if current_user:
        stmt = stmt.where(Task.user_id == current_user.id)
    res = await db.execute(stmt)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found or access denied")

    await db.delete(task)
    await db.commit()
    return {"success": True, "task_id": task_id}
