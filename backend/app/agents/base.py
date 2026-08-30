import logging
import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Callable, Awaitable
from datetime import datetime
from app.models.schemas import AgentTask, AgentStreamEvent
from app.providers.factory import get_llm_provider
from app.providers.base import BaseLLMProvider
from app.tools.registry import tool_registry

logger = logging.getLogger(__name__)

# Callback type for real-time SSE event publishing
EventCallback = Callable[[AgentStreamEvent], Awaitable[None]]


class BaseAgent(ABC):
    """Abstract Base Agent for GWEN multi-agent framework."""

    name: str
    display_name: str
    role: str
    description: str
    capabilities: List[str]
    allowed_tools: List[str]
    permissions: List[str]

    def __init__(self, provider: Optional[BaseLLMProvider] = None):
        self.provider = provider or get_llm_provider()
        self.execution_count: int = 0

    @abstractmethod
    async def run(
        self,
        objective: str,
        context: Dict[str, Any],
        on_event: Optional[EventCallback] = None,
    ) -> Dict[str, Any]:
        """Execute the agent's specialized task."""
        pass

    async def emit_event(
        self,
        on_event: Optional[EventCallback],
        event_type: str,
        message: str,
        task_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ):
        """Emit a structured real-time progress event for SSE streaming."""
        if on_event:
            event = AgentStreamEvent(
                event_type=event_type,
                agent_name=self.name,
                task_id=task_id,
                message=message,
                data=data or {},
                timestamp=datetime.utcnow(),
            )
            try:
                await on_event(event)
            except Exception as e:
                logger.warning(f"Error publishing SSE event: {e}")

    async def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        on_event: Optional[EventCallback] = None,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute a tool while enforcing agent permissions."""
        if tool_name not in self.allowed_tools:
            return {
                "success": False,
                "error": f"Security violation: Agent '{self.name}' is not authorized to use tool '{tool_name}'.",
            }

        await self.emit_event(
            on_event,
            event_type="tool_start",
            message=f"Executing tool: {tool_name}",
            task_id=task_id,
            data={"tool": tool_name, "arguments": arguments},
        )

        result = await tool_registry.execute_tool(
            tool_name=tool_name,
            arguments=arguments,
            agent_permissions=self.permissions,
        )

        await self.emit_event(
            on_event,
            event_type="tool_end",
            message=f"Tool {tool_name} completed",
            task_id=task_id,
            data={"tool": tool_name, "success": result.get("success", False)},
        )

        return result
