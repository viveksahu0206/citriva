# citriva
# 🔬 Citriva — Scientific Claim & Citation Verification Suite

> **Don’t Just Cite. Verify the Evidence.**

Citriva is an **AI-powered scientific claim and citation verification platform** designed to help researchers, students, reviewers, journal editors, and academic teams determine whether scientific claims are genuinely supported by the research papers they cite.

Instead of simply checking whether a citation exists, Citriva goes deeper: it analyzes the claim, retrieves the referenced research, compares the claim against the actual evidence, and produces an auditable verification result.

---

## 🎯 The Problem

Scientific papers contain thousands of citations, but a citation existing in a paper does **not necessarily mean that the cited source actually supports the claim being made**.

Common problems include:

- ❌ Incorrect or irrelevant citations
- ❌ Claims that are stronger than the cited research
- ❌ References that cannot be verified
- ❌ Research gaps hidden behind citations
- ❌ Misinterpretation of scientific findings
- ❌ Time-consuming manual citation checking

Researchers may have to manually open papers, find the referenced sections, compare the evidence, and determine whether the claim is actually supported.

**Citriva automates this verification process.**

---

## 💡 Our Solution

Citriva analyzes an academic manuscript and verifies the relationship between its **claims and cited research**.

The system can:

1. 📄 Accept an academic manuscript PDF
2. 🔍 Extract references and scientific claims
3. 🔗 Resolve citations to real research literature
4. 🧠 Analyze whether the source supports the claim
5. ⚠️ Detect unsupported or overextended claims
6. 📌 Highlight the evidence behind every verification
7. 📊 Generate a traceable verification report

### Core Question

> **“Does the cited research actually support what the author claims?”**

Citriva is designed to answer that question using evidence from the referenced research.

---

# 🏗️ System Architecture

```text
              Academic PDF Upload
                      │
                      ▼
              GROBID 0.8.1
                TEI-XML Parser
                      │
                      ▼
             Claim Extraction
        ┌──────────────────────────┐
        │ Verifiable claims only   │
        └──────────────────────────┘
                      │
                      ▼
              Citation Retrieval
          DOI → OpenAlex → Unpaywall
          Title Search + RapidFuzz
                      │
                      ▼
             Research Processing
          Section Chunking + Embeddings
                      │
                      ▼
                Vector Search
                pgvector / Top-5
                      │
                      ▼
                NLI Verification
             Gemini 2.5 Flash
                      │
                      ▼
              Reliability Guards
       Quote Verification + Confidence
                      │
                      ▼
             Verification Report
```

---

# 🔎 Four Verification Pillars

## 1. Cross-Reference Verification

Citriva can compare a claim against multiple related research papers to identify whether the available evidence shows:

- Consistent research support
- Conflicting findings
- Limited evidence
- Lack of sufficient supporting literature

This helps distinguish isolated evidence from broader research consensus.

---

## 2. Research Gap Identification

Citriva identifies situations where an author makes a claim about a fact, population, condition, or scope that the cited paper **did not actually investigate or establish**.

This helps expose hidden gaps between:

**What the paper studied**  
and  
**What the author claims it proves.**

---

## 3. Overclaim Detection

A common issue in scientific writing is making a conclusion that is broader or stronger than the underlying research supports.

For example:

```text
Research Evidence
       ↓
Limited finding
       ↓
Author's statement
       ↓
Broader / stronger claim
       ↓
⚠️ Potential Overclaim
```

Citriva identifies these potential mismatches between evidence and interpretation.

---

## 4. Evidence Traceability

Every verification result should be traceable back to the research evidence that produced it.

Citriva provides pointers toward:

- Exact evidence
- Source sentence
- Page
- Section
- Referenced research paper

This makes the verification process more transparent and auditable.

---

# 🧠 How Citriva Works

### Step 1 — Upload

The researcher uploads an academic manuscript in PDF format.

### Step 2 — Parse

Citriva uses **GROBID 0.8.1** to convert the academic document into structured TEI-XML and identify relationships between citations and bibliographic references.

### Step 3 — Extract Claims

The system filters the document to identify **verifiable empirical claims** instead of treating every sentence as a scientific claim.

### Step 4 — Retrieve Sources

Citriva uses a retrieval waterfall:

```text
DOI
 ↓
OpenAlex / Unpaywall
 ↓
Title Search
 ↓
RapidFuzz Matching
```

This helps resolve references to available scholarly sources.

### Step 5 — Create Evidence Chunks

Research papers are divided into meaningful sections and passages.

These passages are converted into vector embeddings and stored for semantic retrieval.

### Step 6 — Retrieve Relevant Evidence

The system performs vector similarity search to identify the most relevant passages for the claim.

### Step 7 — Verify the Claim

The NLI verification engine evaluates the claim against the retrieved evidence.

The model is instructed to judge the claim using the supplied research passages rather than relying on external world knowledge.

### Step 8 — Apply Reliability Guardrails

Citriva performs additional checks to prevent unreliable evidence from being presented as verified evidence.

### Step 9 — Generate Report

The final verification results can be compiled into an auditable publication-style PDF report.

---

# 🛡️ Reliability & Safety Guardrails

Citriva is designed around evidence traceability rather than simply trusting an AI-generated answer.

### Verbatim Quote Verification

Every returned `exact_quote` must be a character-for-character substring of the retrieved document text.

If the quote cannot be verified, confidence is capped at **0.40** and human review is required.

### Abstract-Only Evidence

If evidence comes only from an abstract, confidence is capped at **0.60**.

This prevents abstract-level evidence from being treated as equivalent to full-text evidence.

### Bounded NLI Inference

The verification model evaluates claims using the supplied research passages rather than unrestricted model knowledge.

### Prompt Injection Defense

PDF content is treated as **untrusted input data**.

### Fault-Tolerant Processing

Individual claim-processing failures should not terminate the complete verification job.

External network operations use retry and exponential backoff mechanisms.

---

# ⚙️ Technology Stack

## Frontend

- Next.js 15
- React
- Tailwind CSS
- Lucide
- React-PDF

The project also includes a standalone HTML interface for demonstrations.

---

## Backend

- Python 3.11
- FastAPI
- Celery
- Pydantic v2
- PyMuPDF
- RapidFuzz

---

## AI & NLP

- Gemini 2.5 Flash
- Gemini embeddings
- spaCy / NLP processing
- Natural Language Inference
- Semantic similarity search

---

## Scientific Data Sources

- OpenAlex
- Unpaywall
- SciFact
- CORD-19

These sources support scientific literature retrieval and claim-verification workflows.

---

## Database

- PostgreSQL
- Supabase
- pgvector
- HNSW vector indexing
- Row-Level Security (RLS)

The database contains entities for:

- Profiles
- Documents
- Jobs
- References
- Claims
- Source Papers
- Passages
- Claim Results

---

# 🗂️ Project Structure

```text
Citriva_Scientific_Verification_Suite/
│
├── index.html
│
├── docker-compose.yml
│
├── .env.example
│
├── README.md
│
├── database/
│   └── schema.sql
│
├── frontend/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── src/
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── app/
    │   ├── API routes
    │   ├── GROBID parser
    │   ├── source retriever
    │   └── NLI verification engine
    │
    └── tests/
        ├── parser tests
        ├── fuzzy matcher tests
        └── quote guard tests
```

---

# 🚀 Getting Started

## Option 1 — Standalone Demo

For a quick demonstration without installing backend dependencies:

```bash
open index.html
```

The standalone interface includes:

- Interactive Citriva interface
- 50 shades of blue visual system
- Dynamic typography
- Interactive cursor effects
- Four-pillar diagnostic panel
- Verification interface
- Client-side PDF audit report generation

---

# 🐳 Option 2 — Full-Stack Docker Setup

### 1. Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Citriva_Scientific_Verification_Suite
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Add the required credentials and configuration values to `.env`.

### 3. Start the complete system

```bash
docker compose up --build
```

The system starts the major services including:

- Redis
- GROBID
- FastAPI backend
- Celery worker
- Next.js frontend

### Services

```text
Frontend:
http://localhost:3000

Backend API:
http://localhost:8000/docs

GROBID:
http://localhost:8070
```

---

# 💻 Option 3 — Local Development

## Backend

```bash
cd backend

python3 -m venv .venv

source .venv/bin/activate

pip install -r requirements.txt
```

### Run Tests

```bash
pytest tests/ -v
```

### Start FastAPI

```bash
uvicorn app.main:app --reload --port 8000
```

### Start Celery Worker

Open another terminal:

```bash
celery -A app.worker.celery_app:celery_app worker --loglevel=INFO -Q citriva
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 🗄️ Database Setup

Citriva uses **Supabase PostgreSQL with pgvector**.

Import:

```text
database/schema.sql
```

into the Supabase SQL Editor.

The schema creates the required database structures including:

```text
profiles
documents
jobs
references
claims
source_papers
passages
claim_results
```

The `passages` table uses vector storage and an HNSW index for efficient semantic retrieval.

Row-Level Security policies are also configured to provide multi-tenant isolation.

---

# 📊 Verification Results

Citriva can classify evidence into different verification outcomes.

### 🟢 SUPPORTED

The available evidence supports the author's claim.

### 🟡 PARTIALLY SUPPORTED

The evidence supports only part of the claim or provides limited support.

### 🔴 UNSUPPORTED

The cited research does not provide sufficient evidence for the claim.

The system can also flag:

- ⚠️ Research gaps
- ⚠️ Overclaims
- ⚠️ Conflicting evidence
- ⚠️ Unreliable citations
- ⚠️ Potentially fabricated references

---

# 🎯 Who Can Use Citriva?

Citriva is designed for:

### 👨‍🎓 Students

Check whether references actually support statements in academic assignments, papers, and projects.

### 🔬 Researchers

Reduce the time required for manual citation and evidence verification.

### 📚 Journal Editors

Assist with checking the relationship between manuscript claims and cited literature.

### 👥 Peer Reviewers

Identify unsupported claims, evidence gaps, and overstatements during review.

### 💰 Grant Review Teams

Help evaluate whether research claims are appropriately supported by existing literature.

---

# 🌟 What Makes Citriva Different?

Traditional citation tools often focus on questions such as:

> **“Does this paper exist?”**

Citriva focuses on a more important question:

> **“Does this paper actually support this claim?”**

That distinction is the core of the platform.

Citriva moves citation checking from **reference discovery** toward **evidence verification**.

---

# 🔐 Responsible AI

Citriva is designed with a verification-first approach.

The platform does not treat an AI-generated explanation as sufficient evidence by itself.

Instead, verification results are connected to retrieved research passages and subjected to reliability checks.

The goal is to make AI-assisted academic verification:

- Transparent
- Traceable
- Auditable
- Evidence-based
- More resistant to unsupported AI conclusions

---

# 🚧 Current Scope

Citriva is designed as a scientific document intelligence and verification suite. Its effectiveness depends on the availability and quality of accessible source literature and retrieved document text.

Results should therefore be treated as **research-assistance outputs**, with human review remaining important for high-stakes academic decisions.

---

# 🔮 Future Enhancements

Potential future development areas include:

- Multi-language scientific claim verification
- Larger scholarly-source coverage
- Improved citation relationship detection
- Advanced contradiction analysis
- Research-consensus visualization
- Browser extension for real-time citation checking
- Word/Google Docs integration
- Journal submission workflow integration
- More detailed evidence graphs
- Collaboration features for research teams

---

# 🏆 Project Vision

> **Make every scientific claim traceable to trustworthy evidence.**

Citriva aims to make scientific research easier to verify by connecting claims directly to the evidence behind them.

Instead of spending hours manually checking references, researchers can use Citriva to quickly identify:

**What is supported.**  
**What is partially supported.**  
**What is unsupported.**  
**And where the evidence comes from.**

---

## 📜 License

Add your project's chosen license here, for example:

```text
MIT License
```

Make sure the repository contains the corresponding `LICENSE` file if you select a license.

---

## 👥 Team

**Team FORSAKE**

- Tejaswini T.
- Rajshekhar N.
- Vivek Sahu A.
- Dharma S.

**Project:** Citriva  
**Domain:** Research Technology & Academic Integrity

---

## ⭐ Support the Project

If you find Citriva useful, consider giving the repository a ⭐ on GitHub.

**Citriva — Don’t Just Cite. Verify the Evidence.**
