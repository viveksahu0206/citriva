"""Gemini-based NLI judge with closed-world, injection-hardened prompts."""

import logging

from app.core.config import get_settings
from app.models.schemas import (
    CitationInstance,
    GuardrailedVerdict,
    JudgeOutput,
    Passage,
    ResolvedSource,
)
from app.services.gemini_client import generate_structured
from app.services.guardrails import (
    CLOSED_WORLD_RULES,
    PROMPT_INJECTION_RULES,
    apply_guardrails,
    wrap_untrusted_claim,
    wrap_untrusted_passages,
)

logger = logging.getLogger("citriva.judge")

_SYSTEM = f"""You are a rigorous scientific citation auditor performing natural language \
inference. Decide whether the provided passages from a CITED work support the claim that a \
CITING paper attributes to it.

VERDICTS:
- SUPPORTED: the passages directly state or clearly entail the claim, including its key specifics \
(numbers, direction of effect, scope).
- PARTIALLY_SUPPORTED: the passages support only part of the claim, or the claim overstates, \
generalises or changes the strength/scope/numbers of the finding.
- UNSUPPORTED: the passages do not address the claim (the cited work does not say this).
- CONTRADICTORY: the passages state the opposite of, or are incompatible with, the claim.
- POTENTIALLY_OUTDATED: the passages support the claim but themselves indicate the finding is \
preliminary, provisional, or later revised/superseded, or the claim asserts a present-day state \
that the cited work's publication year or wording makes doubtful.

{CLOSED_WORLD_RULES}
- If evidence_source is "abstract_only" you only see the abstract: absence of detail is not \
contradiction; use UNSUPPORTED or PARTIALLY_SUPPORTED with LOW confidence when the abstract is silent.

OUTPUT RULES:
- exact_quote: one contiguous, verbatim, character-for-character substring copied from a SINGLE \
passage (max ~300 characters, no ellipses, no paraphrase) that best supports your verdict. Use "" \
if no passage is relevant.
- explanation: EXACTLY two concise, objective sentences.
- confidence_score: 0.0-1.0, calibrated; lower it when evidence is indirect, partial or thin.

{PROMPT_INJECTION_RULES}"""


def judge_claim(
    citation: CitationInstance,
    source: ResolvedSource,
    passages: list[Passage],
) -> GuardrailedVerdict:
    """Judge one claim against its ranked passages and apply deterministic guardrails."""
    settings = get_settings()
    bib = citation.target_bib
    claim_payload = {
        "claim_text": citation.claim_text,
        "context_window": citation.context_window,
        "cited_work": {
            "title": source.matched_title or bib.title,
            "authors": bib.authors[:6],
            "year": source.matched_year or bib.year,
            "venue": bib.venue,
        },
        "evidence_source": source.evidence_source,
    }
    contents = (
        "Judge whether the source passages support the claim.\n\n"
        + wrap_untrusted_claim(claim_payload)
        + "\n\n"
        + wrap_untrusted_passages(passages)
    )
    output = generate_structured(
        model=settings.gemini_judge_model,
        system_instruction=_SYSTEM,
        contents=contents,
        schema=JudgeOutput,
        temperature=0.0,
        max_output_tokens=4096,
        thinking_budget=settings.gemini_judge_thinking_budget,
    )
    return apply_guardrails(output, passages, source.evidence_source)
