# GWEN Tools Reference

All agent tools implement `BaseTool` (`backend/app/tools/base.py`) and are registered within `ToolRegistry` with granular capability permissions.

| Tool Name | Class | Required Permission | Description |
|---|---|---|---|
| `web_search` | `WebSearchTool` | `network_access` | Queries DuckDuckGo / knowledge endpoints for real-time web resources. |
| `fetch_webpage` | `FetchWebpageTool` | `network_access` | Downloads and parses web pages to clean markdown using Trafilatura & BeautifulSoup. |
| `search_documents`| `SearchDocumentsTool` | `doc_read` | Performs cosine similarity semantic search across ChromaDB vector chunks. |
| `create_task` | `CreateTaskTool` | `task_write` | Inserts a new task or study milestone into the SQLite tasks table. |
| `get_tasks` | `GetTasksTool` | `task_read` | Retrieves existing tasks filtered by status or priority. |
| `update_task` | `UpdateTaskTool` | `task_write` | Modifies task status, priority, or deadline. |
| `save_memory` | `SaveMemoryTool` | `memory_write` | Stores persistent user preferences or study habits. |
| `search_memory` | `SearchMemoryTool` | `memory_read` | Recalls saved long-term user facts. |
| `analyze_code` | `AnalyzeCodeTool` | `code_read` | Safely checks code syntax using AST parser without executing. |
