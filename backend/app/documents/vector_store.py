import logging
from typing import List, Dict, Any, Optional
from app.config.settings import settings
from app.documents.processor import DocumentChunkItem
from app.providers.factory import get_llm_provider

logger = logging.getLogger(__name__)


class VectorStore:
    """Local Vector Storage using ChromaDB with persistent local storage and user isolation."""

    def __init__(self):
        self.chroma_dir = settings.CHROMA_DIR
        self._client = None
        self._collection = None

    def _get_collection(self):
        if self._collection is None:
            try:
                import chromadb
                from chromadb.config import Settings as ChromaSettings

                self._client = chromadb.PersistentClient(
                    path=str(self.chroma_dir),
                    settings=ChromaSettings(anonymized_telemetry=False),
                )
                self._collection = self._client.get_or_create_collection(
                    name="gwen_documents",
                    metadata={"hnsw:space": "cosine"},
                )
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}")
                raise
        return self._collection

    async def add_chunks(
        self, chunks: List[DocumentChunkItem], user_id: Optional[str] = None
    ) -> bool:
        """Embed and store document chunks in ChromaDB with user_id isolation tag."""
        if not chunks:
            return True

        collection = self._get_collection()
        provider = get_llm_provider()

        texts = [c.content for c in chunks]
        ids = [c.chunk_id for c in chunks]
        metadatas = [
            {
                "document_id": c.document_id,
                "document_name": c.document_name,
                "chunk_index": c.chunk_index,
                "page_number": c.page_number or 1,
                "user_id": user_id or "",
            }
            for c in chunks
        ]

        # Batch embed
        try:
            embeddings = await provider.get_embeddings(texts)
            collection.upsert(
                ids=ids,
                documents=texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            return True
        except Exception as e:
            logger.error(f"Error storing chunks in VectorStore: {e}")
            return False

    async def search(
        self,
        query: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Perform semantic similarity search on stored documents isolated by user_id."""
        collection = self._get_collection()
        provider = get_llm_provider()

        try:
            query_embedding = await provider.get_embedding(query)
            
            conditions = []
            if user_id:
                conditions.append({"user_id": user_id})
            if document_ids and len(document_ids) == 1:
                conditions.append({"document_id": document_ids[0]})
            elif document_ids and len(document_ids) > 1:
                conditions.append({"document_id": {"$in": document_ids}})

            where_filter = None
            if len(conditions) == 1:
                where_filter = conditions[0]
            elif len(conditions) > 1:
                where_filter = {"$and": conditions}

            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
            )

            matched_chunks = []
            if results and results.get("documents") and results["documents"][0]:
                docs = results["documents"][0]
                metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
                ids = results["ids"][0] if results.get("ids") else [""] * len(docs)
                distances = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

                for doc, meta, cid, dist in zip(docs, metas, ids, distances):
                    matched_chunks.append({
                        "chunk_id": cid,
                        "document_id": meta.get("document_id", ""),
                        "document_name": meta.get("document_name", "Unknown Document"),
                        "page_number": meta.get("page_number", 1),
                        "content": doc,
                        "score": round(1.0 - max(0.0, min(dist, 1.0)), 3),
                    })

            return matched_chunks

        except Exception as e:
            logger.error(f"Error during vector search: {e}")
            return []

    async def delete_document(self, document_id: str) -> bool:
        """Remove all chunks associated with a document."""
        try:
            collection = self._get_collection()
            collection.delete(where={"document_id": document_id})
            return True
        except Exception as e:
            logger.error(f"Error deleting document vectors: {e}")
            return False


vector_store = VectorStore()
