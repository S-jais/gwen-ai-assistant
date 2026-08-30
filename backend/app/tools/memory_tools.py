import logging
from typing import Any, Dict, List, Optional
from app.tools.base import BaseTool, ToolDefinition, ToolParameter
from app.memory.manager import memory_manager

logger = logging.getLogger(__name__)


class SaveMemoryTool(BaseTool):
    name = "save_memory"
    description = "Save an important user preference, study habit, or fact to long-term memory."
    required_permissions = ["memory_write"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="content", type="string", description="The preference or fact to remember (e.g. 'Prefers study sessions after 7 PM')", required=True),
                ToolParameter(name="category", type="string", description="Category: 'preference', 'fact', 'goal', 'habit'", required=False, default="preference"),
                ToolParameter(name="importance", type="integer", description="Importance rating from 1 (minor) to 5 (critical)", required=False, default=3),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, content: str, category: str = "preference", importance: int = 3, **kwargs: Any) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        result = await memory_manager.save_preference(
            content=content, category=category, importance=importance, user_id=user_id
        )
        return {"success": True, "memory": result}


class SearchMemoryTool(BaseTool):
    name = "search_memory"
    description = "Recall saved user preferences and persistent facts."
    required_permissions = ["memory_read"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="category", type="string", description="Optional category filter", required=False, default=None),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(self, category: Optional[str] = None, **kwargs: Any) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        memories = await memory_manager.get_long_term_memories(category=category, user_id=user_id)
        return {"success": True, "count": len(memories), "memories": memories}
