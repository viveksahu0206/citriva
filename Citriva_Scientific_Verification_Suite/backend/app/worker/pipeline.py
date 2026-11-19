"""End-to-end verification pipeline (Stages A-E) executed inside a Celery worker."""

import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

import redis
from celery.exceptions import SoftTimeLimitExceeded

from app.core.config import get_settings
from app.core.redis_client import get_sync_redis, job_key, pdf_key
from app.models.schemas import (
    CitationInstance,
    ClaimVerification,
    Chunk,
    ParsedDocument,
    Passage,
    ReportSummary,
    ResolvedSource,
    SkippedCitation,
    VerificationReport,
    utc_now,
)
from app.services.chunker import chunk_pages, rank_passages
from app.services.claim_filter import filter_claims
from app.services.errors import PipelineError
from app.services.fallback_parser import parse_with_fallback
from app.services.gemini_client import GeminiConfigurationError
from app.services.grobid_parser import parse_with_grobid
from app.services.nli_judge import judge_claim
from app.services.retriever import LiteratureRetriever
from app.models.schemas import BibEntry

logger = logging.getLogger("citriva.pipeline")


class JobStore:
    """Atomic job-state updates in a Redis hash (``citriva:job:{job_id}``)."""

    def __init__(self, job_id: str) -> None:
        self._job_id = job_id
        self._redis = get_sync_redis()
        self._ttl = get_settings().job_ttl_seconds
        self._progress = 0
        self._lock = threading.Lock()

    def update(
        self,
        *,
        status: str | None = None,
        stage: str | None = None,
        progress: int | None = None,
        error: str | None = None,
        report_json: str | None = None,
    ) -> None:
        mapping: dict[str, str | int] = {"updated_at": utc_now().isoformat()}
        if status is not None:
            mapping["status"] = status
        if stage is not None:
            mapping["stage"] = stage
        if progress is not None:
            with self._lock:
                self._progress = max(self._progress, min(100, progress))
                mapping["progress"] = self._progress
        if error is not None:
            mapping["error"] = error
        if report_json is not None:
            mapping["report"] = report_json
        pipe = self._redis.pipeline(transaction=True)
        pipe.hset(job_key(self._job_id), mapping=mapping)
        pipe.expire(job_key(self._job_id), self._ttl)
        pipe.execute()


# --------------------------------------------------------------------------- Stage A
def _parse_document(pdf_bytes: bytes) -> ParsedDocument:
    settings = get_settings()
    grobid_result: ParsedDocument | None = None
    if settings.grobid_url:
        try:
            grobid_result = parse_with_grobid(pdf_bytes)
            if grobid_result.citations:
                return grobid_result
            logger.warning("GROBID found no citations; trying the PyMuPDF+Gemini fallback")
        except Exception as exc:
            logger.warning("GROBID parsing failed (%s: %s); using fallback", type(exc).__name__, exc)
    try:
        return parse_with_fallback(pdf_bytes)
    except Exception:
        if grobid_result is not None:
            return grobid_result
        raise


# --------------------------------------------------------------------------- Stage C
def _safe_resolve(retriever: LiteratureRetriever, bib: BibEntry) -> ResolvedSource:
    try:
        return retriever.resolve(bib)
    except Exception as exc:
        logger.exception("Retrieval failed for %s", bib.bib_id)
        return ResolvedSource(
            bib_id=bib.bib_id,
            resolved=False,
            lookup_failed=True,
            error=f"{type(exc).__name__}: {exc}"[:300],
        )


def _resolve_sources(bibs: dict[str, BibEntry], store: JobStore) -> dict[str, ResolvedSource]:
    settings = get_settings()
    results: dict[str, ResolvedSource] = {}
    if not bibs:
        return results
    total, done = len(bibs), 0
    with LiteratureRetriever(settings) as retriever, ThreadPoolExecutor(
        max_workers=settings.worker_threads, thread_name_prefix="resolve"
    ) as pool:
        futures = {pool.submit(_safe_resolve, retriever, bib): bib_id for bib_id, bib in bibs.items()}
        for future in as_completed(futures):
            results[futures[future]] = future.result()
            done += 1
            store.update(progress=55 + int(13 * done / total))
    return results


# --------------------------------------------------------------------------- Stage D
def _rank_all(
    citations: list[CitationInstance], sources: dict[str, ResolvedSource]
) -> dict[str, list[Passage]]:
    settings = get_settings()
    chunk_cache: dict[str, list[Chunk]] = {}
    passages: dict[str, list[Passage]] = {}
    for citation in citations:
        bib_id = citation.target_bib.bib_id
        source = sources.get(bib_id)
        if source is None or not source.resolved or not source.pages:
            continue
        try:
            if bib_id not in chunk_cache:
                chunk_cache[bib_id] = chunk_pages(
                    source.pages, settings.chunk_size, settings.chunk_overlap
                )
            passages[citation.citation_id] = rank_passages(
                chunk_cache[bib_id],
                citation.claim_text,
                citation.context_window,
                settings.top_k_passages,
            )
        except Exception:
            logger.exception("Passage ranking failed for %s", citation.citation_id)
    return passages


# --------------------------------------------------------------------------- Stage E
def _verify_one(
    citation: CitationInstance,
    source: ResolvedSource | None,
    passages: list[Passage],
) -> ClaimVerification:
    """Verify a single claim. Never raises: failures become an ERROR-status claim."""
    base = {
        "citation_id": citation.citation_id,
        "claim_text": citation.claim_text,
        "context_window": citation.context_window,
        "cited_reference": citation.target_bib,
    }
    if source is None or (not source.resolved and source.lookup_failed):
        return ClaimVerification(
            **base,
            status="ERROR",
            error=(source.error if source else None) or "Reference lookup did not complete",
            explanation="The reference could not be checked because the bibliographic "
            "services were unreachable. Retry later.",
        )
    if not source.resolved:
        return ClaimVerification(
            **base,
            status="CITATION_NOT_FOUND",
            explanation="No matching publication was found in OpenAlex or Semantic Scholar by "
            "DOI or title. The reference may be fabricated, garbled or mis-cited.",
        )
    base.update(
        source_title=source.matched_title,
        source_url=source.source_url,
        evidence_source=source.evidence_source,
    )
    if not source.pages:
        return ClaimVerification(
            **base,
            status="NO_SOURCE_TEXT",
            explanation="The publication exists, but neither its full text nor its abstract "
            "could be retrieved, so the claim cannot be verified automatically.",
        )
    if not passages:
        return ClaimVerification(
            **base, status="ERROR", error="No evidence passages could be prepared for this claim"
        )
    try:
        verdict = judge_claim(citation, source, passages)
    except Exception as exc:
        logger.exception("Judging failed for %s", citation.citation_id)
        return ClaimVerification(
            **base, status="ERROR", error=f"{type(exc).__name__}: {exc}"[:300]
        )
    return ClaimVerification(
        **base,
        status="JUDGED",
        verdict=verdict.verdict,
        exact_quote=verdict.exact_quote,
        explanation=verdict.explanation,
        confidence_score=verdict.confidence_score,
        quote_verified=verdict.quote_verified,
        needs_human_review=verdict.needs_human_review,
        source_page=verdict.source_page,
    )


def _judge_all(
    citations: list[CitationInstance],
    sources: dict[str, ResolvedSource],
    passages: dict[str, list[Passage]],
    store: JobStore,
) -> list[ClaimVerification]:
    settings = get_settings()
    results: dict[str, ClaimVerification] = {}
    if not citations:
        return []
    total, done = len(citations), 0
    with ThreadPoolExecutor(max_workers=settings.worker_threads, thread_name_prefix="judge") as pool:
        futures = {
            pool.submit(
                _verify_one, c, sources.get(c.target_bib.bib_id), passages.get(c.citation_id, [])
            ): c
            for c in citations
        }
        for future in as_completed(futures):
            citation = futures[future]
            try:
                results[citation.citation_id] = future.result()
            except Exception as exc:  # defensive: _verify_one should never raise
                results[citation.citation_id] = ClaimVerification(
                    citation_id=citation.citation_id,
                    claim_text=citation.claim_text,
                    context_window=citation.context_window,
                    cited_reference=citation.target_bib,
                    status="ERROR",
                    error=f"{type(exc).__name__}: {exc}"[:300],
                )
            done += 1
            store.update(progress=90 + int(6 * done / total))
    return [results[c.citation_id] for c in citations]


# --------------------------------------------------------------------------- Reporting
def _summarize(total_extracted: int, claims: list[ClaimVerification], skipped_count: int) -> ReportSummary:
    summary = ReportSummary(
        total_citations_extracted=total_extracted,
        total_verifiable=len(claims),
        total_skipped=skipped_count,
    )
    for claim in claims:
        if claim.status == "JUDGED" and claim.verdict:
            attr = claim.verdict.lower()
            setattr(summary, attr, getattr(summary, attr) + 1)
            if claim.evidence_source == "full_text":
                summary.full_text_evidence += 1
            elif claim.evidence_source == "abstract_only":
                summary.abstract_only_evidence += 1
        elif claim.status == "CITATION_NOT_FOUND":
            summary.citation_not_found += 1
        elif claim.status == "NO_SOURCE_TEXT":
            summary.no_source_text += 1
        else:
            summary.errors += 1
        if claim.needs_human_review:
            summary.needs_human_review += 1
    return summary


def _execute(
    job_id: str, filename: str | None, pdf_bytes: bytes, store: JobStore
) -> VerificationReport:
    settings = get_settings()
    warnings: list[str] = []

    # Stage A: parsing & context extraction
    parsed = _parse_document(pdf_bytes)
    citations = parsed.citations
    if len(citations) > settings.max_citations:
        warnings.append(
            f"The document contains {len(citations)} citation instances; only the first "
            f"{settings.max_citations} were analysed."
        )
        citations = citations[: settings.max_citations]
    if not parsed.citations:
        warnings.append("No inline citations were detected in this document.")

    # Stage B: verifiable-claim filtering
    store.update(stage="filtering", progress=30)
    kept, skipped = filter_claims(citations)

    # Stage C: literature retrieval waterfall
    store.update(stage="retrieving", progress=55)
    unique_bibs = {c.target_bib.bib_id: c.target_bib for c in kept}
    sources = _resolve_sources(unique_bibs, store)

    # Stage D: chunking & passage ranking
    store.update(stage="retrieving", progress=70)
    passages = _rank_all(kept, sources)

    # Stage E: NLI verification
    store.update(stage="judging", progress=90)
    claims = _judge_all(kept, sources, passages, store)

    store.update(stage="finalizing", progress=97)
    skipped_list: list[SkippedCitation] = skipped
    return VerificationReport(
        job_id=job_id,
        filename=filename,
        document_title=parsed.title,
        parser=parsed.parser,
        summary=_summarize(len(parsed.citations), claims, len(skipped_list)),
        claims=claims,
        skipped_citations=skipped_list,
        warnings=warnings,
    )


def _fail(store: JobStore, message: str) -> None:
    try:
        store.update(status="failed", error=message)
    except redis.RedisError:
        logger.exception("Could not record failure state")


def run_pipeline(job_id: str, filename: str | None = None) -> None:
    """Execute the pipeline for ``job_id``; always cleans up the transient PDF key."""
    store = JobStore(job_id)
    pdf_redis = get_sync_redis(binary=True)
    try:
        store.update(status="processing", stage="parsing", progress=15)
        pdf_bytes = pdf_redis.get(pdf_key(job_id))
        if not pdf_bytes:
            raise PipelineError(
                "The uploaded PDF is no longer available (it may have expired). Please upload it again."
            )
        report = _execute(job_id, filename, bytes(pdf_bytes), store)
        store.update(
            status="completed", stage="finalizing", progress=100, report_json=report.model_dump_json()
        )
        logger.info("Job %s completed (%d claims)", job_id, len(report.claims))
    except SoftTimeLimitExceeded:
        logger.error("Job %s exceeded the soft time limit", job_id)
        _fail(store, "Processing exceeded the time limit. Try a shorter document.")
    except PipelineError as exc:
        logger.warning("Job %s failed: %s", job_id, exc)
        _fail(store, str(exc))
    except GeminiConfigurationError:
        logger.error("Job %s failed: GEMINI_API_KEY is not configured", job_id)
        _fail(store, "Server configuration error: the language-model API key is missing.")
    except Exception as exc:
        logger.exception("Job %s failed unexpectedly", job_id)
        _fail(store, f"Unexpected error while processing the document ({type(exc).__name__}).")
    finally:
        try:
            pdf_redis.delete(pdf_key(job_id))
        except redis.RedisError:
            logger.warning("Could not delete transient PDF for job %s", job_id)
