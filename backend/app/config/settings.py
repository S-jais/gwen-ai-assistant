import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
DOCS_DIR = STORAGE_DIR / "documents"
CHROMA_DIR = STORAGE_DIR / "chroma"

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
DOCS_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    PROJECT_NAME: str = "GWEN"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{STORAGE_DIR / 'gwen.db'}"

    # LLM Settings
    DEFAULT_PROVIDER: str = "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    DEFAULT_MODEL: str = "qwen2.5:7b-instruct"
    FALLBACK_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    FALLBACK_EMBEDDING_MODEL: str = "all-minilm"
    OLLAMA_KEEP_ALIVE: str = "30m"
    ROUTING_MAX_TOKENS: int = 200
    SIMPLE_RESPONSE_MAX_TOKENS: int = 250
    AGENT_RESPONSE_MAX_TOKENS: int = 800
    SYNTHESIS_MAX_TOKENS: int = 700

    # OpenAI-compatible fallback (optional)
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = ""

    # Paths
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    DOCS_DIR: Path = DOCS_DIR
    CHROMA_DIR: Path = CHROMA_DIR

    # Security & limits
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list[str] = [".pdf", ".txt", ".md", ".docx"]
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
