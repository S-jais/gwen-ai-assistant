# GWEN Agents Specification

## 1. Manager Agent
- **File:** `backend/app/agents/manager.py`
- **Role:** Central Orchestrator
- **State Machine:**
  1. `Classify & Decompose`: Identifies user intent and generates a multi-agent execution plan.
  2. `Dispatch`: Triggers specialized agents with tailored sub-contexts.
  3. `Verify`: Validates agent responses against the initial goal.
  4. `Synthesize`: Produces the structured final answer.

## 2. Document Agent
- **File:** `backend/app/agents/document.py`
- **Role:** Knowledge & Document Retrieval
- **Tools:** `search_documents`
- **Capabilities:**
  - Extracts concepts from uploaded notes and textbooks.
  - Generates exact page citations.

## 3. Research Agent
- **File:** `backend/app/agents/research.py`
- **Role:** Web & Knowledge Researcher
- **Tools:** `web_search`, `fetch_webpage`
- **Capabilities:**
  - Searches DuckDuckGo for articles and tutorials.
  - Extracts clean article text via Trafilatura.

## 4. Planner Agent
- **File:** `backend/app/agents/planner.py`
- **Role:** Task Decomposition & Schedule Orchestration
- **Tools:** `create_task`, `get_tasks`, `update_task`
- **Capabilities:**
  - Formulates day-by-day preparation schedules.
  - Automatically registers tasks into the database.

## 5. Coding Agent
- **File:** `backend/app/agents/coding.py`
- **Role:** Code Analysis & Generation
- **Tools:** `analyze_code`
- **Capabilities:**
  - Performs safe static syntax validation using Python's AST.
  - Generates clean, idiomatic code without executing untrusted scripts.
