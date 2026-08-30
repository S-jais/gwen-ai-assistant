import json
import logging
from typing import Any, Dict, List, Optional
from app.agents.base import BaseAgent, EventCallback

logger = logging.getLogger(__name__)


class PlannerAgent(BaseAgent):
    name = "Planner Agent"
    display_name = "Strategic Planner"
    role = "Task Decomposition & Schedule Orchestration"
    description = "Breaks high-level goals into prioritized, actionable milestones, study schedules, and executable tasks with strict deadlines."
    capabilities = [
        "Multi-day study plan generation",
        "Milestone prioritization and deadline calculation",
        "Direct task creation into the task tracker",
    ]
    allowed_tools = ["create_task", "get_tasks", "update_task"]
    permissions = ["task_read", "task_write"]

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
            message="Planner Agent formulating structured roadmap...",
            task_id=task_id,
        )

        extracted_notes = context.get("extracted_knowledge", "")
        research_notes = context.get("research_summary", "")

        prompt = f"""You are GWEN's Strategic Planner Agent.
Your goal is to build a realistic, high-impact schedule or action plan.

User Objective:
{objective}

Context from Uploaded Notes/Documents:
{extracted_notes if extracted_notes else "No specific document context."}

Context from Web Research:
{research_notes if research_notes else "No specific web research context."}

Create a structured plan. Return your response as a valid JSON object matching this schema:
{{
  "plan_title": "string",
  "overview": "string",
  "total_days": 10,
  "daily_schedule": [
    {{
      "day": 1,
      "title": "Topic / Focus",
      "tasks": ["Task 1", "Task 2"],
      "priority": "high",
      "resources_or_notes": "string"
    }}
  ]
}}
IMPORTANT: Output ONLY the raw JSON object without markdown fences or extraneous text.
"""
        created_tasks = []
        try:
            raw_response = await self.provider.generate(
                prompt=prompt,
                system_prompt="You are a master productivity planner. Output strictly valid JSON.",
                temperature=0.3,
                json_mode=True,
            )

            # Clean JSON if wrapped in markdown fences
            clean_json = raw_response.strip()
            if clean_json.startswith("```"):
                lines = clean_json.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_json = "\n".join(lines).strip()

            plan_data = json.loads(clean_json)

            # Create tasks in database
            schedule = plan_data.get("daily_schedule", [])
            for item in schedule:
                day_num = item.get("day", 1)
                day_title = item.get("title", f"Day {day_num}")
                tasks_list = item.get("tasks", [])
                priority = item.get("priority", "medium")
                notes = item.get("resources_or_notes", "")

                task_desc = f"Focus: {day_title}\n"
                if tasks_list:
                    task_desc += "Action Items:\n" + "\n".join([f"- {t}" for t in tasks_list])
                if notes:
                    task_desc += f"\nNotes: {notes}"

                t_res = await self.execute_tool(
                    tool_name="create_task",
                    arguments={
                        "title": f"Day {day_num}: {day_title}",
                        "description": task_desc,
                        "priority": priority,
                        "deadline": f"Day {day_num}",
                        "day_number": day_num,
                        "agent_source": "Planner Agent",
                    },
                    on_event=on_event,
                    task_id=task_id,
                )
                if t_res.get("success"):
                    created_tasks.append(t_res)

            plan_summary = f"### {plan_data.get('plan_title', 'Strategic Plan')}\n\n{plan_data.get('overview', '')}\n\n"
            for item in schedule:
                plan_summary += f"#### Day {item.get('day')}: {item.get('title')}\n"
                for t in item.get("tasks", []):
                    plan_summary += f"- [ ] {t}\n"
                if item.get("resources_or_notes"):
                    plan_summary += f"  *Notes:* {item.get('resources_or_notes')}\n"
                plan_summary += "\n"

        except Exception as e:
            logger.warning(f"Error parsing Planner JSON: {e}, falling back to text plan...")
            # Fallback text plan
            plan_summary = f"Created a structured plan for '{objective}'. 10-day milestone tracker initialized."
            # Create a fallback task
            t_res = await self.execute_tool(
                tool_name="create_task",
                arguments={
                    "title": f"Plan: {objective[:50]}",
                    "description": objective,
                    "priority": "high",
                    "deadline": "Day 1-10",
                    "day_number": 1,
                    "agent_source": "Planner Agent",
                },
                on_event=on_event,
                task_id=task_id,
            )
            created_tasks.append(t_res)

        await self.emit_event(
            on_event,
            event_type="agent_complete",
            message=f"Planner Agent scheduled {len(created_tasks)} tasks.",
            task_id=task_id,
            data={"tasks_created": len(created_tasks)},
        )

        return {
            "status": "COMPLETED",
            "plan_summary": plan_summary,
            "tasks_created": created_tasks,
            "task_count": len(created_tasks),
        }
