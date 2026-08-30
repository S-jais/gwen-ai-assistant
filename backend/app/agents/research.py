import logging
from typing import Any, Dict, List, Optional
from app.agents.base import BaseAgent, EventCallback

logger = logging.getLogger(__name__)


class ResearchAgent(BaseAgent):
    name = "Research Agent"
    display_name = "Web & Knowledge Researcher"
    role = "Information Gathering & Web Search"
    description = "Searches the web for up-to-date resources, documentation, tutorials, and articles with full source citations."
    capabilities = [
        "Free web search via DuckDuckGo / knowledge APIs",
        "Web page content extraction and summarization",
        "High-quality resource compilation and citation",
    ]
    allowed_tools = ["web_search", "fetch_webpage"]
    permissions = ["network_access"]

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
            message=f"Research Agent searching web for: {objective[:50]}...",
            task_id=task_id,
        )

        search_query = context.get("search_query") or objective

        # Execute web search tool
        search_res = await self.execute_tool(
            tool_name="web_search",
            arguments={"query": search_query, "max_results": 5},
            on_event=on_event,
            task_id=task_id,
        )

        results = search_res.get("results", [])
        resources = []
        if results:
            for r in results:
                resources.append({
                    "title": r.get("title", "Resource"),
                    "url": r.get("url", ""),
                    "snippet": r.get("snippet", ""),
                })

            raw_snippets = "\n\n".join([f"Title: {r['title']}\nURL: {r['url']}\nSummary: {r['snippet']}" for r in results])

            prompt = f"""You are GWEN's Research Specialist Agent.
Review these search results:

{raw_snippets}

Research Objective:
{objective}

Provide:
1. A concise synthesis of the key findings and reliable recommendations.
2. Recommended tutorials/resources with full URLs.
"""
            try:
                summary = await self.provider.generate(
                    prompt=prompt,
                    system_prompt="You are an expert research analyst. Summarize findings objectively and accurately cite all links.",
                    temperature=0.4,
                )
            except Exception as e:
                logger.warning(f"Error summarizing research: {e}")
                summary = f"Identified {len(results)} relevant resources:\n" + "\n".join(
                    [f"- [{r['title']}]({r['url']}): {r['snippet'][:100]}..." for r in results]
                )
        else:
            summary = "No search results were found for this query."

        await self.emit_event(
            on_event,
            event_type="agent_complete",
            message=f"Research Agent compiled {len(resources)} resources.",
            task_id=task_id,
            data={"sources_count": len(resources)},
        )

        return {
            "status": "COMPLETED",
            "research_summary": summary,
            "sources": resources,
            "count": len(resources),
        }
