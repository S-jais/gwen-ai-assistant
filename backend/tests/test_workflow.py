import pytest
from app.agents.manager import ManagerAgent
from app.database.session import init_db
from app.documents.processor import DocumentProcessor
from app.documents.vector_store import vector_store
from app.config.settings import settings


@pytest.mark.asyncio
async def test_end_to_end_dbms_study_workflow():
    await init_db()

    # 1. Ingest sample DBMS notes
    notes_path = settings.STORAGE_DIR / "documents" / "sample_dbms_notes.txt"
    assert notes_path.exists()

    pages = DocumentProcessor.extract_text_from_file(notes_path)
    assert len(pages) >= 1

    chunks = DocumentProcessor.chunk_text(
        pages=pages,
        document_id="test_dbms_doc_1",
        document_name="DBMS Comprehensive Lecture Notes.txt",
    )
    assert len(chunks) >= 1

    await vector_store.add_chunks(chunks)

    # 2. Query multi-agent Manager with the exact user workflow requirement
    manager = ManagerAgent()
    user_goal = "I have a DBMS exam in 10 days. Read my uploaded DBMS notes, identify important topics, research additional resources, and create a study plan."

    events = []

    async def collect_events(evt):
        events.append(evt)

    result = await manager.run(
        objective=user_goal,
        context={"document_ids": ["test_dbms_doc_1"]},
        on_event=collect_events,
    )

    # 3. Assertions
    assert result["status"] in {"COMPLETED", "DEGRADED"}
    assert "final_response" in result
    assert len(events) >= 2

    if result["status"] == "DEGRADED":
        assert result["agents_used"] == []
        assert "unavailable" in result["final_response"].lower()
    else:
        assert len(result["agents_used"]) >= 3
        assert "Manager Agent" in result["agents_used"]
        assert "Planner Agent" in result["agents_used"]
