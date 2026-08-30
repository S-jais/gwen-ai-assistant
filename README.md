# GWEN — Local-First Multi-Agent AI Assistant

![GWEN AI Assistant](https://img.shields.io/badge/GWEN-Multi--Agent-00d2ff?style=for-the-badge) ![Cost](https://img.shields.io/badge/Cost-%E2%82%B90%20Local-10b981?style=for-the-badge) ![GPU](https://img.shields.io/badge/GPU-RTX%204060%208GB-ff2a5f?style=for-the-badge) ![Platform](https://img.shields.io/badge/Platform-Windows%2011-8b5cf6?style=for-the-badge)

**GWEN** is a privacy-first, zero-cost (₹0), local-first multi-agent AI assistant designed for Windows laptops (optimized for Intel i7-13650HX + NVIDIA GeForce RTX 4060 8GB VRAM).

Unlike simple chatbot wrappers, GWEN is a **real multi-agent system** featuring an Orchestrator and specialized sub-agents that perform real tasks: decomposing objectives, searching local documents (RAG with page citations), conducting web research, generating structured study plans and task schedules, and assisting with code analysis.

---

## ⚡ Core Architecture

```text
USER REQUEST
     ↓
GWEN MANAGER (Intent Classifier & Task Decomposition)
     ↓
DYNAMIC AGENT EXECUTION PIPELINE
 ├── Document Agent  →  Extracts concepts & citations from local PDFs/Notes
 ├── Research Agent  →  Free DuckDuckGo web search & webpage scraper
 ├── Planner Agent   →  Formulates structured 10-day schedules & milestones
 └── Coding Agent    →  Safe static syntax inspection & multi-language code gen
     ↓
TOOL EXECUTION & PERMISSIONS LAYER
     ↓
SYNTHESIS & FACTUAL VERIFICATION
     ↓
REAL-TIME SSE STREAM & COMMAND CENTER DASHBOARD
```

---

## 🚀 Specialized Agents

| Agent | Role | Capabilities | Permitted Tools |
|---|---|---|---|
| **Manager Agent** | Central Orchestrator | Natural language intent classification, dynamic task decomposition, multi-agent routing, intermediate verification, final synthesis | `search_memory`, `save_memory` |
| **Document Agent** | Notes & RAG Specialist | Local PDF/DOCX/TXT semantic search, page citation extraction, note concept distillation | `search_documents` |
| **Research Agent** | Web & Resource Specialist | DuckDuckGo web search, clean article extraction (Trafilatura/BeautifulSoup), link citation | `web_search`, `fetch_webpage` |
| **Planner Agent** | Strategic Roadmaps | 10-day preparation schedule generation, milestone priority calculation, task database insertion | `create_task`, `get_tasks`, `update_task` |
| **Coding Agent** | Software & Architecture | Safe static syntax analysis (AST), multi-language generation, debugging diffs | `analyze_code` |

---

## 🎨 Design System: Cyber Arachnid Duo-Tone

GWEN features a state-of-the-art **Cyber Arachnid Duo-Tone** command center UI:
- **Neon Blue (`#00d2ff`)** & **Hyper Red (`#ff2a5f`)** glowing accents on deep void black (`#030407`).
- Ambient background grid & glowing mesh.
- Glassmorphic panels with backdrop blur.
- Real-time Server-Sent Events (SSE) stream visualizer showing the live pipeline (`Manager -> Document -> Research -> Planner -> Synthesizer`).
- Typography: *Outfit*, *Space Grotesk*, *Inter*, and *JetBrains Mono*.

---

## 🛠️ Tech Stack & Requirements

- **Operating System:** Windows 11 (64-bit)
- **GPU Acceleration:** NVIDIA RTX 4060 (8GB VRAM, CUDA 13.3)
- **Local Model:** `qwen2.5:7b-instruct` (~4.7 GB VRAM) + `nomic-embed-text` (~275 MB) via Ollama
- **Backend:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy, aiosqlite, ChromaDB, PyPDF, python-docx, Beautiful Soup 4, Trafilatura, DuckDuckGo Search, Pytest
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, React-Markdown

---

## 🏁 Quick Start & Running GWEN

### 1. Start the FastAPI Backend
```powershell
# From project root
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API docs available at: `http://127.0.0.1:8000/docs`

### 2. Start the Next.js Frontend
```powershell
# In a new terminal
cd frontend
npm run dev
```
Open your browser at: `http://localhost:3000`

### 3. One-Click PowerShell Launcher
You can also launch both services simultaneously:
```powershell
.\start.ps1
```

---

## 🧪 Testing

Run the automated test suite:
```powershell
.\.venv\Scripts\pytest.exe -v
```

---

## 📂 Project Structure

```text
MULTI-AGENT AI ASSISTANT/
├── backend/
│   ├── app/
│   │   ├── agents/          # Manager, Document, Research, Planner, Coding
│   │   ├── api/routes/      # Chat (SSE), Tasks, Documents, Memory, Settings
│   │   ├── config/          # Pydantic settings & directories
│   │   ├── database/        # Async SQLAlchemy models & SQLite session
│   │   ├── documents/       # PDF/DOCX chunker & ChromaDB vector store
│   │   ├── memory/          # 3-tier memory engine (Short, Long, Knowledge)
│   │   ├── models/          # Pydantic request/response schemas
│   │   ├── providers/       # Ollama & OpenAI provider abstraction
│   │   ├── tools/           # Permissioned tool registry
│   │   └── main.py          # FastAPI application entrypoint
│   ├── storage/             # Persistent SQLite DB, documents & Chroma vectors
│   └── tests/               # Pytest suite for agents, tools & workflows
├── frontend/
│   ├── src/
│   │   ├── app/             # Dashboard, Chat, Agents, Tasks, Documents, Activity, Settings
│   │   ├── components/      # Sidebar, layout & UI components
│   │   ├── lib/             # API client & helpers
│   │   └── types/           # TypeScript interfaces
├── docs/                    # Architecture, Agents, Tools, Memory documentation
├── pytest.ini
├── start.ps1
└── README.md
```

---

## 🔒 Privacy & Cost Guarantee
- **₹0 Cost:** 100% open-source software, local embeddings, and local models.
- **Privacy-First:** Your documents and notes never leave your Windows laptop.
