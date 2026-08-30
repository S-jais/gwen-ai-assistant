import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
import pypdf
import docx


class DocumentChunkItem:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_name: str,
        chunk_index: int,
        content: str,
        page_number: Optional[int] = None,
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_name = document_name
        self.chunk_index = chunk_index
        self.content = content
        self.page_number = page_number


class DocumentProcessor:
    """Parses PDF, DOCX, TXT, and Markdown files and extracts chunked text with page citations."""

    @staticmethod
    def extract_text_from_file(file_path: Path) -> List[Dict[str, Any]]:
        """Extracts text by page/section from a document file.
        Returns a list of dicts: [{"page": 1, "text": "..."}]
        """
        suffix = file_path.suffix.lower()
        pages: List[Dict[str, Any]] = []

        if suffix == ".pdf":
            reader = pypdf.PdfReader(str(file_path))
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages.append({"page": idx + 1, "text": txt.strip()})

        elif suffix in (".docx", ".doc"):
            doc = docx.Document(str(file_path))
            full_text = []
            for p in doc.paragraphs:
                if p.text.strip():
                    full_text.append(p.text.strip())
            pages.append({"page": 1, "text": "\n\n".join(full_text)})

        elif suffix in (".txt", ".md", ".markdown", ".csv", ".json"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                pages.append({"page": 1, "text": content.strip()})

        else:
            raise ValueError(f"Unsupported file format: {suffix}")

        return pages

    @staticmethod
    def chunk_text(
        pages: List[Dict[str, Any]],
        document_id: str,
        document_name: str,
        chunk_size: int = 600,
        chunk_overlap: int = 100,
    ) -> List[DocumentChunkItem]:
        """Splits page text into overlapping semantic chunks preserving page citations."""
        chunks: List[DocumentChunkItem] = []
        chunk_idx = 0

        for p in pages:
            page_num = p.get("page", 1)
            raw_text = p.get("text", "")
            # Normalize whitespace
            clean_text = re.sub(r"\s+", " ", raw_text).strip()

            if not clean_text:
                continue

            start = 0
            text_len = len(clean_text)

            while start < text_len:
                end = min(start + chunk_size, text_len)
                # Try to break at a sentence boundary if possible
                if end < text_len:
                    last_period = clean_text.rfind(".", start + chunk_size // 2, end)
                    last_newline = clean_text.rfind("\n", start + chunk_size // 2, end)
                    split_point = max(last_period, last_newline)
                    if split_point != -1:
                        end = split_point + 1

                chunk_content = clean_text[start:end].strip()
                if chunk_content:
                    chunks.append(
                        DocumentChunkItem(
                            chunk_id=f"{document_id}_chunk_{chunk_idx}",
                            document_id=document_id,
                            document_name=document_name,
                            chunk_index=chunk_idx,
                            content=chunk_content,
                            page_number=page_num,
                        )
                    )
                    chunk_idx += 1

                start += chunk_size - chunk_overlap

        return chunks
