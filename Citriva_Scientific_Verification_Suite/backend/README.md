# Citriva — Academic Citation Verification Engine

Upload an academic PDF. Citriva extracts every inline citation, retrieves the cited literature,
and checks (with deterministic anti-hallucination guardrails) whether each cited paper really
supports the author's claim — flagging misrepresented, unsupported, contradicted and
non-existent (fabricated) references.

## Project layout

```
citriva/
├── app/
│   ├── main.py                    FastAPI app, CORS, upload body-size middleware, /health
│   ├── api/
│   │   ├── routes.py              POST /upload, GET /jobs/{id}, GET /jobs/{id}/export
│   │   └── dependencies.py        Redis sliding-window rate limiter, PDF validation
│   ├── core/
│   │   ├── config.py              pydantic-settings configuration
│   │   └── redis_client.py        sync/async Redis clients + key builders
│   ├── models/schemas.py          All Pydantic v2 models
│   ├── services/
│   │   ├── grobid_parser.py       GROBID TEI-XML -> bibliography + citing sentences
│   │   ├── fallback_parser.py     PyMuPDF + Gemini structured extraction
│   │   ├── claim_filter.py        One batched Gemini call: keep verifiable claims
│   │   ├── retriever.py           OpenAlex / Semantic Scholar / Unpaywall / PyMuPDF
│   │   ├── chunker.py             1200-char chunks (200 overlap) + BM25 ranking
│   │   ├── nli_judge.py           Gemini NLI verdicts (temperature 0, strict schema)
│   │   ├── guardrails.py          Quote verification, caps, review flags, injection defence
│   │   ├── report_exporter.py     JSON + Markdown audit report
│   │   ├── gemini_client.py       Structured-output wrapper (tenacity retries)
│   │   ├── http_utils.py          Retry policy (3 attempts, 1s->2s->4s, jitter)
│   │   ├── pdf_text.py, text_utils.py, errors.py
│   └── worker/
│       ├── celery_app.py          Celery + Redis config
│       ├── tasks.py               verify_document task
│       └── pipeline.py            Stages A-E orchestration + job-state updates
├── tests/test_core.py             Offline unit tests
├── requirements.txt  Dockerfile  docker-compose.yml  render.yaml  .env.example
└── DEPLOYMENT.md                  Railway / Render / Hugging Face (GROBID) guide
```

## Quick start (Docker)

```bash
cp .env.example .env            # set GEMINI_API_KEY at minimum
docker compose up --build       # redis + api + worker
# optional local GROBID:
docker compose --profile grobid up --build   # then set GROBID_URL=http://grobid:8070
```

```bash
curl -F "file=@paper.pdf;type=application/pdf" http://localhost:8000/api/v1/upload
# {"job_id":"…","status":"queued"}
curl http://localhost:8000/api/v1/jobs/<job_id>
curl -OJ "http://localhost:8000/api/v1/jobs/<job_id>/export?format=md"
```

Run locally without Docker: `pip install -r requirements.txt`, start Redis, then
`uvicorn app.main:app --reload` and
`celery -A app.worker.celery_app:celery_app worker -l INFO -Q citriva`.
Tests: `pytest -q`.

## API

| Endpoint | Description |
|---|---|
| `POST /api/v1/upload` | `multipart/form-data` `file`. Must be `application/pdf`, ≤ 15 MB, start with `%PDF-`. 5 uploads/hour per IP (`429` + `Retry-After`). Returns `202 {"job_id","status":"queued"}`. |
| `GET /api/v1/jobs/{job_id}` | `status` (`queued/processing/completed/failed`), `stage`, `progress` 0–100, `error`, `report` when completed. `404` if unknown/expired. |
| `GET /api/v1/jobs/{job_id}/export?format=json\|md` | Downloadable report (`409` until completed). |
| `GET /health` | Redis connectivity check. |

## Pipeline

A. **Parse** (15%) — GROBID if `GROBID_URL` is set (falls back automatically on error/timeout/no citations), otherwise PyMuPDF + Gemini.
B. **Filter** (30%) — one batched Gemini call; dropped citations are reported under `skipped_citations` with reasons.
C. **Retrieve** (55%) — per unique reference (4 threads, cached): DOI → fuzzy title (`token_sort_ratio ≥ 85`, year ±1) → `CITATION_NOT_FOUND`; full text via OA PDF (OpenAlex → Unpaywall → Semantic Scholar) else abstract (`abstract_only`).
D. **Rank** (70%) — chunk + BM25 with numeric/entity boosts → top 5 passages.
E. **Judge** (90%) — Gemini at `temperature=0.0` with strict schema; per-claim error isolation.

## Guardrails (enforced in Python, `app/services/guardrails.py`)

1. `exact_quote` must appear verbatim (after whitespace/soft-hyphen/ligature normalisation) in the retrieved passages, else `confidence ≤ 0.40`, `quote_verified=false`, human review forced.
2. `abstract_only` evidence caps confidence at `0.60`.
3. `needs_human_review` = `confidence < 0.75` ∨ `verdict != SUPPORTED` ∨ `quote_verified is False`.
4. Untrusted PDF text is wrapped in `<untrusted_claim_data>` / `<untrusted_source_passages>` (forged delimiters are stripped) and the system prompt declares it inert data.
5. Closed-world instruction: judge only from the provided passages.

## Design notes and deliberate choices

- **Early oversize rejection:** an ASGI middleware aborts upload bodies that exceed the limit *while streaming* (the route additionally stream-checks the file itself), so a large body is never fully buffered.
- **Client IP:** `X-Forwarded-For` is read at `TRUSTED_PROXY_COUNT` positions from the right (default 1). The left-most entry is client-controlled and spoofable. If every request appears to come from one proxy IP, adjust this value; the accepted-upload log line shows the resolved IP.
- **Metadata services are queried in order** (OpenAlex first; Semantic Scholar only when OpenAlex misses or yields no usable PDF) because Semantic Scholar's rate limit is strict and would otherwise break the 120 s budget.
- **Lookup failures ≠ fabrication:** if every lookup fails because services are unreachable, the claim gets status `ERROR`, not `CITATION_NOT_FOUND`.
- **DOI sanity check:** a DOI that resolves to a paper whose title is unrelated to the cited title (`token_set_ratio < 50`) is treated as unresolved.
- **Extra statuses/rules beyond the spec:** `NO_SOURCE_TEXT` (publication exists but neither full text nor abstract was available) and a confidence cap of `0.50` when a substantive verdict has no evidence quote.
- **GROBID timeouts:** GROBID gets a longer read timeout (`GROBID_READ_TIMEOUT_SECONDS`, default 60 s) than the 15 s used for metadata APIs, because full-text processing is slow. With retries, a failing GROBID can consume a large part of the latency budget; point `GROBID_URL` at a warm instance.
- Transient-error retries cover HTTP 429/5xx, timeouts and transport (connect/read) errors.

## Limitations

Scanned PDFs without a text layer cannot be parsed. Paywalled sources are verified from the abstract only (flagged and capped). References missing a title and DOI cannot be resolved. Verdicts are decision support, not ground truth.
