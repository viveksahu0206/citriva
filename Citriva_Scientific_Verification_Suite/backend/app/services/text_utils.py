"""Pure text helpers shared by parsers, retriever, guardrails and exporter."""

import re
import unicodedata

_WS_RE = re.compile(r"\s+")
_DOI_RE = re.compile(r"10\.\d{4,9}/[^\s\"<>]+", re.IGNORECASE)
_YEAR_RE = re.compile(r"(?<!\d)(1[5-9]\d{2}|20\d{2})(?!\d)")
_HYPHEN_BREAK_RE = re.compile(r"(?<=[a-z])-\s*\n\s*(?=[a-z])")
_UNTRUSTED_TAG_RE = re.compile(r"</?\s*untrusted_[a-z_]*\s*>", re.IGNORECASE)

_LIGATURES = {
    "\ufb00": "ff",
    "\ufb01": "fi",
    "\ufb02": "fl",
    "\ufb03": "ffi",
    "\ufb04": "ffl",
    "\ufb05": "st",
    "\ufb06": "st",
}
_TRANSLATE = {
    ord("\u00ad"): None,  # soft hyphen
    ord("\u200b"): None,
    ord("\u200c"): None,
    ord("\u200d"): None,
    ord("\u2060"): None,
    ord("\ufeff"): None,
    ord("\u2018"): "'",
    ord("\u2019"): "'",
    ord("\u201c"): '"',
    ord("\u201d"): '"',
    ord("\u2013"): "-",
    ord("\u2014"): "-",
    ord("\u2212"): "-",
}

_SENTENCE_SPLIT_RE = re.compile(
    r"(?<=[.!?])"
    r"(?<!et al\.)(?<!Fig\.)(?<!Figs\.)(?<!Eq\.)(?<!e\.g\.)(?<!i\.e\.)"
    r"(?<!vs\.)(?<!Dr\.)(?<!No\.)(?<!Ref\.)"
    r"\s+(?=[A-Z0-9\"'(\[])"
)


def normalize_whitespace(text: str) -> str:
    return _WS_RE.sub(" ", text).strip()


def normalize_for_match(text: str) -> str:
    """Normalise whitespace, soft hyphens, zero-width chars, ligatures and typographic quotes."""
    text = text.replace("\u00ad", "")
    for ligature, replacement in _LIGATURES.items():
        text = text.replace(ligature, replacement)
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_TRANSLATE)
    return normalize_whitespace(text)


def clean_extracted_page_text(text: str) -> str:
    """Clean raw PDF page text: de-hyphenate line breaks, expand ligatures, collapse whitespace."""
    text = text.replace("\u00ad", "")
    text = _HYPHEN_BREAK_RE.sub("", text)
    for ligature, replacement in _LIGATURES.items():
        text = text.replace(ligature, replacement)
    text = text.translate({ord(c): None for c in ("\u200b", "\u200c", "\u200d", "\u2060", "\ufeff")})
    return normalize_whitespace(text)


def normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    match = _DOI_RE.search(value.strip())
    if not match:
        return None
    return match.group(0).rstrip(".,;)]}'\"").lower()


def parse_year(value: str | None) -> int | None:
    if not value:
        return None
    match = _YEAR_RE.search(value)
    return int(match.group(1)) if match else None


def strip_html_tags(text: str) -> str:
    return normalize_whitespace(re.sub(r"<[^>]+>", "", text))


def split_sentences(text: str) -> list[str]:
    text = normalize_whitespace(text)
    if not text:
        return []
    return [s.strip() for s in _SENTENCE_SPLIT_RE.split(text) if s.strip()]


def first_n_sentences(text: str, n: int = 2) -> str:
    sentences = split_sentences(text)
    return " ".join(sentences[:n]) if sentences else text.strip()


def sanitize_untrusted(text: str) -> str:
    """Neutralise any attempt to forge or close our untrusted-data delimiters."""
    return _UNTRUSTED_TAG_RE.sub("[tag removed]", text)
