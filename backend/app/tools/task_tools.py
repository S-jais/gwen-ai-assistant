import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update, delete
from app.tools.base import BaseTool, ToolDefinition, ToolParameter
from app.database.session import async_session_factory
from app.database.models import Task

logger = logging.getLogger(__name__)


class CreateTaskTool(BaseTool):
    name = "create_task"
    description = "Create a new task, study session, or action item in the user's task tracker."
    required_permissions = ["task_write"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="title", type="string", description="Clear, actionable title of the task", required=True),
                ToolParameter(name="description", type="string", description="Detailed instructions, sub-steps or context", required=False, default=""),
                ToolParameter(name="priority", type="string", description="Priority level: 'low', 'medium', 'high', 'urgent'", required=False, default="medium"),
                ToolParameter(name="deadline", type="string", description="Target date or time (e.g. 'Day 1', '2026-09-01', 'Tomorrow 5 PM')", required=False, default=None),
                ToolParameter(name="day_number", type="integer", description="Day number in a structured schedule (e.g. 1 to 10)", required=False, default=None),
                ToolParameter(name="agent_source", type="string", description="Name of the agent creating this task", required=False, default="Planner Agent"),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(
        self,
        title: str,
        description: str = "",
        priority: str = "medium",
        deadline: Optional[str] = None,
        day_number: Optional[int] = None,
        agent_source: str = "Planner Agent",
        **kwargs: Any
    ) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        async with async_session_factory() as session:
            task = Task(
                title=title,
                user_id=user_id,
                description=description,
                priority=priority.lower(),
                status="pending",
                deadline=deadline,
                day_number=day_number,
                agent_source=agent_source,
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)

            return {
                "success": True,
                "task_id": task.id,
                "title": task.title,
                "priority": task.priority,
                "deadline": task.deadline,
                "day_number": task.day_number,
                "status": task.status,
            }


class GetTasksTool(BaseTool):
    name = "get_tasks"
    description = "Retrieve list of current tasks filtered by status or priority."
    required_permissions = ["task_read"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="status", type="string", description="Filter by status ('pending', 'in_progress', 'completed', or 'all')", required=False, default="all"),
                ToolParameter(name="limit", type="integer", description="Max tasks to return", required=False, default=50),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, status: str = "all", limit: int = 50, **kwargs: Any) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        async with async_session_factory() as session:
            query = select(Task).order_by(Task.day_number.asc().nulls_last(), Task.created_at.desc()).limit(limit)
            if user_id:
                query = query.where(Task.user_id == user_id)
            else:
                query = query.where(Task.user_id.is_(None))

            if status != "all":
                query = query.where(Task.status == status)

            result = await session.execute(query)
            tasks = result.scalars().all()

            return {
                "count": len(tasks),
                "tasks": [
                    {
                        "id": t.id,
                        "title": t.title,
                        "description": t.description,
                        "priority": t.priority,
                        "status": t.status,
                        "deadline": t.deadline,
                        "day_number": t.day_number,
                        "agent_source": t.agent_source,
                        "created_at": t.created_at.isoformat() if t.created_at else None,
                    }
                    for t in tasks
                ],
                "success": True,
            }


class UpdateTaskTool(BaseTool):
    name = "update_task"
    description = "Update the status, priority, or deadline of an existing task."
    required_permissions = ["task_write"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="task_id", type="string", description="ID of the task to update", required=True),
                ToolParameter(name="status", type="string", description="New status: 'pending', 'in_progress', 'completed', 'cancelled'", required=False),
                ToolParameter(name="priority", type="string", description="New priority: 'low', 'medium', 'high', 'urgent'", required=False),
                ToolParameter(name="title", type="string", description="New task title", required=False),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, task_id: str, status: Optional[str] = None, priority: Optional[str] = None, title: Optional[str] = None, **kwargs: Any) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        async with async_session_factory() as session:
            stmt = select(Task).where(Task.id == task_id)
            if user_id:
                stmt = stmt.where(Task.user_id == user_id)
            res = await session.execute(stmt)
            task = res.scalar_one_or_none()
            if not task:
                return {"success": False, "error": f"Task {task_id} not found."}

            if status:
                task.status = status
                if status == "completed":
                    task.completed_at = datetime.utcnow()
            if priority:
                task.priority = priority
            if title:
                task.title = title

            await session.commit()
            return {"success": True, "task_id": task.id, "status": task.status}
