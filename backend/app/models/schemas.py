from typing import Any, Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# --- Authentication ---
class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class UserRead(BaseModel):
    id: str
    username: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    user: UserRead
    token: Optional[str] = None
    is_first_user: bool = False


# --- Chat & Messaging ---
class MessageCreate(BaseModel):
    content: str
    role: str = "user"
    conversation_id: Optional[str] = None
    document_ids: Optional[List[str]] = None


class MessageRead(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    agent_name: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"


class ConversationRead(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# --- Tasks ---
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  # low, medium, high, urgent
    status: str = "pending"  # pending, in_progress, completed, cancelled
    deadline: Optional[str] = None
    day_number: Optional[int] = None
    agent_source: Optional[str] = "user"
    parent_task_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[str] = None
    day_number: Optional[int] = None


class TaskRead(BaseModel):
    id: str
    title: str
    description: Optional[str] = ""
    priority: str
    status: str
    deadline: Optional[str] = None
    day_number: Optional[int] = None
    agent_source: str
    parent_task_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- Documents ---
class DocumentRead(BaseModel):
    id: str
    filename: str
    original_name: str
    file_size: int
    mime_type: str
    status: str
    num_chunks: int
    summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentChunk(BaseModel):
    id: str
    document_id: str
    document_name: str
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    score: Optional[float] = None


class DocumentQuery(BaseModel):
    query: str
    top_k: int = 4
    document_ids: Optional[List[str]] = None


# --- Memory ---
class MemoryCreate(BaseModel):
    memory_type: str = "long_term"  # short_term, long_term, knowledge
    category: str = "general"  # preference, fact, goal
    content: str
    importance: int = 3
    metadata_json: Optional[Dict[str, Any]] = None


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    importance: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None


class MemoryRead(BaseModel):
    id: str
    memory_type: str
    category: str
    content: str
    importance: int
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Agent Orchestration & Execution ---
class AgentTask(BaseModel):
    task_id: str
    parent_task_id: Optional[str] = None
    agent_name: str
    objective: str
    context: Dict[str, Any] = Field(default_factory=dict)
    tools: List[str] = Field(default_factory=list)
    status: str = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class AgentInfo(BaseModel):
    name: str
    display_name: str
    role: str
    description: str
    capabilities: List[str]
    tools: List[str]
    status: str = "idle"  # idle, busy, error
    execution_count: int = 0


class AgentStreamEvent(BaseModel):
    event_type: str  # agent_start, agent_update, tool_start, tool_end, agent_complete, agent_error, token, final_result
    agent_name: Optional[str] = None
    task_id: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# --- System Status ---
class SystemStatus(BaseModel):
    status: str
    version: str
    gpu_available: bool
    gpu_name: Optional[str] = None
    gpu_vram_total_mb: Optional[int] = None
    gpu_vram_used_mb: Optional[int] = None
    ram_total_gb: Optional[float] = None
    ram_free_gb: Optional[float] = None
    ollama_running: bool
    installed_models: List[str] = Field(default_factory=list)
    active_provider: str
