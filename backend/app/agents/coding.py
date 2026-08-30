import logging
from typing import Any, Dict, List, Optional
from app.agents.base import BaseAgent, EventCallback

logger = logging.getLogger(__name__)


class CodingAgent(BaseAgent):
    name = "Coding Agent"
    display_name = "Code Architect"
    role = "Code Analysis, Debugging & Generation"
    description = "Specializes in code explanation, safe syntax validation, refactoring, algorithms, and sandbox-safe code generation."
    capabilities = [
        "Safe static code syntax inspection",
        "Multi-language code generation (Python, JS/TS, SQL, Rust, C++)",
        "Bug diagnosis and optimization diffs",
    ]
    allowed_tools = ["analyze_code"]
    permissions = ["code_read"]

    async def run(
        self,
        objective: str,
        context: Dict[str, Any],
        on_event: Optional[EventCallback] = None,
    ) -> Dict[str, Any]:
        self.execution_count += 1
        task_id = context.get("task_id", "")

        await self.emit_event(
            on_event,
            event_type="agent_start",
            message="Coding Agent analyzing code & technical requirements...",
            task_id=task_id,
        )

        code_snippet = context.get("code") or ""
        language = context.get("language") or "python"

        analysis_result = {}
        if code_snippet:
            analysis_result = await self.execute_tool(
                tool_name="analyze_code",
                arguments={"code": code_snippet, "language": language},
                on_event=on_event,
                task_id=task_id,
            )

        prompt = f"""You are GWEN's Expert Software Engineering & Coding Agent.
Objective / Query:
{objective}

Code Context (if provided):
{code_snippet if code_snippet else "None provided."}

Static Syntax Analysis:
{analysis_result if analysis_result else "N/A"}

Please provide:
1. Clear, production-ready code with concise comments.
2. An explanation of how the logic works.
3. Edge case considerations and time/space complexity analysis if applicable.
"""
        response_text = await self.provider.generate(
            prompt=prompt,
            system_prompt="You are a senior full-stack engineer and algorithm specialist. Deliver clean, secure, idiomatically typed code.",
            temperature=0.2,
        )

        await self.emit_event(
            on_event,
            event_type="agent_complete",
            message="Coding Agent finished code generation & verification.",
            task_id=task_id,
        )

        return {
            "status": "COMPLETED",
            "code_output": response_text,
            "analysis": analysis_result,
        }
