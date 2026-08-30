# GWEN Architecture Documentation

## System Overview

GWEN is a local-first multi-agent artificial intelligence system designed for local GPU acceleration on Windows 11 with NVIDIA RTX 4060 (8GB VRAM).

```text
                               +-------------------------------------------------+
                               |                   Next.js UI                    |
                               | (Dashboard, Chat, Agents, Tasks, Docs, Activity)|
                               +-----------------------+-------------------------+
                                                       |
                                        REST API / SSE | Stream (HTTP 8000)
                                                       v
+---------------------------------------------------------------------------------------------------------------+
|                                              FastAPI Backend                                                  |
|                                                                                                               |
|   +-------------------------------------------------------------------------------------------------------+   |
|   |                                          MANAGER AGENT                                                |   |
|   |                            (Intent Classifier & Task Decomposition Graph)                             |   |
|   +---------------------------------------------------+---------------------------------------------------+   |
|                                                       |                                                       |
|                     +---------------------------------+---------------------------------+                     |
|                     |                                 |                                 |                     |
|                     v                                 v                                 v                     |
|          +--------------------+            +--------------------+            +--------------------+           |
|          |   DOCUMENT AGENT   |            |   RESEARCH AGENT   |            |   PLANNER AGENT    |           |
|          | (PDF/RAG Analyzer) |            |   (Web Scraper)    |            | (Roadmap Scheduler)|           |
|          +---------+----------+            +---------+----------+            +---------+----------+           |
|                    |                                 |                                 |                      |
|                    v                                 v                                 v                      |
|          +--------------------+            +--------------------+            +--------------------+           |
|          | search_documents() |            |   web_search()     |            |   create_task()    |           |
|          | get_doc_chunks()   |            |  fetch_webpage()   |            |   update_task()    |           |
|          +---------+----------+            +---------+----------+            +---------+----------+           |
|                    |                                                                   |                      |
+--------------------+-------------------------------------------------------------------+----------------------+
                     |                                                                   |
                     v                                                                   v
+--------------------------------------------+                      +-------------------------------------------+
|          ChromaDB Vector Store             |                      |             SQLite Database               |
|      (Cosine embeddings, Page Tags)        |                      | (Conversations, Messages, Tasks, Memories)|
+--------------------------------------------+                      +-------------------------------------------+
```

## Multi-Agent Decision Engine
1. **Simple Request**: If user asks a general question, the Manager bypasses sub-agents and synthesizes a direct response.
2. **Complex Multi-Step Request**: The Manager creates an execution plan, sequentially or conditionally invoking:
   - **Document Agent** to extract factual context and page citations from local notes.
   - **Research Agent** to find current web tutorials and reference URLs.
   - **Planner Agent** to break down milestones into structured daily tasks stored in the DB.
   - **Coding Agent** to safely inspect syntax and generate code blocks.
3. **Verification**: Manager cross-checks outputs and synthesizes an executive response with explicit source attributions.
