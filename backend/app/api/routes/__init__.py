from fastapi import APIRouter
from .auth import router as auth_router
from .chat import router as chat_router
from .tasks import router as tasks_router
from .documents import router as documents_router
from .memory import router as memory_router
from .agents import router as agents_router
from .settings import router as settings_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(tasks_router)
api_router.include_router(documents_router)
api_router.include_router(memory_router)
api_router.include_router(agents_router)
api_router.include_router(settings_router)

__all__ = ["api_router"]
