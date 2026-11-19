"""Report exporters: JSON and executive-ready Markdown."""

from app.models.schemas import ClaimVerification, VerificationReport

_SEVERITY = {
    "CITATION_NOT_FOUND": 0,
    "CONTRADICTORY": 1,
    "UNSUPPORTED": 2,
    "ERROR": 3,
    "NO_SOURCE_TEXT": 3,
    "PARTIALLY_SUPPORTED": 4,
    "POTENTIALLY_OUTDATED": 5,
    "SUPPORTED": 6,
}


def _label(claim: ClaimVerification) -> str:
    return claim.verdict if claim.status == "JUDGED" and claim.verdict else claim.status


def _is_flagged(claim: ClaimVerification) -> bool:
    return claim.status != "JUDGED" or claim.verdict != "SUPPORTED" or claim.needs_human_review


def _cell(text: str | None) -> str:
    return (text or "").replace("|", "\\|").replace("\n", " ").strip()


def _inline(text: str | None) -> str:
    return " ".join((text or "").split())


def _reference(claim: ClaimVerification) -> str:
    bib = claim.cited_reference
    authors = ", ".join(bib.authors[:3]) + (" et al." if len(bib.authors) > 3 else "")
    parts = [p for p in (authors, f"({bib.year})" if bib.year else "", bib.title or "Untitled reference") if p]
    text = " ".join(parts)
    return f"{text} — DOI: {bib.doi}" if bib.doi else text


def _claim_block(claim: ClaimVerification, heading_level: str = "###") -> list[str]:
    lines = [f"{heading_level} {claim.citation_id} — {_label(claim)}", ""]
    lines.append(f"> {_inline(claim.claim_text)}")
    lines.append("")
    lines.append(f"- **Cited reference:** {_inline(_reference(claim))}")
    if claim.source_title and claim.source_title != claim.cited_reference.title:
        lines.append(f"- **Matched publication:** {_inline(claim.source_title)}")
    if claim.source_url:
        lines.append(f"- **Source:** {claim.source_url}")
    if claim.status == "JUDGED":
        evidence = "full text" if claim.evidence_source == "full_text" else "abstract only"
        lines.append(f"- **Evidence:** {evidence}" + (f" (page {claim.source_page})" if claim.source_page else ""))
        lines.append(f"- **Confidence:** {claim.confidence_score:.2f}")
        if claim.exact_quote:
            verified = {True: "verified verbatim", False: "NOT found verbatim in source", None: ""}[
                claim.quote_verified
            ]
            lines.append(f"- **Supporting quote** ({verified}): \"{_inline(claim.exact_quote)}\"")
        lines.append(f"- **Assessment:** {_inline(claim.explanation)}")
    else:
        lines.append(f"- **Details:** {_inline(claim.explanation or claim.error)}")
    lines.append(f"- **Human review required:** {'Yes' if claim.needs_human_review else 'No'}")
    lines.append("")
    return lines


def render_json(report: VerificationReport) -> str:
    return report.model_dump_json(indent=2)


def render_markdown(report: VerificationReport) -> str:
    s = report.summary
    lines: list[str] = ["# Citriva Citation Verification Report", ""]
    lines.append(f"**Document:** {_inline(report.document_title or report.filename or 'Untitled')}  ")
    lines.append(f"**Job ID:** `{report.job_id}`  ")
    lines.append(f"**Generated:** {report.generated_at.strftime('%Y-%m-%d %H:%M UTC')}  ")
    lines.append(f"**Parser:** {report.parser}")
    lines.append("")

    lines += ["## Summary", "", "| Metric | Count |", "|---|---:|"]
    rows = [
        ("Citations extracted", s.total_citations_extracted),
        ("Verifiable claims checked", s.total_verifiable),
        ("Skipped (non-verifiable)", s.total_skipped),
        ("Supported", s.supported),
        ("Partially supported", s.partially_supported),
        ("Unsupported", s.unsupported),
        ("Contradictory", s.contradictory),
        ("Potentially outdated", s.potentially_outdated),
        ("Citation not found (possible fabrication)", s.citation_not_found),
        ("No source text available", s.no_source_text),
        ("Processing errors", s.errors),
        ("Requiring human review", s.needs_human_review),
        ("Verified against full text", s.full_text_evidence),
        ("Verified against abstract only", s.abstract_only_evidence),
    ]
    lines += [f"| {name} | {value} |" for name, value in rows]
    lines.append("")

    if report.warnings:
        lines += ["## Warnings", ""] + [f"- {_inline(w)}" for w in report.warnings] + [""]

    flagged = sorted(
        (c for c in report.claims if _is_flagged(c)),
        key=lambda c: (_SEVERITY.get(_label(c), 7), c.citation_id),
    )
    lines += ["## Flagged Citations", ""]
    if flagged:
        lines.append(
            "Fabricated or unresolvable references appear first, followed by contradictory, "
            "unsupported and low-confidence findings."
        )
        lines.append("")
        for claim in flagged:
            lines += _claim_block(claim)
    else:
        lines += ["No flagged citations. All verified claims were supported with high confidence.", ""]

    lines += ["## Per-Claim Breakdown", ""]
    if report.claims:
        lines += ["| ID | Verdict | Confidence | Evidence | Review | Cited reference |", "|---|---|---:|---|---|---|"]
        for claim in report.claims:
            lines.append(
                f"| {claim.citation_id} | {_label(claim)} | "
                f"{claim.confidence_score:.2f} | {claim.evidence_source} | "
                f"{'Yes' if claim.needs_human_review else 'No'} | {_cell(_reference(claim))} |"
            )
        lines.append("")
        for claim in report.claims:
            lines += _claim_block(claim)
    else:
        lines += ["No verifiable claims were found.", ""]

    if report.skipped_citations:
        lines += ["## Skipped Citations", "", "| ID | Reason | Sentence |", "|---|---|---|"]
        for skipped in report.skipped_citations:
            lines.append(
                f"| {skipped.citation_id} | {_cell(skipped.reason)} | {_cell(skipped.claim_text)[:300]} |"
            )
        lines.append("")

    lines += [
        "---",
        "*Automated analysis. Verdicts are produced from retrieved source text and must be "
        "reviewed by a human before any editorial decision.*",
        "",
    ]
    return "\n".join(lines)
