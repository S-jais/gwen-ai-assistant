import logging
from typing import Any, Dict, List, Optional
from app.tools.base import BaseTool, ToolDefinition, ToolParameter
from app.documents.vector_store import vector_store

logger = logging.getLogger(__name__)


class SearchDocumentsTool(BaseTool):
    name = "search_documents"
    description = "Search through user-uploaded documents (notes, textbooks, PDFs, docs) to find relevant excerpts and answers."
    required_permissions = ["doc_read"]

    def get_definition(self) -> ToolDefinition:
        return ToolDefinition(
            name=self.name,
            description=self.description,
            parameters=[
                ToolParameter(name="query", type="string", description="The semantic search query or concept to look for in documents.", required=True),
                ToolParameter(name="top_k", type="integer", description="Number of relevant chunks to retrieve (1-10).", required=False, default=4),
                ToolParameter(name="document_ids", type="list", description="Optional list of specific document IDs to restrict search to.", required=False, default=None),
            ],
            required_permissions=self.required_permissions,
        )

    async def execute(
        self,
        query: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        user_id = kwargs.get("user_id")
        chunks = await vector_store.search(
            query=query, top_k=top_k, document_ids=document_ids, user_id=user_id
        )
        return {
            "query": query,
            "count": len(chunks),
            "chunks": chunks,
            "success": True,
        }
