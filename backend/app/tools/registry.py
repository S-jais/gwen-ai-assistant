import logging
from typing import Dict, List, Optional, Any
from app.tools.base import BaseTool, ToolDefinition
from app.tools.web_search import WebSearchTool, FetchWebpageTool
from app.tools.task_tools import CreateTaskTool, GetTasksTool, UpdateTaskTool
from app.tools.doc_tools import SearchDocumentsTool
from app.tools.memory_tools import SaveMemoryTool, SearchMemoryTool
from app.tools.code_tools import AnalyzeCodeTool

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Central registry of tools with granular capability permissions."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        default_tools = [
            WebSearchTool(),
            FetchWebpageTool(),
            CreateTaskTool(),
            GetTasksTool(),
            UpdateTaskTool(),
            SearchDocumentsTool(),
            SaveMemoryTool(),
            SearchMemoryTool(),
            AnalyzeCodeTool(),
        ]
        for tool in default_tools:
            self.register(tool)

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def list_tools(self) -> List[ToolDefinition]:
        return [tool.get_definition() for tool in self._tools.values()]

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        agent_permissions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        tool = self.get_tool(tool_name)
        if not tool:
            return {"success": False, "error": f"Tool '{tool_name}' not found."}

        # Check permissions
        if agent_permissions is not None:
            for req_perm in tool.required_permissions:
                if req_perm not in agent_permissions:
                    return {
                        "success": False,
                        "error": f"Permission denied. Agent lacks permission '{req_perm}' required by tool '{tool_name}'.",
                    }

        try:
            result = await tool.execute(**arguments)
            return result
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return {"success": False, "error": str(e)}


tool_registry = ToolRegistry()
