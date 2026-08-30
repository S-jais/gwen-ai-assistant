import {
  User,
  AuthResponse,
  AuthStatus,
  Conversation,
  Message,
  TaskItem,
  DocumentItem,
  DocumentChunk,
  MemoryItem,
  AgentInfo,
  SystemStatus,
  AgentStreamEvent,
} from '@/types';

const API_BASE = 'http://127.0.0.1:8000/api';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gwen_session_token');
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('gwen_session_token', token);
  } else {
    localStorage.removeItem('gwen_session_token');
  }
}

function getAuthHeaders(contentTypeJson: boolean = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentTypeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Authentication
  async getAuthStatus(): Promise<AuthStatus> {
    const res = await fetch(`${API_BASE}/auth/status`);
    if (!res.ok) throw new Error('Failed to check auth status');
    return res.json();
  },

  async register(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data: AuthResponse = await res.json();
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
      throw new Error(err.detail || 'Invalid credentials');
    }
    const data: AuthResponse = await res.json();
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async logout(): Promise<any> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Session invalid or expired');
    return res.json();
  },

  // System
  async getSystemStatus(): Promise<SystemStatus> {
    const res = await fetch(`${API_BASE}/settings/status`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  async updateConfig(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/config`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // Agents
  async getAgents(): Promise<AgentInfo[]> {
    const res = await fetch(`${API_BASE}/agents`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch agents');
    return res.json();
  },

  // Conversations & Chat
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async createConversation(title?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
    return res.json();
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async deleteConversation(conversationId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // SSE Real-Time Chat Stream
  async streamChat(
    payload: { content: string; conversation_id?: string; document_ids?: string[] },
    onEvent: (event: AgentStreamEvent) => void,
    onFinish: (finalData: any) => void,
    onError: (err: any) => void
  ) {
    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          const blockLines = block.split('\n');
          for (const line of blockLines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim();
            }
          }

          if (dataStr) {
            try {
              const parsed = JSON.parse(dataStr);
              if (eventType === 'final_result') {
                onFinish(parsed);
              } else {
                onEvent({
                  event_type: eventType,
                  agent_name: parsed.agent_name,
                  task_id: parsed.task_id,
                  message: parsed.message,
                  data: parsed.data,
                  timestamp: parsed.timestamp || new Date().toISOString(),
                });
              }
            } catch (e) {
              console.warn('Error parsing SSE data block:', e);
            }
          }
        }
      }
    } catch (error) {
      onError(error);
    }
  },

  // Tasks
  async getTasks(status?: string, priority?: string): Promise<TaskItem[]> {
    let url = `${API_BASE}/tasks`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(task),
    });
    return res.json();
  },

  async updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    return res.json();
  },

  async deleteTask(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Documents
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async queryDocuments(query: string, topK: number = 4, documentIds?: string[]): Promise<DocumentChunk[]> {
    const res = await fetch(`${API_BASE}/documents/query`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ query, top_k: topK, document_ids: documentIds }),
    });
    return res.json();
  },

  async deleteDocument(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  // Memory
  async getMemories(category?: string): Promise<MemoryItem[]> {
    let url = `${API_BASE}/memory`;
    if (category) url += `?category=${category}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch memories');
    return res.json();
  },

  async createMemory(content: string, category: string = 'preference', importance: number = 3): Promise<MemoryItem> {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ content, category, importance }),
    });
    return res.json();
  },

  async deleteMemory(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/memory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },
};
