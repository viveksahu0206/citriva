"""Pydantic v2 models: API contracts, pipeline data structures and the final report."""

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

JobStatus = Literal["queued", "processing", "completed", "failed"]
JobStage = Literal["parsing", "filtering", "retrieving", "judging", "finalizing"]
Verdict = Literal[
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "UNSUPPORTED",
    "CONTRADICTORY",
    "POTENTIALLY_OUTDATED",
]
ClaimStatus = Literal["JUDGED", "CITATION_NOT_FOUND", "NO_SOURCE_TEXT", "ERROR"]
EvidenceSource = Literal["full_text", "abstract_only", "none"]
ParserName = Literal["grobid", "gemini_fallback"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------------------------------
# Authentication & Memory Address Profiles
# --------------------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    full_name: str
    memory_address: str  # email or phone
    memory_type: Literal["email", "phone"]
    institution: str
    role: str
    domain: str
    password: str


class LoginRequest(BaseModel):
    memory_address: str
    password: str


class VerifyCodeRequest(BaseModel):
    memory_address: str
    code: str


class AuthProfileResponse(BaseModel):
    id: str
    full_name: str
    memory_address: str
    memory_type: str
    institution: str
    role: str
    domain: str
    verified: bool
    session_token: str


# --------------------------------------------------------------------------------------
# Parsing
# --------------------------------------------------------------------------------------
class BibEntry(BaseModel):
    bib_id: str
    title: str | None = None
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    doi: str | None = None
    venue: str | None = None
    raw_reference: str | None = None


class CitationInstance(BaseModel):
    citation_id: str
    claim_text: str
    context_window: str
    target_bib: BibEntry


class ParsedDocument(BaseModel):
    title: str | None = None
    parser: ParserName
    bibliography: dict[str, BibEntry] = Field(default_factory=dict)
    citations: list[CitationInstance] = Field(default_factory=list)


# --- Gemini structured-output schemas (no defaults, for maximum SDK compatibility) ----
class ExtractedBibEntry(BaseModel):
    label: str = Field(description="Printed reference label/number without brackets, or '' if none.")
    title: str = Field(description="Title of the cited work, or '' if unknown.")
    authors: list[str] = Field(description="Author names in citation order.")
    year: int = Field(description="Publication year, or 0 if unknown.")
    doi: str = Field(description="DOI if printed in the entry, otherwise ''.")
    venue: str = Field(description="Journal/conference/publisher, or ''.")


class ExtractedBibliography(BaseModel):
    entries: list[ExtractedBibEntry]


class ExtractedCitation(BaseModel):
    claim_text: str = Field(description="Verbatim single sentence containing the inline citation.")
    markers: list[str] = Field(description="Citation markers found in that sentence.")


class ExtractedCitations(BaseModel):
    document_title: str = Field(description="Title of the paper, or '' if unknown.")
    citations: list[ExtractedCitation]


class FilterDecision(BaseModel):
    citation_id: str
    keep: bool = Field(
        description="True only if the sentence makes an empirical, factual or theoretical claim "
        "attributed to the cited work that can be checked against that work's text."
    )
    reason: str = Field(description="One short sentence explaining the decision.")


class FilterResult(BaseModel):
    decisions: list[FilterDecision]


# --------------------------------------------------------------------------------------
# Retrieval / passages
# --------------------------------------------------------------------------------------
class SourcePage(BaseModel):
    page_number: int | None = None
    text: str


class ResolvedSource(BaseModel):
    bib_id: str
    resolved: bool
    lookup_failed: bool = False
    error: str | None = None
    matched_via: Literal["doi", "title", "none"] = "none"
    matched_title: str | None = None
    matched_year: int | None = None
    matched_doi: str | None = None
    evidence_source: EvidenceSource = "none"
    source_url: str | None = None
    pages: list[SourcePage] = Field(default_factory=list)


class Chunk(BaseModel):
    chunk_index: int
    page_number: int | None = None
    text: str


class Passage(BaseModel):
    chunk_index: int
    page_number: int | None = None
    text: str
    score: float = 0.0


# --------------------------------------------------------------------------------------
# NLI judging
# --------------------------------------------------------------------------------------
class JudgeOutput(BaseModel):
    verdict: Verdict = Field(description="Relationship between the claim and the source passages.")
    exact_quote: str = Field(
        description="Verbatim, contiguous substring of ONE provided passage that best supports "
        "the verdict. Empty string if no passage is relevant."
    )
    explanation: str = Field(description="Exactly two concise, objective sentences.")
    confidence_score: float = Field(description="Confidence between 0.0 and 1.0.")


class GuardrailedVerdict(BaseModel):
    verdict: Verdict
    exact_quote: str
    explanation: str
    confidence_score: float
    quote_verified: bool | None
    needs_human_review: bool
    source_page: int | None = None


# --------------------------------------------------------------------------------------
# Report
# --------------------------------------------------------------------------------------
class ClaimVerification(BaseModel):
    citation_id: str
    claim_text: str
    context_window: str
    cited_reference: BibEntry
    status: ClaimStatus
    verdict: Verdict | None = None
    exact_quote: str = ""
    explanation: str = ""
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)
    quote_verified: bool | None = None
    needs_human_review: bool = True
    evidence_source: EvidenceSource = "none"
    source_title: str | None = None
    source_url: str | None = None
    source_page: int | None = None
    error: str | None = None


class SkippedCitation(BaseModel):
    citation_id: str
    bib_id: str
    claim_text: str
    cited_title: str | None = None
    reason: str


class ReportSummary(BaseModel):
    total_citations_extracted: int = 0
    total_verifiable: int = 0
    total_skipped: int = 0
    supported: int = 0
    partially_supported: int = 0
    unsupported: int = 0
    contradictory: int = 0
    potentially_outdated: int = 0
    citation_not_found: int = 0
    no_source_text: int = 0
    errors: int = 0
    needs_human_review: int = 0
    full_text_evidence: int = 0
    abstract_only_evidence: int = 0


class VerificationReport(BaseModel):
    job_id: str
    filename: str | None = None
    document_title: str | None = None
    generated_at: datetime = Field(default_factory=utc_now)
    parser: ParserName
    summary: ReportSummary
    claims: list[ClaimVerification] = Field(default_factory=list)
    skipped_citations: list[SkippedCitation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# --------------------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------------------
class UploadResponse(BaseModel):
    job_id: str
    status: JobStatus = "queued"


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    stage: JobStage | None = None
    progress: int = Field(default=0, ge=0, le=100)
    error: str | None = None
    report: VerificationReport | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "unhealthy"]
    redis: Literal["up", "down"]
