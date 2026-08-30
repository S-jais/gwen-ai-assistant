import logging
from typing import List
from fastapi import APIRouter
from app.models.schemas import AgentInfo
from app.agents.manager import ManagerAgent
from app.agents.document import DocumentAgent
from app.agents.research import ResearchAgent
from app.agents.planner import PlannerAgent
from app.agents.coding import CodingAgent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=List[AgentInfo])
async def list_agents():
    agents_list = [
        ManagerAgent(),
        DocumentAgent(),
        ResearchAgent(),
        PlannerAgent(),
        CodingAgent(),
    ]
    return [
        AgentInfo(
            name=a.name,
            display_name=a.display_name,
            role=a.role,
            description=a.description,
            capabilities=a.capabilities,
            tools=a.allowed_tools,
            status="idle",
            execution_count=a.execution_count,
        )
        for a in agents_list
    ]
