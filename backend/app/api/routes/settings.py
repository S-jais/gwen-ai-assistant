import os
import shutil
import psutil
import logging
from typing import Dict, Any, List
from fastapi import APIRouter
from pydantic import BaseModel
from app.config.settings import settings
from app.models.schemas import SystemStatus
from app.providers.factory import get_llm_provider
from app.providers.ollama_provider import OllamaProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


class ConfigUpdatePayload(BaseModel):
    provider: str = "ollama"
    model: str = "qwen2.5:7b-instruct"
    embedding_model: str = "nomic-embed-text"
    ollama_base_url: str = "http://localhost:11434"
    openai_api_key: str = ""
    openai_base_url: str = ""


@router.get("/status", response_model=SystemStatus)
async def get_system_status():
    # RAM
    ram = psutil.virtual_memory()
    ram_total = round(ram.total / (1024**3), 2)
    ram_free = round(ram.available / (1024**3), 2)

    # GPU
    gpu_available = False
    gpu_name = None
    gpu_vram_total = None
    gpu_vram_used = None

    try:
        import subprocess
        smi_out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used", "--format=csv,noheader,nounits"],
            encoding="utf-8",
            timeout=2,
        )
        lines = smi_out.strip().splitlines()
        if lines:
            parts = [p.strip() for p in lines[0].split(",")]
            gpu_name = parts[0]
            gpu_vram_total = int(parts[1])
            gpu_vram_used = int(parts[2])
            gpu_available = True
    except Exception:
        pass

    # Ollama status & models
    ollama_prov = OllamaProvider()
    ollama_running = await ollama_prov.is_available()
    models = await ollama_prov.list_models() if ollama_running else []

    return SystemStatus(
        status="healthy",
        version=settings.VERSION,
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        gpu_vram_total_mb=gpu_vram_total,
        gpu_vram_used_mb=gpu_vram_used,
        ram_total_gb=ram_total,
        ram_free_gb=ram_free,
        ollama_running=ollama_running,
        installed_models=models,
        active_provider=settings.DEFAULT_PROVIDER,
    )


@router.post("/config")
async def update_configuration(payload: ConfigUpdatePayload):
    settings.DEFAULT_PROVIDER = payload.provider
    settings.DEFAULT_MODEL = payload.model
    settings.EMBEDDING_MODEL = payload.embedding_model
    settings.OLLAMA_BASE_URL = payload.ollama_base_url
    if payload.openai_api_key:
        settings.OPENAI_API_KEY = payload.openai_api_key
    if payload.openai_base_url:
        settings.OPENAI_BASE_URL = payload.openai_base_url

    return {
        "success": True,
        "message": "Configuration updated successfully",
        "active_model": settings.DEFAULT_MODEL,
        "active_provider": settings.DEFAULT_PROVIDER,
    }
