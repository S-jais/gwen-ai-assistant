from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolParameter(BaseModel):
    name: str
    type: str
    description: str
    required: bool = True
    default: Optional[Any] = None


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: List[ToolParameter] = Field(default_factory=list)
    required_permissions: List[str] = Field(default_factory=list)


class BaseTool(ABC):
    """Abstract Base Class for all GWEN Agent Tools."""

    name: str
    description: str
    required_permissions: List[str] = []

    @abstractmethod
    def get_definition(self) -> ToolDefinition:
        """Return the schema definition for this tool."""
        pass

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        """Execute the tool with validated arguments."""
        pass
