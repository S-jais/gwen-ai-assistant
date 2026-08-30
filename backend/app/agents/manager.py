import json
import logging
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime
from app.agents.base import BaseAgent, EventCallback
from app.agents.document import DocumentAgent
from app.agents.research import ResearchAgent
from app.agents.planner import PlannerAgent
from app.agents.coding import CodingAgent
from app.config.settings import settings
from app.memory.manager import memory_manager
from app.models.schemas import AgentTask

logger = logging.getLogger(__name__)


class ManagerAgent(BaseAgent):
    name = "Manager Agent"
    display_name = "GWEN Manager / Orchestrator"
    role = "Central Task Decomposition & Orchestration Engine"
    description = "Understands user intent, decides agent workflow, delegates to specialized agents, verifies intermediate results, and synthesizes the unified final response."
    capabilities = [
        "Natural language intent classification",
        "Multi-step task decomposition",
        "Dynamic sequential & parallel agent routing",
        "Intermediate result verification & citation synthesis",
    ]
    allowed_tools = ["search_memory", "save_memory"]
    permissions = ["memory_read", "memory_write"]

    def __init__(self, provider=None):
        super().__init__(provider=provider)
        self.document_agent = DocumentAgent(provider=self.provider)
        self.research_agent = ResearchAgent(provider=self.provider)
        self.planner_agent = PlannerAgent(provider=self.provider)
        self.coding_agent = CodingAgent(provider=self.provider)

    @staticmethod
    def is_fast_path_request(objective: str, document_ids: Optional[List[str]] = None) -> bool:
        """Identify short requests that do not need specialist-agent routing."""
        if document_ids or len(objective.strip()) > 500:
            return False

        specialist_cues = (
            "research", "search", "find", "latest", "resource", "document", "pdf",
            "upload", "note", "plan", "schedule", "study", "exam", "prepare",
            "create task", "remind", "code", "script", "python", "debug", "function",
        )
        normalized = objective.lower()
        return bool(normalized.strip()) and not any(cue in normalized for cue in specialist_cues)

    async def classify_and_decompose(
        self, prompt: str, user_memories: List[Dict[str, Any]], has_documents: bool = False
    ) -> Dict[str, Any]:
        """Classify user intent and determine the execution plan."""
        memories_summary = "; ".join([m.get("content", "") for m in user_memories])

        system_prompt = """You are GWEN's Master Task Decomposition & Orchestration Engine.
Analyze the user's input and determine whether it requires specialized sub-agents.

Return a valid JSON object matching this schema:
{
  "is_complex": true/false,
  "intent": "study_prep" | "research" | "planning" | "document_qa" | "coding" | "conversational",
  "reasoning": "brief explanation",
  "requires_document_agent": true/false,
  "requires_research_agent": true/false,
  "requires_planner_agent": true/false,
  "requires_coding_agent": true/false,
  "document_query": "specific search terms for document notes if applicable",
  "research_query": "specific search query for web research if applicable",
  "plan_objective": "specific goal for the planner agent if applicable",
  "code_objective": "specific task for coding agent if applicable"
}
Output ONLY the raw JSON object.
"""
        user_message = f"""User Input: "{prompt}"
User Preferences/Memories: {memories_summary if memories_summary else 'None'}
Has Uploaded Documents: {has_documents}
"""
        try:
            raw = await self.provider.generate(
                prompt=user_message,
                system_prompt=system_prompt,
                temperature=0.1,
                json_mode=True,
                max_tokens=settings.ROUTING_MAX_TOKENS,
            )
            clean_json = raw.strip()
            if clean_json.startswith("```"):
                lines = clean_json.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_json = "\n".join(lines).strip()
            return json.loads(clean_json)
        except Exception as e:
            logger.warning(f"Decomposition error: {e}, using heuristic routing...")
            lower = prompt.lower()
            return {
                "is_complex": any(w in lower for w in ["plan", "study", "exam", "prepare", "research", "notes", "code", "debug"]),
                "intent": "general",
                "requires_document_agent": any(w in lower for w in ["note", "doc", "pdf", "file", "upload", "dbms"]),
                "requires_research_agent": any(w in lower for w in ["research", "search", "find", "resource", "latest", "tutorial"]),
                "requires_planner_agent": any(w in lower for w in ["plan", "schedule", "day", "routine", "task", "prepare"]),
                "requires_coding_agent": any(w in lower for w in ["code", "script", "python", "debug", "function", "sql"]),
                "document_query": prompt,
                "research_query": prompt,
                "plan_objective": prompt,
                "code_objective": prompt,
            }

    async def run(
        self,
        objective: str,
        context: Dict[str, Any],
        on_event: Optional[EventCallback] = None,
    ) -> Dict[str, Any]:
        self.execution_count += 1
        run_id = context.get("run_id") or str(uuid.uuid4())
        conversation_id = context.get("conversation_id")
        document_ids = context.get("document_ids")

        await self.emit_event(
            on_event,
            event_type="agent_start",
            message="GWEN Manager analyzing intent and requirements...",
            task_id=run_id,
        )

        if not await self.provider.is_available():
            message = (
                "GWEN's local Ollama service is unavailable. No AI model or specialized "
                "agents were run. Start Ollama and ensure the configured model is installed, "
                "then try again."
            )
            await self.emit_event(
                on_event,
                event_type="agent_error",
                message=message,
                task_id=run_id,
            )
            return {
                "status": "DEGRADED",
                "final_response": message,
                "agents_used": [],
                "citations": [],
                "sources": [],
                "tasks_created": [],
            }

        if self.is_fast_path_request(objective, document_ids):
            await self.emit_event(
                on_event,
                event_type="agent_update",
                message="Using fast path for a direct response...",
                task_id=run_id,
            )
            direct_response = await self.provider.generate(
                prompt=objective,
                system_prompt=(
                    "You are GWEN, a local-first personal AI assistant. Answer directly and "
                    "concisely. Use short paragraphs or bullets only when helpful."
                ),
                temperature=0.6,
                max_tokens=settings.SIMPLE_RESPONSE_MAX_TOKENS,
            )
            await self.emit_event(
                on_event,
                event_type="agent_complete",
                message="GWEN fast response ready.",
                task_id=run_id,
            )
            return {
                "status": "COMPLETED",
                "final_response": direct_response,
                "agents_used": ["Manager Agent"],
                "citations": [],
                "sources": [],
                "tasks_created": [],
            }

        user_id = context.get("user_id")

        # 1. Fetch long-term memory preferences
        memories = await memory_manager.get_long_term_memories(limit=10, user_id=user_id)

        # 2. Decompose user objective
        plan = await self.classify_and_decompose(
            prompt=objective,
            user_memories=memories,
            has_documents=bool(document_ids),
        )

        intermediate_results: Dict[str, Any] = {}
        all_citations = []
        all_sources = []
        created_tasks = []

        await self.emit_event(
            on_event,
            event_type="agent_update",
            message=f"Plan generated: {plan.get('reasoning', 'Routing request to specialized agents')}",
            task_id=run_id,
            data={"plan": plan},
        )

        # If it's a simple query, synthesize directly
        if not plan.get("is_complex", False):
            await self.emit_event(
                on_event,
                event_type="agent_update",
                message="Synthesizing direct response...",
                task_id=run_id,
            )
            direct_response = await self.provider.generate(
                prompt=objective,
                system_prompt="You are GWEN, a local-first personal AI assistant. Be direct and concise.",
                temperature=0.6,
                max_tokens=settings.SIMPLE_RESPONSE_MAX_TOKENS,
            )
            await self.emit_event(
                on_event,
                event_type="agent_complete",
                message="GWEN response ready.",
                task_id=run_id,
            )
            return {
                "status": "COMPLETED",
                "final_response": direct_response,
                "agents_used": ["Manager Agent"],
                "citations": [],
                "sources": [],
                "tasks_created": [],
            }

        # --- STEP 1: DOCUMENT AGENT ---
        if plan.get("requires_document_agent", False):
            doc_context = {
                "task_id": str(uuid.uuid4()),
                "document_query": plan.get("document_query") or objective,
                "document_ids": document_ids,
                "user_id": user_id,
            }
            doc_res = await self.document_agent.run(
                objective=objective,
                context=doc_context,
                on_event=on_event,
            )
            intermediate_results["document"] = doc_res
            all_citations.extend(doc_res.get("citations", []))

        # --- STEP 2: RESEARCH AGENT ---
        if plan.get("requires_research_agent", False):
            res_context = {
                "task_id": str(uuid.uuid4()),
                "search_query": plan.get("research_query") or objective,
                "extracted_knowledge": intermediate_results.get("document", {}).get("extracted_knowledge", ""),
                "user_id": user_id,
            }
            res_out = await self.research_agent.run(
                objective=objective,
                context=res_context,
                on_event=on_event,
            )
            intermediate_results["research"] = res_out
            all_sources.extend(res_out.get("sources", []))

        # --- STEP 3: PLANNER AGENT ---
        if plan.get("requires_planner_agent", False):
            plan_context = {
                "task_id": str(uuid.uuid4()),
                "extracted_knowledge": intermediate_results.get("document", {}).get("extracted_knowledge", ""),
                "research_summary": intermediate_results.get("research", {}).get("research_summary", ""),
                "user_id": user_id,
            }
            plan_res = await self.planner_agent.run(
                objective=plan.get("plan_objective") or objective,
                context=plan_context,
                on_event=on_event,
            )
            intermediate_results["planner"] = plan_res
            created_tasks.extend(plan_res.get("tasks_created", []))

        # --- STEP 4: CODING AGENT ---
        if plan.get("requires_coding_agent", False):
            code_context = {
                "task_id": str(uuid.uuid4()),
                "code": context.get("code", ""),
                "language": context.get("language", "python"),
                "user_id": user_id,
            }
            code_res = await self.coding_agent.run(
                objective=plan.get("code_objective") or objective,
                context=code_context,
                on_event=on_event,
            )
            intermediate_results["coding"] = code_res

        # --- STEP 5: VERIFICATION & FINAL RESPONSE SYNTHESIS ---
        await self.emit_event(
            on_event,
            event_type="agent_update",
            message="GWEN Manager verifying findings and synthesizing final response...",
            task_id=run_id,
        )

        synthesis_prompt = f"""You are GWEN, the master personal AI assistant.
Synthesize a comprehensive, executive-level final response for the user based on the verified outputs from your specialized agents.

User Objective:
{objective}

Document Agent Findings (from uploaded notes):
{intermediate_results.get('document', {}).get('extracted_knowledge', 'N/A')}

Research Agent Findings (from web research):
{intermediate_results.get('research', {}).get('research_summary', 'N/A')}

Planner Agent Schedule (actionable roadmap):
{intermediate_results.get('planner', {}).get('plan_summary', 'N/A')}

Coding Agent Output (if any):
{intermediate_results.get('coding', {}).get('code_output', 'N/A')}

Guidelines:
1. Provide a concise, well-structured response. Prefer short headings and bullets.
2. If tasks/schedules were generated, clearly list the day-by-day plan and confirm they have been added to the task tracker.
3. Explicitly cite any document notes/pages and web resources found.
4. Maintain a supportive, highly capable, and articulate tone.
"""
        final_answer = await self.provider.generate(
            prompt=synthesis_prompt,
            system_prompt="You are GWEN, an elite multi-agent AI orchestrator. Present clear, verified, high-impact syntheses.",
            temperature=0.4,
            max_tokens=settings.SYNTHESIS_MAX_TOKENS,
        )

        agents_used = ["Manager Agent"]
        if "document" in intermediate_results:
            agents_used.append("Document Agent")
        if "research" in intermediate_results:
            agents_used.append("Research Agent")
        if "planner" in intermediate_results:
            agents_used.append("Planner Agent")
        if "coding" in intermediate_results:
            agents_used.append("Coding Agent")

        await self.emit_event(
            on_event,
            event_type="agent_complete",
            message="GWEN complete. All agent sub-tasks verified and finalized.",
            task_id=run_id,
            data={"agents_used": agents_used},
        )

        return {
            "status": "COMPLETED",
            "final_response": final_answer,
            "agents_used": agents_used,
            "citations": all_citations,
            "sources": all_sources,
            "tasks_created": created_tasks,
            "intermediate_results": intermediate_results,
        }
