export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  is_first_user?: boolean;
}

export interface AuthStatus {
  is_setup_completed: boolean;
  total_users: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_name?: string;
  metadata_json?: {
    agents_used?: string[];
    citations?: Citation[];
    sources?: Source[];
    tasks_created?: any[];
    document_ids?: string[];
  };
  created_at: string;
}

export interface Citation {
  document_name: string;
  page_number: number;
  excerpt: string;
  score?: number;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deadline?: string;
  day_number?: number;
  agent_source: string;
  parent_task_id?: string;
  created_at: string;
  completed_at?: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'failed';
  num_chunks: number;
  summary?: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  page_number: number;
  score?: number;
}

export interface MemoryItem {
  id: string;
  memory_type: 'short_term' | 'long_term' | 'knowledge';
  category: string;
  content: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export interface AgentInfo {
  name: string;
  display_name: string;
  role: string;
  description: string;
  capabilities: string[];
  tools: string[];
  status: 'idle' | 'busy' | 'error';
  execution_count: number;
}

export interface SystemStatus {
  status: string;
  version: string;
  gpu_available: boolean;
  gpu_name?: string;
  gpu_vram_total_mb?: number;
  gpu_vram_used_mb?: number;
  ram_total_gb?: number;
  ram_free_gb?: number;
  ollama_running: boolean;
  installed_models: string[];
  active_provider: string;
}

export interface AgentStreamEvent {
  event_type: string;
  agent_name?: string;
  task_id?: string;
  message?: string;
  data?: any;
  timestamp: string;
}
