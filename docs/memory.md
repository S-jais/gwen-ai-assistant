# GWEN 3-Tier Memory Engine

## 1. Short-Term Memory
- **Location:** `messages` table in SQLite
- **Scope:** Active chat conversation history
- **Function:** Injects the latest conversation turns into LLM system prompts for contextual dialogue continuity.

## 2. Long-Term Memory
- **Location:** `memories` table (`memory_type="long_term"`)
- **Scope:** User preferences, study habits, constraints (e.g. *"I prefer studying after 7 PM"*).
- **Function:** Automatically loaded by Manager Agent during task decomposition to customize generated plans.

## 3. Knowledge Memory (RAG)
- **Location:** ChromaDB persistent collection (`storage/chroma/`)
- **Scope:** Uploaded PDF, DOCX, TXT, and Markdown files.
- **Function:** Segmented with recursive character chunking and indexed using local embeddings (`nomic-embed-text`) with page citations.
