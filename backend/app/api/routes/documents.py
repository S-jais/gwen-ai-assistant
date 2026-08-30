import os
import uuid
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.config.settings import settings
from app.database.session import get_db
from app.database.models import Document, User
from app.models.schemas import DocumentRead, DocumentChunk, DocumentQuery
from app.documents.processor import DocumentProcessor
from app.documents.vector_store import vector_store
from app.core.security import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=List[DocumentRead])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """List documents owned by the active user."""
    stmt = select(Document).order_by(Document.created_at.desc())
    if current_user:
        stmt = stmt.where(Document.user_id == current_user.id)
    else:
        stmt = stmt.where(Document.user_id.is_(None))

    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/upload", response_model=DocumentRead)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Upload and vector-index a document for the active user."""
    user_id = current_user.id if current_user else None

    ext = Path(file.filename or "").suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    saved_path = settings.DOCS_DIR / safe_filename

    # Save to disk safely
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size ({settings.MAX_UPLOAD_SIZE_MB}MB)",
        )

    with open(saved_path, "wb") as f:
        f.write(content)

    # Create DB record
    doc = Document(
        id=doc_id,
        user_id=user_id,
        filename=safe_filename,
        original_name=file.filename or "Uploaded Document",
        file_size=len(content),
        mime_type=file.content_type or "application/octet-stream",
        file_path=str(saved_path),
        status="processing",
        num_chunks=0,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process and vector index with user_id
    try:
        pages = DocumentProcessor.extract_text_from_file(saved_path)
        chunks = DocumentProcessor.chunk_text(
            pages=pages,
            document_id=doc.id,
            document_name=doc.original_name,
        )
        if chunks:
            await vector_store.add_chunks(chunks, user_id=user_id)

        doc.status = "ready"
        doc.num_chunks = len(chunks)
        await db.commit()
        await db.refresh(doc)
    except Exception as e:
        logger.error(f"Error processing document: {e}")
        doc.status = "failed"
        await db.commit()
        await db.refresh(doc)

    return doc


@router.post("/query", response_model=List[DocumentChunk])
async def query_documents(
    payload: DocumentQuery,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Query semantic vector embeddings restricted to the user's isolated documents."""
    user_id = current_user.id if current_user else None
    results = await vector_store.search(
        query=payload.query,
        top_k=payload.top_k,
        document_ids=payload.document_ids,
        user_id=user_id,
    )
    return [
        DocumentChunk(
            id=r.get("chunk_id", ""),
            document_id=r.get("document_id", ""),
            document_name=r.get("document_name", ""),
            chunk_index=0,
            content=r.get("content", ""),
            page_number=r.get("page_number", 1),
            score=r.get("score"),
        )
        for r in results
    ]


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Delete a document owned by the active user and clear vector embeddings."""
    stmt = select(Document).where(Document.id == document_id)
    if current_user:
        stmt = stmt.where(Document.user_id == current_user.id)

    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied")

    # Remove file
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception as e:
        logger.warning(f"Error deleting file: {e}")

    # Remove vector embeddings
    await vector_store.delete_document(document_id)

    # Delete from DB
    await db.delete(doc)
    await db.commit()

    return {"success": True, "document_id": document_id}
