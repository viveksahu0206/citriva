"""PyMuPDF text extraction helpers."""

import logging

import fitz  # PyMuPDF

from app.models.schemas import SourcePage
from app.services.text_utils import clean_extracted_page_text

logger = logging.getLogger("citriva.pdf")


def extract_pdf_pages(
    data: bytes,
    *,
    max_pages: int,
    max_chars: int,
    clean: bool = True,
) -> list[SourcePage]:
    """Extract page-indexed text (1-based page numbers). Raises ValueError for unusable PDFs."""
    pages: list[SourcePage] = []
    total_chars = 0
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise ValueError(f"Unreadable PDF: {exc}") from exc
    try:
        if doc.needs_pass:
            raise ValueError("PDF is password protected")
        for index, page in enumerate(doc, start=1):
            if index > max_pages:
                break
            raw = page.get_text("text") or ""
            text = clean_extracted_page_text(raw) if clean else raw.replace("\u00ad", "").strip()
            if not text:
                continue
            pages.append(SourcePage(page_number=index, text=text))
            total_chars += len(text)
            if total_chars >= max_chars:
                break
    finally:
        doc.close()
    return pages
