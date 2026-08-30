from typing import Optional
from app.config.settings import settings
from app.providers.base import BaseLLMProvider
from app.providers.ollama_provider import OllamaProvider
from app.providers.openai_provider import OpenAICompatibleProvider

_provider_instances: dict[str, BaseLLMProvider] = {}


def get_llm_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
) -> BaseLLMProvider:
    """Factory function to get or create an LLM Provider instance."""
    p_name = (provider_name or settings.DEFAULT_PROVIDER).lower()

    if p_name == "ollama":
        key = f"ollama_{model or settings.DEFAULT_MODEL}_{base_url or settings.OLLAMA_BASE_URL}"
        if key not in _provider_instances:
            _provider_instances[key] = OllamaProvider(
                base_url=base_url or settings.OLLAMA_BASE_URL,
                model=model or settings.DEFAULT_MODEL,
                embedding_model=settings.EMBEDDING_MODEL,
            )
        return _provider_instances[key]

    elif p_name in ("openai", "openai_compatible"):
        key = f"openai_{model or 'default'}_{base_url or 'default'}"
        if key not in _provider_instances:
            _provider_instances[key] = OpenAICompatibleProvider(
                api_key=settings.OPENAI_API_KEY,
                base_url=base_url or settings.OPENAI_BASE_URL,
                model=model,
            )
        return _provider_instances[key]

    # Default fallback
    return OllamaProvider()
