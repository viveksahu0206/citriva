"""Overlapping chunking and BM25-style passage ranking with numeric/entity boosts."""

import math
import re
from collections import Counter

from app.models.schemas import Chunk, Passage, SourcePage

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:[.\-][a-z0-9]+)*")
_NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?%?")
_ENTITY_RE = re.compile(r"\b(?:[A-Z][A-Za-z0-9\-]{2,}|[A-Z]{2,}[0-9]*)\b")
_STOPWORDS = frozenset(
    "a an and are as at be been but by for from had has have in into is it its of on or "
    "our shown show shows that the their these this those to was we were which with using used "
    "study studies paper results result than also can may more most such not no".split()
)


def _split_text(text: str, size: int, overlap: int) -> list[str]:
    text = text.strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    start, length = 0, len(text)
    while start < length:
        end = min(start + size, length)
        if end < length:
            window_start = start + int(size * 0.6)
            cut = text.rfind(". ", window_start, end)
            if cut != -1:
                cut += 1  # keep the period
            else:
                cut = text.rfind(" ", window_start, end)
            if cut > start:
                end = cut
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= length:
            break
        start = max(end - overlap, start + 1)
    return chunks


def chunk_pages(pages: list[SourcePage], chunk_size: int = 1200, overlap: int = 200) -> list[Chunk]:
    """Split page texts into ~chunk_size char chunks (overlap chars), preserving page numbers."""
    chunks: list[Chunk] = []
    for page in pages:
        for piece in _split_text(page.text, chunk_size, overlap):
            chunks.append(Chunk(chunk_index=len(chunks), page_number=page.page_number, text=piece))
    return chunks


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]


def _bm25_scores(docs: list[list[str]], query: list[str], k1: float = 1.5, b: float = 0.75) -> list[float]:
    n = len(docs)
    avgdl = (sum(len(d) for d in docs) / n) or 1.0
    df: Counter[str] = Counter()
    for doc in docs:
        df.update(set(doc))
    query_weights = {term: 1.0 + math.log(freq) for term, freq in Counter(query).items()}
    scores: list[float] = []
    for doc in docs:
        tf = Counter(doc)
        doc_len = len(doc)
        score = 0.0
        for term, weight in query_weights.items():
            freq = tf.get(term, 0)
            if not freq:
                continue
            idf = math.log(1.0 + (n - df[term] + 0.5) / (df[term] + 0.5))
            score += weight * idf * (freq * (k1 + 1.0)) / (freq + k1 * (1.0 - b + b * doc_len / avgdl))
        scores.append(score)
    return scores


def _boost(chunk_text: str, numbers: set[str], entities: set[str]) -> float:
    boost = 0.0
    if numbers:
        found = sum(1 for number in numbers if number in chunk_text)
        boost += 0.25 * found / len(numbers)
    if entities:
        lowered = chunk_text.lower()
        found = sum(1 for entity in entities if entity.lower() in lowered)
        boost += 0.15 * found / len(entities)
    return boost


def rank_passages(
    chunks: list[Chunk],
    claim_text: str,
    context_window: str,
    top_k: int = 5,
) -> list[Passage]:
    """Rank chunks against claim + context; exact numeric/entity matches boost the score."""
    if not chunks:
        return []

    def as_passage(chunk: Chunk, score: float) -> Passage:
        return Passage(
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            text=chunk.text,
            score=round(score, 4),
        )

    query_tokens = _tokenize(claim_text) * 2 + _tokenize(context_window)
    docs = [_tokenize(chunk.text) for chunk in chunks]
    if len(chunks) <= top_k or not query_tokens or not any(docs):
        return [as_passage(chunk, 0.0) for chunk in chunks[:top_k]]

    bm25 = _bm25_scores(docs, query_tokens)
    max_score = max(bm25) or 1.0
    numbers = set(_NUMBER_RE.findall(claim_text))
    entities = set(_ENTITY_RE.findall(claim_text))

    scored = [
        (bm25[i] / max_score + _boost(chunk.text, numbers, entities), chunk)
        for i, chunk in enumerate(chunks)
    ]
    scored.sort(key=lambda item: (-item[0], item[1].chunk_index))
    return [as_passage(chunk, score) for score, chunk in scored[:top_k]]
