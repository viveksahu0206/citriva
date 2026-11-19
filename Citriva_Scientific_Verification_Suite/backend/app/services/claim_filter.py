"""Batched Gemini filter that keeps only verifiable empirical/factual/theoretical claims."""

import logging

from app.core.config import get_settings
from app.models.schemas import CitationInstance, FilterDecision, FilterResult, SkippedCitation
from app.services.gemini_client import generate_structured
from app.services.guardrails import PROMPT_INJECTION_RULES, wrap_untrusted_claim

logger = logging.getLogger("citriva.filter")

MAX_BATCH = 150  # safety valve; typical papers (<=150 citations) use exactly one call

_SYSTEM = f"""You are a precise research-integrity assistant. For each citing sentence taken from \
an academic paper, decide whether it should be verified against the full text of the cited work.

KEEP (keep=true) only when the sentence makes an empirical, factual, quantitative or theoretical \
claim attributed to the cited work that can be checked against that work's text (findings, \
measured values, effects, proven results, specific conclusions).

DROP (keep=false) for: background or review pointers ("see Smith et al. for a review"), mentions \
of standard software, libraries, datasets, tools or methods that were merely used or implemented \
("implemented in PyTorch [12]"), general definitions or common knowledge, structural pointers \
("as in [3]") that assert nothing specific, and acknowledgements.

Return exactly one decision for every citation_id provided, each with a one-sentence reason.
{PROMPT_INJECTION_RULES}"""


def _batches(items: list[CitationInstance], size: int) -> list[list[CitationInstance]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _payload(batch: list[CitationInstance]) -> dict:
    return {
        "citations": [
            {
                "citation_id": c.citation_id,
                "claim_text": c.claim_text,
                "cited_work": {
                    "title": c.target_bib.title,
                    "authors": c.target_bib.authors[:3],
                    "year": c.target_bib.year,
                },
            }
            for c in batch
        ]
    }


def filter_claims(
    citations: list[CitationInstance],
) -> tuple[list[CitationInstance], list[SkippedCitation]]:
    """Return (kept citations, skipped citations with filter reasons)."""
    if not citations:
        return [], []

    settings = get_settings()
    decisions: dict[str, FilterDecision] = {}
    for batch in _batches(citations, MAX_BATCH):
        result = generate_structured(
            model=settings.gemini_fast_model,
            system_instruction=_SYSTEM,
            contents="Classify every citation.\n\n" + wrap_untrusted_claim(_payload(batch)),
            schema=FilterResult,
            temperature=0.0,
            max_output_tokens=16384,
            thinking_budget=0,
        )
        for decision in result.decisions:
            decisions[decision.citation_id] = decision

    kept: list[CitationInstance] = []
    skipped: list[SkippedCitation] = []
    for citation in citations:
        decision = decisions.get(citation.citation_id)
        if decision is None:
            logger.warning("No filter decision for %s; keeping it for verification", citation.citation_id)
            kept.append(citation)
        elif decision.keep:
            kept.append(citation)
        else:
            skipped.append(
                SkippedCitation(
                    citation_id=citation.citation_id,
                    bib_id=citation.target_bib.bib_id,
                    claim_text=citation.claim_text,
                    cited_title=citation.target_bib.title,
                    reason=decision.reason.strip() or "Not a verifiable claim",
                )
            )
    return kept, skipped
