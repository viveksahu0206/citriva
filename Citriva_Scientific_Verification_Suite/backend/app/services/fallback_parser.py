"""Fallback parser: PyMuPDF text extraction + structured Gemini extraction."""

import logging
import re
from concurrent.futures import ThreadPoolExecutor

from rapidfuzz import fuzz, process

from app.core.config import get_settings
from app.models.schemas import (
    BibEntry,
    CitationInstance,
    ExtractedBibliography,
    ExtractedCitations,
    ParsedDocument,
)
from app.services.errors import PipelineError
from app.services.gemini_client import generate_structured
from app.services.guardrails import PROMPT_INJECTION_RULES, UNTRUSTED_CLAIM_TAG
from app.services.pdf_text import extract_pdf_pages
from app.services.text_utils import (
    clean_extracted_page_text,
    normalize_doi,
    normalize_for_match,
    normalize_whitespace,
    parse_year,
    sanitize_untrusted,
    split_sentences,
)

logger = logging.getLogger("citriva.fallback_parser")

MAX_PAGES = 200
MAX_TOTAL_CHARS = 1_500_000
MAX_BODY_CHARS = 300_000
MAX_BIB_CHARS = 150_000
CONTEXT_RADIUS = 2

_REF_HEADING_RE = re.compile(
    r"(?im)^\s*(?:\d+\.?\s*)?(references|bibliography|works cited|literature cited)\s*:?\s*$"
)
_NUMERIC_MARKER_RE = re.compile(r"^[\d\s,;\-\u2013\u2014]+$")
_RANGE_RE = re.compile(r"^(\d{1,4})\s*[-\u2013\u2014]\s*(\d{1,4})$")

_BIB_SYSTEM = f"""You extract bibliography entries from the reference-list text of an academic paper.
- Extract every entry that is actually present. Never invent or complete entries from memory.
- label: the printed number/label without brackets or punctuation (e.g. "12"); "" if unnumbered.
- title: the title of the cited work (not the journal). year: 4-digit year, 0 if absent.
- doi: only if printed in the entry, otherwise "". authors: names in citation order.
{PROMPT_INJECTION_RULES}"""

_CITATIONS_SYSTEM = f"""You extract inline citations from the body text of an academic paper.
- Return every sentence that contains an inline citation to another work: numeric markers such as \
[1], [2,3], [4-6], (7), or author-year markers such as (Smith et al., 2020).
- claim_text must be a VERBATIM copy of that single sentence from the text (no paraphrasing).
- markers: the citation markers in that sentence. Expand numeric ranges into individual numbers \
(e.g. [3-5] -> "3","4","5"). For author-year citations give each marker text, e.g. "Smith et al., 2020".
- Ignore the reference list itself, figure/table captions without citations and self-references.
- document_title: the paper's title, or "" if unclear.
{PROMPT_INJECTION_RULES}"""


def _wrap(text: str) -> str:
    return f"<{UNTRUSTED_CLAIM_TAG}>\n{sanitize_untrusted(text)}\n</{UNTRUSTED_CLAIM_TAG}>"


def _split_body_and_references(full_text: str) -> tuple[str, str]:
    matches = [m for m in _REF_HEADING_RE.finditer(full_text) if m.start() > len(full_text) * 0.3]
    if matches:
        heading = matches[-1]
        return full_text[: heading.start()], full_text[heading.end() :]
    return full_text, full_text[int(len(full_text) * 0.7) :]


def _surname(author: str) -> str:
    author = author.strip()
    if "," in author:
        return author.split(",")[0].strip().lower()
    parts = author.split()
    return parts[-1].lower() if parts else ""


def _expand_marker(marker: str) -> list[str]:
    stripped = marker.strip().strip("[]()")
    if not stripped:
        return []
    if not _NUMERIC_MARKER_RE.match(stripped):
        return [marker.strip()]
    numbers: list[str] = []
    for part in re.split(r"[;,]", stripped):
        part = part.strip()
        if not part:
            continue
        range_match = _RANGE_RE.match(part)
        if range_match:
            low, high = int(range_match.group(1)), int(range_match.group(2))
            if low <= high and high - low <= 50:
                numbers.extend(str(n) for n in range(low, high + 1))
                continue
        if part.isdigit():
            numbers.append(str(int(part)))
    return numbers


def _resolve_marker(
    marker: str, entries: list[BibEntry], labels: dict[str, BibEntry]
) -> BibEntry | None:
    if marker.isdigit():
        if marker in labels:
            return labels[marker]
        if not labels and 1 <= int(marker) <= len(entries):
            return entries[int(marker) - 1]
        return None
    year = parse_year(marker)
    lowered = marker.lower()
    matches = [
        entry
        for entry in entries
        if entry.authors
        and _surname(entry.authors[0])
        and _surname(entry.authors[0]) in lowered
        and (year is None or entry.year == year)
    ]
    return matches[0] if matches else None


def _locate_sentence(claim: str, normalized_sentences: list[str]) -> int | None:
    normalized_claim = normalize_for_match(claim)
    if not normalized_claim or not normalized_sentences:
        return None
    for index, sentence in enumerate(normalized_sentences):
        if sentence == normalized_claim:
            return index
    for index, sentence in enumerate(normalized_sentences):
        if normalized_claim in sentence or (len(sentence) > 30 and sentence in normalized_claim):
            return index
    match = process.extractOne(
        normalized_claim, normalized_sentences, scorer=fuzz.ratio, score_cutoff=80
    )
    return int(match[2]) if match else None


def parse_with_fallback(pdf_bytes: bytes) -> ParsedDocument:
    settings = get_settings()
    try:
        pages = extract_pdf_pages(
            pdf_bytes, max_pages=MAX_PAGES, max_chars=MAX_TOTAL_CHARS, clean=False
        )
    except ValueError as exc:
        raise PipelineError(f"Could not read the PDF: {exc}") from exc
    if not pages:
        raise PipelineError("No extractable text found in the PDF (is it a scanned document?)")

    full_text = "\n".join(page.text for page in pages)
    body_raw, references_raw = _split_body_and_references(full_text)
    body_text = clean_extracted_page_text(body_raw)[:MAX_BODY_CHARS]
    references_text = clean_extracted_page_text(references_raw)[:MAX_BIB_CHARS]
    if not references_text:
        raise PipelineError("Could not locate a reference list in the PDF")

    model = settings.gemini_fast_model
    with ThreadPoolExecutor(max_workers=2) as pool:
        bib_future = pool.submit(
            generate_structured,
            model=model,
            system_instruction=_BIB_SYSTEM,
            contents="Extract the bibliography entries.\n\n" + _wrap(references_text),
            schema=ExtractedBibliography,
            temperature=0.0,
            max_output_tokens=32768,
            thinking_budget=0,
        )
        cit_future = pool.submit(
            generate_structured,
            model=model,
            system_instruction=_CITATIONS_SYSTEM,
            contents="Extract the inline-citation sentences.\n\n" + _wrap(body_text),
            schema=ExtractedCitations,
            temperature=0.0,
            max_output_tokens=32768,
            thinking_budget=0,
        )
        extracted_bib = bib_future.result()
        extracted_citations = cit_future.result()

    entries: list[BibEntry] = []
    labels: dict[str, BibEntry] = {}
    for index, item in enumerate(extracted_bib.entries, start=1):
        entry = BibEntry(
            bib_id=f"b{index}",
            title=normalize_whitespace(item.title) or None,
            authors=[normalize_whitespace(a) for a in item.authors if a.strip()],
            year=item.year if item.year and item.year > 0 else None,
            doi=normalize_doi(item.doi),
            venue=normalize_whitespace(item.venue) or None,
        )
        entries.append(entry)
        label = item.label.strip().strip("[]().")
        if label:
            labels[label] = entry

    sentences = split_sentences(body_text)
    normalized_sentences = [normalize_for_match(s) for s in sentences]

    citations: list[CitationInstance] = []
    for item in extracted_citations.citations:
        claim = normalize_whitespace(item.claim_text)
        if len(claim) < 15:
            continue
        targets: list[BibEntry] = []
        for marker in item.markers:
            for expanded in _expand_marker(marker):
                entry = _resolve_marker(expanded, entries, labels)
                if entry is not None and all(entry.bib_id != t.bib_id for t in targets):
                    targets.append(entry)
        if not targets:
            logger.debug("No bibliography match for markers %s", item.markers)
            continue
        index = _locate_sentence(claim, normalized_sentences)
        if index is None:
            window = claim
        else:
            window = " ".join(
                sentences[max(0, index - CONTEXT_RADIUS) : index + CONTEXT_RADIUS + 1]
            )
        for entry in targets:
            citations.append(
                CitationInstance(
                    citation_id=f"c{len(citations) + 1}",
                    claim_text=claim,
                    context_window=window,
                    target_bib=entry,
                )
            )

    return ParsedDocument(
        title=normalize_whitespace(extracted_citations.document_title) or None,
        parser="gemini_fallback",
        bibliography={entry.bib_id: entry for entry in entries},
        citations=citations,
    )
