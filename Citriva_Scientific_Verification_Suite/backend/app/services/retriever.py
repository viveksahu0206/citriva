"""Literature retrieval waterfall: OpenAlex / Semantic Scholar / Unpaywall / PyMuPDF."""

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar
from urllib.parse import quote

import httpx
from rapidfuzz import fuzz
from rapidfuzz import utils as rf_utils

from app.core.config import Settings, get_settings
from app.models.schemas import BibEntry, ResolvedSource, SourcePage
from app.services.http_utils import retry_transient
from app.services.pdf_text import extract_pdf_pages
from app.services.text_utils import clean_extracted_page_text, normalize_doi, strip_html_tags

logger = logging.getLogger("citriva.retriever")

OPENALEX_BASE = "https://api.openalex.org"
S2_BASE = "https://api.semanticscholar.org/graph/v1"
UNPAYWALL_BASE = "https://api.unpaywall.org/v2"

OPENALEX_SELECT = (
    "id,doi,title,display_name,publication_year,abstract_inverted_index,"
    "open_access,best_oa_location,primary_location"
)
S2_FIELDS = "title,year,abstract,externalIds,openAccessPdf,venue"

TITLE_MATCH_THRESHOLD = 85  # rapidfuzz token_sort_ratio
DOI_TITLE_SANITY_THRESHOLD = 50  # guards against a DOI that resolves to an unrelated paper
MIN_FULLTEXT_CHARS = 1500
MAX_TOTAL_PDF_ATTEMPTS = 3
_DOI_SAFE = "/:()-._~;"

T = TypeVar("T")


class LookupUnavailable(Exception):
    """A metadata service could not be reached (distinct from 'not found')."""


@dataclass
class _WorkRecord:
    title: str | None
    year: int | None
    doi: str | None
    abstract: str | None
    oa_urls: list[str] = field(default_factory=list)


def _dedupe(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for url in urls:
        if url and url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def _merge(first: _WorkRecord | None, second: _WorkRecord | None) -> _WorkRecord | None:
    if first is None:
        return second
    if second is None:
        return first
    return _WorkRecord(
        title=first.title or second.title,
        year=first.year or second.year,
        doi=first.doi or second.doi,
        abstract=first.abstract or second.abstract,
        oa_urls=_dedupe(first.oa_urls + second.oa_urls),
    )


def _invert_abstract(index: Any) -> str | None:
    if not isinstance(index, dict):
        return None
    positions: list[tuple[int, str]] = []
    for word, locations in index.items():
        if isinstance(locations, list):
            positions.extend((int(pos), word) for pos in locations if isinstance(pos, int))
    positions.sort()
    text = " ".join(word for _, word in positions).strip()
    return text or None


def _record_from_openalex(work: dict[str, Any]) -> _WorkRecord:
    urls: list[str] = []
    best = work.get("best_oa_location") or {}
    primary = work.get("primary_location") or {}
    open_access = work.get("open_access") or {}
    if isinstance(best, dict):
        urls.append(best.get("pdf_url") or "")
    if isinstance(open_access, dict):
        urls.append(open_access.get("oa_url") or "")
    if isinstance(primary, dict):
        urls.append(primary.get("pdf_url") or "")
    title = work.get("title") or work.get("display_name")
    year = work.get("publication_year")
    return _WorkRecord(
        title=strip_html_tags(title) if isinstance(title, str) and title else None,
        year=year if isinstance(year, int) else None,
        doi=normalize_doi(work.get("doi")),
        abstract=_invert_abstract(work.get("abstract_inverted_index")),
        oa_urls=_dedupe(urls),
    )


def _record_from_s2(paper: dict[str, Any]) -> _WorkRecord:
    open_pdf = paper.get("openAccessPdf") or {}
    external = paper.get("externalIds") or {}
    title = paper.get("title")
    year = paper.get("year")
    abstract = paper.get("abstract")
    return _WorkRecord(
        title=strip_html_tags(title) if isinstance(title, str) and title else None,
        year=year if isinstance(year, int) else None,
        doi=normalize_doi(external.get("DOI")) if isinstance(external, dict) else None,
        abstract=abstract.strip() if isinstance(abstract, str) and abstract.strip() else None,
        oa_urls=_dedupe([open_pdf.get("url") or ""] if isinstance(open_pdf, dict) else []),
    )


def _best_title_match(
    title: str, year: int | None, candidates: list[_WorkRecord]
) -> _WorkRecord | None:
    best: _WorkRecord | None = None
    best_score = 0.0
    for candidate in candidates:
        if not candidate.title:
            continue
        score = fuzz.token_sort_ratio(title, candidate.title, processor=rf_utils.default_process)
        if score < TITLE_MATCH_THRESHOLD:
            continue
        if year is not None and candidate.year is not None and abs(year - candidate.year) > 1:
            continue
        if score > best_score:
            best, best_score = candidate, score
    return best


class _RateLimiter:
    """Thread-safe minimum-interval limiter (Semantic Scholar is strictly rate limited)."""

    def __init__(self, min_interval: float) -> None:
        self._min_interval = min_interval
        self._next_slot = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + self._min_interval
        delay = slot - now
        if delay > 0:
            time.sleep(delay)


class LiteratureRetriever:
    """Resolves a bibliography entry to metadata + best available evidence text."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        s = self._settings
        contact = s.openalex_mailto or s.unpaywall_email
        user_agent = f"Citriva/1.0 (mailto:{contact})" if contact else "Citriva/1.0"
        self._client = httpx.Client(
            timeout=httpx.Timeout(
                connect=s.http_connect_timeout, read=s.http_read_timeout, write=15.0, pool=10.0
            ),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            headers={"User-Agent": user_agent, "Accept": "application/json"},
            follow_redirects=True,
        )
        self._s2_limiter = _RateLimiter(0.35 if s.semantic_scholar_api_key else 1.1)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "LiteratureRetriever":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    # ------------------------------------------------------------------ HTTP plumbing
    @retry_transient
    def _fetch(
        self, url: str, params: dict[str, Any] | None, headers: dict[str, str] | None
    ) -> httpx.Response:
        response = self._client.get(url, params=params, headers=headers)
        if response.status_code in (400, 404, 410, 422):
            return response
        response.raise_for_status()
        return response

    def _get_json(
        self,
        url: str,
        params: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        limiter: _RateLimiter | None = None,
    ) -> Any | None:
        if limiter is not None:
            limiter.wait()
        try:
            response = self._fetch(url, params, headers)
        except httpx.HTTPError as exc:
            raise LookupUnavailable(f"{url}: {exc.__class__.__name__}") from exc
        if response.status_code != 200:
            return None
        try:
            return response.json()
        except ValueError:
            return None

    def _s2_headers(self) -> dict[str, str] | None:
        key = self._settings.semantic_scholar_api_key
        return {"x-api-key": key} if key else None

    def _openalex_params(self, extra: dict[str, Any]) -> dict[str, Any]:
        params = dict(extra)
        if self._settings.openalex_mailto:
            params["mailto"] = self._settings.openalex_mailto
        return params

    # --------------------------------------------------------------- metadata lookups
    def _openalex_by_doi(self, doi: str) -> _WorkRecord | None:
        data = self._get_json(
            f"{OPENALEX_BASE}/works/https://doi.org/{quote(doi, safe=_DOI_SAFE)}",
            params=self._openalex_params({"select": OPENALEX_SELECT}),
        )
        if isinstance(data, dict) and data.get("id"):
            return _record_from_openalex(data)
        return None

    def _s2_by_doi(self, doi: str) -> _WorkRecord | None:
        data = self._get_json(
            f"{S2_BASE}/paper/DOI:{quote(doi, safe=_DOI_SAFE)}",
            params={"fields": S2_FIELDS},
            headers=self._s2_headers(),
            limiter=self._s2_limiter,
        )
        if isinstance(data, dict) and data.get("paperId"):
            return _record_from_s2(data)
        return None

    def _openalex_by_title(self, title: str, year: int | None) -> _WorkRecord | None:
        data = self._get_json(
            f"{OPENALEX_BASE}/works",
            params=self._openalex_params(
                {"search": title, "per-page": 5, "select": OPENALEX_SELECT}
            ),
        )
        results = data.get("results") if isinstance(data, dict) else None
        if not isinstance(results, list):
            return None
        candidates = [_record_from_openalex(w) for w in results if isinstance(w, dict)]
        return _best_title_match(title, year, candidates)

    def _s2_by_title(self, title: str, year: int | None) -> _WorkRecord | None:
        data = self._get_json(
            f"{S2_BASE}/paper/search",
            params={"query": title, "limit": 5, "fields": S2_FIELDS},
            headers=self._s2_headers(),
            limiter=self._s2_limiter,
        )
        results = data.get("data") if isinstance(data, dict) else None
        if not isinstance(results, list):
            return None
        candidates = [_record_from_s2(p) for p in results if isinstance(p, dict)]
        return _best_title_match(title, year, candidates)

    def _unpaywall_urls(self, doi: str) -> list[str]:
        email = self._settings.unpaywall_email
        if not email:
            return []
        data = self._get_json(
            f"{UNPAYWALL_BASE}/{quote(doi, safe=_DOI_SAFE)}", params={"email": email}
        )
        if not isinstance(data, dict):
            return []
        locations = [data.get("best_oa_location"), *(data.get("oa_locations") or [])]
        urls = [
            loc.get("url_for_pdf") or ""
            for loc in locations
            if isinstance(loc, dict)
        ]
        return _dedupe(urls)

    # ----------------------------------------------------------------- PDF acquisition
    @retry_transient
    def _download_pdf_once(self, url: str) -> bytes | None:
        s = self._settings
        deadline = time.monotonic() + s.pdf_download_deadline_seconds
        buffer = bytearray()
        with self._client.stream(
            "GET", url, headers={"Accept": "application/pdf,*/*;q=0.8"}
        ) as response:
            if response.status_code == 429 or response.status_code >= 500:
                response.raise_for_status()
            if response.status_code != 200:
                return None
            header_checked = False
            for chunk in response.iter_bytes(65536):
                buffer.extend(chunk)
                if not header_checked and len(buffer) >= 5:
                    if b"%PDF-" not in bytes(buffer[:1024]):
                        return None
                    header_checked = True
                if len(buffer) > s.pdf_download_max_bytes or time.monotonic() > deadline:
                    return None
        return bytes(buffer) if b"%PDF-" in bytes(buffer[:1024]) else None

    def _download_pdf(self, url: str) -> bytes | None:
        try:
            return self._download_pdf_once(url)
        except httpx.HTTPError as exc:
            logger.info("PDF download failed for %s: %s", url, exc.__class__.__name__)
            return None

    def _try_pdf_urls(self, urls: list[str], tried: set[str]) -> tuple[list[SourcePage], str | None]:
        s = self._settings
        for url in urls:
            if url in tried:
                continue
            if len(tried) >= MAX_TOTAL_PDF_ATTEMPTS:
                break
            tried.add(url)
            data = self._download_pdf(url)
            if not data:
                continue
            try:
                pages = extract_pdf_pages(
                    data, max_pages=s.source_max_pages, max_chars=s.source_max_chars
                )
            except Exception as exc:  # corrupt / encrypted PDFs must not abort the job
                logger.info("Could not extract text from %s: %s", url, exc)
                continue
            if sum(len(p.text) for p in pages) >= MIN_FULLTEXT_CHARS:
                return pages, url
        return [], None

    # --------------------------------------------------------------------- main entry
    def resolve(self, bib: BibEntry) -> ResolvedSource:
        """Run the retrieval waterfall for one bibliography entry."""
        failures: list[str] = []

        def attempt(func: Callable[..., T], *args: Any) -> T | None:
            try:
                return func(*args)
            except LookupUnavailable as exc:
                failures.append(str(exc))
                return None

        record: _WorkRecord | None = None
        via: str = "none"
        s2_checked = False

        # 1. DOI lookup (OpenAlex, then Semantic Scholar)
        if bib.doi:
            record = attempt(self._openalex_by_doi, bib.doi)
            if record is None:
                record = attempt(self._s2_by_doi, bib.doi)
                s2_checked = True
            if record is not None and bib.title and record.title:
                sanity = fuzz.token_set_ratio(
                    bib.title, record.title, processor=rf_utils.default_process
                )
                if sanity < DOI_TITLE_SANITY_THRESHOLD:
                    logger.info(
                        "DOI %s resolves to an unrelated title; treating as unresolved", bib.doi
                    )
                    record = None
            if record is not None:
                via = "doi"

        # 2. Fuzzy title search
        if record is None and bib.title:
            record = attempt(self._openalex_by_title, bib.title, bib.year)
            if record is None:
                record = attempt(self._s2_by_title, bib.title, bib.year)
                s2_checked = True
            if record is not None:
                via = "title"

        # 3. Unresolved
        if record is None:
            return ResolvedSource(
                bib_id=bib.bib_id,
                resolved=False,
                lookup_failed=bool(failures),
                error="; ".join(failures[:3]) or None,
            )

        # 4. Full text (OpenAlex URLs -> Unpaywall -> Semantic Scholar) else abstract
        tried: set[str] = set()
        pages, source_url = self._try_pdf_urls(record.oa_urls, tried)
        doi = record.doi or bib.doi
        if not pages and doi and self._settings.unpaywall_email:
            pages, source_url = self._try_pdf_urls(attempt(self._unpaywall_urls, doi) or [], tried)
        if not pages and not s2_checked:
            enriched = attempt(self._enrich_with_s2, record)
            if enriched is not None:
                record = enriched
                pages, source_url = self._try_pdf_urls(record.oa_urls, tried)

        evidence: str = "none"
        if pages:
            evidence = "full_text"
        elif record.abstract:
            abstract = clean_extracted_page_text(record.abstract)
            if abstract:
                pages = [SourcePage(page_number=None, text=abstract)]
                evidence = "abstract_only"

        return ResolvedSource(
            bib_id=bib.bib_id,
            resolved=True,
            matched_via=via,  # type: ignore[arg-type]
            matched_title=record.title,
            matched_year=record.year,
            matched_doi=record.doi or bib.doi,
            evidence_source=evidence,  # type: ignore[arg-type]
            source_url=source_url,
            pages=pages,
        )

    def _enrich_with_s2(self, record: _WorkRecord) -> _WorkRecord | None:
        s2: _WorkRecord | None = None
        if record.doi:
            s2 = self._s2_by_doi(record.doi)
        if s2 is None and record.title:
            s2 = self._s2_by_title(record.title, record.year)
        return _merge(record, s2)
