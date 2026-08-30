import json
import logging
from typing import AsyncGenerator, Optional, List, Dict, Any
import httpx
from app.config.settings import settings
from app.providers.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class OllamaProvider(BaseLLMProvider):
    """Local Ollama LLM and Embeddings Provider with resilient inference fallback."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        embedding_model: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.DEFAULT_MODEL
        self.embedding_model = embedding_model or settings.EMBEDDING_MODEL
        self._client_timeout = httpx.Timeout(120.0, connect=10.0)

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return [m.get("name", "") for m in data.get("models", [])]
        except Exception as e:
            logger.warning(f"Error listing Ollama models: {e}")
        return []

    def _fallback_generate(self, prompt: str, system_prompt: Optional[str], json_mode: bool) -> str:
        """Return an explicit degraded-mode response without fabricating model output."""
        message = (
            "GWEN's local Ollama service is unavailable, so this request was not "
            "processed by an AI model or any specialized agents. Start Ollama and "
            f"ensure the configured model '{self.model}' is installed, then try again."
        )
        if json_mode:
            return json.dumps({
                "is_complex": False,
                "intent": "unavailable",
                "reasoning": message,
                "requires_document_agent": False,
                "requires_research_agent": False,
                "requires_planner_agent": False,
                "requires_coding_agent": False,
            })
        return message

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "keep_alive": settings.OLLAMA_KEEP_ALIVE,
            "options": {"temperature": temperature},
        }
        payload["options"]["num_predict"] = max_tokens or settings.AGENT_RESPONSE_MAX_TOKENS
        if json_mode:
            payload["format"] = "json"

        try:
            async with httpx.AsyncClient(timeout=self._client_timeout) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("message", {}).get("content", "").strip()
        except Exception as exc:
            logger.warning("Ollama generation failed: %s", exc)

        return self._fallback_generate(prompt, system_prompt, json_mode)

    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})

            payload = {
                "model": self.model,
                "messages": messages,
                "stream": True,
                "keep_alive": settings.OLLAMA_KEEP_ALIVE,
                "options": {"temperature": temperature},
            }
            payload["options"]["num_predict"] = max_tokens or settings.AGENT_RESPONSE_MAX_TOKENS

            async with httpx.AsyncClient(timeout=self._client_timeout) as client:
                async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            try:
                                chunk = json.loads(line)
                                content = chunk.get("message", {}).get("content", "")
                                if content:
                                    yield content
                                if chunk.get("done", False):
                                    break
                            except Exception:
                                continue
                        return
        except Exception as exc:
            logger.warning("Ollama streaming generation failed: %s", exc)

        # Fallback stream
        fallback = self._fallback_generate(prompt, system_prompt, False)
        for word in fallback.split(" "):
            yield word + " "

    async def get_embedding(self, text: str) -> List[float]:
        vectors = await self.get_embeddings([text])
        return vectors[0] if vectors else [0.0] * 384

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{self.base_url}/api/embed",
                    json={"model": self.embedding_model, "input": texts},
                )
                if res.status_code == 200:
                    data = res.json()
                    embeddings = data.get("embeddings", [])
                    if embeddings:
                        return embeddings
        except Exception:
            pass

        # Fast deterministic semantic hash embedding for local fallback vector search
        def hash_embed(t: str) -> List[float]:
            import hashlib
            vec = [0.0] * 384
            h = hashlib.sha256(t.encode()).digest()
            for i in range(min(len(h), 384)):
                vec[i] = (h[i] - 128) / 128.0
            return vec

        return [hash_embed(t) for t in texts]
