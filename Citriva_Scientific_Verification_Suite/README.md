# Citriva — Production-Grade Scientific Claim & Citation Verification Suite

> **Architect & Lead:** Professor Aria Voss  
> **Target Audience:** Academic Researchers, Peer-Review Panels, Journal Editors, Grant Boards

Citriva is an auditable, end-to-end scientific document intelligence system. When a researcher uploads an academic manuscript PDF, Citriva extracts every cited claim, resolves references to real source literature across open scholarly graphs, validates whether the cited text actually supports the author's claim, and catches fabricated citations, research gaps, and overclaiming.

---

## 🏛️ System Architecture & The 4 Verification Pillars

```
       ┌────────────────────────┐
       │ Academic PDF Upload    │ (Magic bytes checked, <=15MB)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ GROBID 0.8.1 (TEI-XML) │ (Link <ref type="bibr"> to <biblStruct>)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Batched Claim Filter   │ (Extract verifiable empirical claims only)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Waterfall Retrieval    │ (DOI -> OpenAlex/Unpaywall; Title search w/ RapidFuzz >= 85)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Section Chunks & Vector│ (Gemini 768-dim embeddings in pgvector, top-5 cosine search)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Bounded NLI Engine     │ (Gemini 2.5 Flash, temp=0, strict passage grounding)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Reliability Guardrails │ (Verbatim substring code verification, abstract-only cap)
       └───────────┬────────────┘
                   │
                   ▼
       ┌────────────────────────┐
       │ Publication PDF Export │ (Pure %PDF-1.4 binary compilation)
       └────────────────────────┘
```

### The 4 Verification Pillars

1. **Cross-Reference Verification:** Compares a claim against multiple independent related research papers to detect consensus vs. conflicting conclusions.
2. **Research Gap Identification:** Flags claims asserting facts or scopes that the cited paper never actually tested or established.
3. **Overclaim Detection:** Flags when an author draws conclusions broader or stronger than the cited paper's empirical data supports.
4. **Evidence Traceability:** Pointers linking every verdict directly to the exact verbatim sentence, page, and section in the source paper.

---

## 🛡️ Reliability Rules & Guardrails

- **Verbatim Quote Verification:** Every returned `exact_quote` MUST be a character-for-character substring of the retrieved document text, verified in Python. If not, confidence is capped at `0.40` and human review is forced.
- **Abstract-Only Cap:** Evidence retrieved solely from abstracts caps confidence at `0.60`.
- **Bounded NLI Inference:** The LLM judges strictly from supplied text chunks with zero parametric world knowledge.
- **Prompt Injection Defense:** All PDF text is treated as untrusted input data.
- **Fault-Tolerant Execution:** Individual claim failures never crash the job; all external network calls implement exponential backoff.

---

## 🚀 Running the Project

### Option 1: Instant Standalone Mode (Zero Dependencies)
For instant demonstrations or offline evaluation, simply open `index.html` in any modern web browser:
```bash
open index.html
```
- Includes the pure white canvas + 50 shades of blue palette.
- Dynamic Typography Switcher (`Space Grotesk`, `Cinzel`, `Playfair Display`, `Cormorant Garamond`, `Newsreader`).
- Interactive cursor 3D tilting and ambient light aura.
- Left-dock 4-pillar diagnostics panel and pop-up modal.
- Built-in client-side `%PDF-1.4` binary audit report generator.

---

### Option 2: Full-Stack Docker Compose (Production Environment)
```bash
# 1. Clone or unpack the suite
cd Citriva_Scientific_Verification_Suite

# 2. Copy and populate credentials
cp .env.example .env

# 3. Spin up all services (Redis, GROBID, FastAPI Backend, Celery Worker, Next.js Frontend)
docker compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- GROBID Service: `http://localhost:8070`

---

### Option 3: Local Development

#### Backend (Python 3.11 + FastAPI + Celery)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run pytest unit tests
pytest tests/ -v

# Start FastAPI API server
uvicorn app.main:app --reload --port 8000

# In a separate terminal: Start Celery worker
celery -A app.worker.celery_app:celery_app worker --loglevel=INFO -Q citriva
```

#### Frontend (Next.js 15 App Router)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to access the Next.js workspace.

---

## 🗄️ Database Setup (Supabase)
Import `database/schema.sql` directly into your Supabase SQL Editor:
- Creates `profiles`, `documents`, `jobs`, `references`, `claims`, `source_papers`, `passages` (with `vector(768)` and HNSW index), and `claim_results`.
- Configures complete Row-Level Security (RLS) policies guaranteeing multi-tenant isolation.

---

## 📦 Project Contents

```
Citriva_Scientific_Verification_Suite/
├── index.html                   # Zero-dependency interactive web application
├── docker-compose.yml           # Multi-container orchestration
├── .env.example                 # Environment variables specification
├── README.md                    # Engineering documentation
├── database/
│   └── schema.sql               # Supabase Postgres + pgvector + RLS
├── frontend/
│   ├── package.json             # Next.js 15, Tailwind, Lucide, React-PDF
│   ├── tailwind.config.ts       # 50 shades of blue & typography configuration
│   └── src/                     # App Router, components, PDF generator, types
└── backend/
    ├── Dockerfile
    ├── requirements.txt         # FastAPI, Celery, Pydantic v2, PyMuPDF, RapidFuzz
    ├── app/                     # API routes, GROBID parser, waterfall retriever, NLI judge
    └── tests/                   # Pytest test suite for parser, fuzzy matcher & quote guard
```
