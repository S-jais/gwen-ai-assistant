import pytest
from app.agents.document import DocumentAgent
from app.agents.research import ResearchAgent
from app.agents.planner import PlannerAgent
from app.agents.coding import CodingAgent
from app.agents.manager import ManagerAgent
from app.database.session import init_db


def test_manager_fast_path_detection():
    assert ManagerAgent.is_fast_path_request("Hello GWEN") is True
    assert ManagerAgent.is_fast_path_request("Explain recursion") is True
    assert ManagerAgent.is_fast_path_request("Research React Server Components") is False
    assert ManagerAgent.is_fast_path_request("Create a study schedule") is False
    assert ManagerAgent.is_fast_path_request("Explain my PDF", document_ids=["doc-1"]) is False


@pytest.mark.asyncio
async def test_coding_agent_analysis():
    agent = CodingAgent()
    res = await agent.run(
        objective="Explain and generate a Python binary search function",
        context={"code": "def binary_search(arr, x):\n    pass", "language": "python"},
    )
    assert res["status"] == "COMPLETED"
    assert "code_output" in res
    assert res["analysis"]["valid_syntax"] is True


@pytest.mark.asyncio
async def test_planner_agent_study_plan():
    await init_db()
    agent = PlannerAgent()
    res = await agent.run(
        objective="Create a 10-day preparation schedule for Database Systems exam",
        context={
            "extracted_knowledge": "Focus on Normalization 1NF-BCNF, ACID transactions, and B+ Trees",
            "research_summary": "Top resources include GeeksforGeeks DBMS and Gate Smashers",
        },
    )
    assert res["status"] == "COMPLETED"
    if await agent.provider.is_available():
        assert len(res["tasks_created"]) >= 1
    else:
        assert res["tasks_created"] == []
    assert "plan_summary" in res


@pytest.mark.asyncio
async def test_research_agent():
    agent = ResearchAgent()
    res = await agent.run(
        objective="Find resources for database normalization",
        context={"search_query": "database normalization 1NF 2NF 3NF BCNF"},
    )
    assert res["status"] == "COMPLETED"
    assert "research_summary" in res
    assert "sources" in res
