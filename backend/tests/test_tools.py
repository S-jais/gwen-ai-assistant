import pytest
from app.tools.registry import tool_registry
from app.tools.code_tools import AnalyzeCodeTool
from app.tools.task_tools import CreateTaskTool, GetTasksTool
from app.tools.web_search import WebSearchTool
from app.database.session import init_db


@pytest.mark.asyncio
async def test_tool_registry_registration():
    tools = tool_registry.list_tools()
    assert len(tools) >= 6
    names = [t.name for t in tools]
    assert "web_search" in names
    assert "create_task" in names
    assert "get_tasks" in names
    assert "search_documents" in names
    assert "analyze_code" in names


@pytest.mark.asyncio
async def test_analyze_code_tool():
    tool = AnalyzeCodeTool()
    valid_python = """
def calculate_closure(attributes, functional_dependencies):
    closure = set(attributes)
    changed = True
    while changed:
        changed = False
        for lhs, rhs in functional_dependencies:
            if set(lhs).issubset(closure) and not set(rhs).issubset(closure):
                closure.update(rhs)
                changed = True
    return closure
"""
    result = await tool.execute(code=valid_python, language="python")
    assert result["success"] is True
    assert result["valid_syntax"] is True
    assert "calculate_closure" in result["functions_found"]


@pytest.mark.asyncio
async def test_task_tools():
    await init_db()
    create_tool = CreateTaskTool()
    get_tool = GetTasksTool()

    created = await create_tool.execute(
        title="Study Normalization 1NF to BCNF",
        description="Review attribute closures",
        priority="high",
        deadline="Day 4",
        day_number=4,
    )
    assert created["success"] is True
    assert created["title"] == "Study Normalization 1NF to BCNF"

    fetched = await get_tool.execute()
    assert fetched["success"] is True
    assert fetched["count"] >= 1
