-- ==============================================================================
-- Citriva Scientific Verification Suite — Supabase Database Architecture
-- Spec: Postgres 15+ | pgvector | Row-Level Security (RLS) | High-Performance Indexes
-- ==============================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 2. User Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text,
    institution text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Ingested Manuscripts (PDF Documents)
create table if not exists public.documents (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    filename text not null,
    storage_path text not null,
    file_size_bytes bigint not null,
    mime_type text not null default 'application/pdf',
    total_claims_detected integer default 0,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Verification Queue Jobs (Celery Orchestration)
create table if not exists public.jobs (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
    stage text not null default 'QUEUED' check (stage in ('QUEUED', 'PARSING_GROBID', 'FILTERING_CLAIMS', 'RESOLVING_SOURCES', 'EMBEDDING_PASSAGES', 'NLI_JUDGING', 'COMPILING_REPORT')),
    progress_percent integer not null default 0 check (progress_percent between 0 and 100),
    error_message text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Extracted Bibliographical References (TEI-XML <biblStruct>)
create table if not exists public.references (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    ref_bib_id text not null, -- e.g. 'b0', 'b1'
    title text,
    authors text[],
    year integer,
    journal text,
    raw_tei_xml text,
    declared_doi text,
    resolved_doi text,
    retrieval_status text default 'UNRESOLVED' check (retrieval_status in ('RESOLVED_DOI', 'RESOLVED_TITLE_FUZZY', 'CITATION_NOT_FOUND', 'UNRESOLVED')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Extracted Empirical Claims (Citing Sentences + 2-Sentence Boundary Context)
create table if not exists public.claims (
    id uuid primary key default uuid_generate_v4(),
    document_id uuid not null references public.documents(id) on delete cascade,
    reference_id uuid references public.references(id) on delete set null,
    citing_sentence text not null,
    context_window text not null, -- 2 sentences preceding + citing + 2 sentences following
    section_heading text,
    is_empirical boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Source Papers Global Cache (Deduplicated across users by DOI)
create table if not exists public.source_papers (
    id uuid primary key default uuid_generate_v4(),
    doi text unique not null,
    title text not null,
    authors text[],
    publication_year integer,
    venue text,
    open_access_pdf_url text,
    abstract_text text,
    is_abstract_only boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Chunked Passages with Vector Embeddings (Gemini 768-dim Embeddings)
create table if not exists public.passages (
    id uuid primary key default uuid_generate_v4(),
    source_paper_id uuid not null references public.source_papers(id) on delete cascade,
    passage_text text not null,
    section_name text,
    page_number integer,
    embedding vector(768), -- Gemini text-embedding-004 standard dimension
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Claim Verification Results & Audit Logs (The 4 Pillars + NLI Scorecard)
create table if not exists public.claim_results (
    id uuid primary key default uuid_generate_v4(),
    claim_id uuid not null references public.claims(id) on delete cascade,
    job_id uuid not null references public.jobs(id) on delete cascade,
    verdict text not null check (verdict in ('SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED', 'CONTRADICTORY', 'POTENTIALLY_OUTDATED', 'CITATION_NOT_FOUND')),
    exact_quote text not null,
    quote_is_verified boolean not null default false, -- Hard string-inclusion check guard
    explanation text not null, -- 2 sentences maximum
    confidence_score numeric(4, 3) not null check (confidence_score between 0.000 and 1.000),
    needs_human_review boolean not null default false,
    
    -- The 4 Core Verification Pillars
    consensus_score numeric(4, 3), -- Pillar 1: Cross-Reference Verification
    research_gap_detected boolean default false, -- Pillar 2: Research Gap Identification
    research_gap_rationale text,
    overclaim_detected boolean default false, -- Pillar 3: Overclaim Detection
    overclaim_rationale text,
    traceability_sentence_id text, -- Pillar 4: Evidence Traceability
    
    -- Human Auditor Loop
    human_override_verdict text,
    audited_by uuid references public.profiles(id),
    audited_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 10. Performance Indexes & Vector Search Index
-- ==============================================================================
create index if not exists idx_documents_user on public.documents(user_id);
create index if not exists idx_jobs_document on public.jobs(document_id);
create index if not exists idx_jobs_user on public.jobs(user_id);
create index if not exists idx_references_doc on public.references(document_id);
create index if not exists idx_claims_doc on public.claims(document_id);
create index if not exists idx_claims_ref on public.claims(reference_id);
create index if not exists idx_source_papers_doi on public.source_papers(doi);
create index if not exists idx_passages_paper on public.passages(source_paper_id);
create index if not exists idx_claim_results_claim on public.claim_results(claim_id);
create index if not exists idx_claim_results_job on public.claim_results(job_id);

-- HNSW Vector Index for Cosine Similarity Retrieval
create index if not exists idx_passages_embedding_hnsw
on public.passages
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

-- ==============================================================================
-- 11. Row-Level Security (RLS) Policies
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.jobs enable row level security;
alter table public.references enable row level security;
alter table public.claims enable row level security;
alter table public.claim_results enable row level security;
-- source_papers and passages are read-only public scholarly cache
alter table public.source_papers enable row level security;
alter table public.passages enable row level security;

-- Profiles: Users can view and update only their own profile
create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);

-- Documents: Users access strictly their uploaded files
create policy "Users can CRUD own documents"
on public.documents for all
using (auth.uid() = user_id);

-- Jobs: Users view and manage only their own jobs
create policy "Users can view own jobs"
on public.jobs for all
using (auth.uid() = user_id);

-- References: Linked to user's documents
create policy "Users can view references of own docs"
on public.references for select
using (
    exists (
        select 1 from public.documents
        where documents.id = references.document_id
        and documents.user_id = auth.uid()
    )
);

-- Claims: Linked to user's documents
create policy "Users can view claims of own docs"
on public.claims for select
using (
    exists (
        select 1 from public.documents
        where documents.id = claims.document_id
        and documents.user_id = auth.uid()
    )
);

-- Claim Results: Linked to user's jobs
create policy "Users can view claim results of own jobs"
on public.claim_results for all
using (
    exists (
        select 1 from public.jobs
        where jobs.id = claim_results.job_id
        and jobs.user_id = auth.uid()
    )
);

-- Scholarly Source Cache: Authenticated users can read cached papers & passages
create policy "Scholarly papers are readable by authenticated users"
on public.source_papers for select
to authenticated
using (true);

create policy "Passages are readable by authenticated users"
on public.passages for select
to authenticated
using (true);
