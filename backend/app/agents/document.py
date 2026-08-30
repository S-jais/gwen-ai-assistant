import logging
from typing import Any, Dict, List, Optional
from app.agents.base import BaseAgent, EventCallback

logger = logging.getLogger(__name__)


class DocumentAgent(BaseAgent):
    name = "Document Agent"
    display_name = "Document Specialist"
    role = "Knowledge & Document Retrieval"
    description = "Specializes in reading, analyzing, and extracting precise concepts and citations from local notes, PDFs, and textbooks."
    capabilities = [
        "Semantic similarity search in local notes",
        "Document excerpt and page citation extraction",
        "Concept analysis from uploaded study materials",
    ]
    allowed_tools = ["search_documents"]
    permissions = ["doc_read"]

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
            message="Document Agent analyzing notes and materials...",
            task_id=task_id,
        )

        query = context.get("document_query") or objective
        document_ids = context.get("document_ids")

        # Execute document search
        search_res = await self.execute_tool(
            tool_name="search_documents",
            arguments={"query": query, "top_k": 5, "document_ids": document_ids},
            on_event=on_event,
            task_id=task_id,
        )

        chunks = search_res.get("chunks", [])
        if not chunks:
            # If no direct match in specific query, try broader terms or return fallback
            summary = "No specific uploaded documents matched the query, or no documents have been uploaded yet."
            citations = []
        else:
            # Synthesize key findings from retrieved chunks
            citations = [
                {
                    "document_name": c.get("document_name"),
                    "page_number": c.get("page_number"),
                    "excerpt": c.get("content", "")[:200] + "...",
                    "score": c.get("score"),
                }
                for c in chunks
            ]

            context_str = "\n\n".join(
                [f"--- From '{c['document_name']}' (Page {c['page_number']}) ---\n{c['content']}" for c in chunks]
            )

            prompt = f"""You are GWEN's Document Analysis Agent.
Analyze the following excerpts extracted from the user's uploaded documents:

{context_str}

User Objective / Query:
{objective}

Provide:
1. Key topics, core concepts, and formulas identified in the notes.
2. Important sections requiring study or focus.
3. Accurate page/document citations.
"""
            try:
                summary = await self.provider.generate(
                    prompt=prompt,
                    system_prompt="You are a precise document analysis specialist. Focus strictly on the extracted text facts.",
                    temperature=0.3,
                )
            except Exception as e:
                logger.warning(f"Error generating document summary: {e}")
                summary = f"Extracted {len(chunks)} relevant excerpts from notes covering: " + ", ".join(
                    [c.get("document_name", "") for c in chunks]
                )

        await self.emit_event(
            on_event,
            event_type="agent_complete",
            message=f"Document Agent extracted {len(chunks)} relevant references.",
            task_id=task_id,
            data={"citations_count": len(citations)},
        )

        return {
            "status": "COMPLETED",
            "extracted_knowledge": summary,
            "citations": citations,
            "chunks_found": len(chunks),
        }
