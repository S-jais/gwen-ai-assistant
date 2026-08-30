from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, List, Dict, Any


class BaseLLMProvider(ABC):
    """Abstract Base Class for all LLM Providers (Ollama, OpenAI, Local, etc.)"""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        """Generate full completion text."""
        pass

    @abstractmethod
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream completion tokens."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for a single text chunk."""
        pass

    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embedding vectors for multiple text chunks."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if the provider service is running and responsive."""
        pass

    @abstractmethod
    async def list_models(self) -> List[str]:
        """List available models in the provider."""
        pass
