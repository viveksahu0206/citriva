'use client';

import { useState } from 'react';
import { ArrowRight, ClipboardCheck, FileSearch, FileText, GitCompare, Link2, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STRIP = [
  { icon: FileText, label: 'Manuscript Ingest' },
  { icon: FileSearch, label: 'Claim Extraction' },
  { icon: Link2, label: 'DOI Graph Resolution' },
  { icon: GitCompare, label: 'NLI Evidence Audit' },
  { icon: ClipboardCheck, label: 'Auditable PDF Ready' },
];

const CHECKS = [
  {
    tab: '1. Extract Claims',
    title: 'TEI-XML Parsing & Atomic Claim Segmentation',
    body: 'Upload any academic PDF. Citriva processes the document with structural segmentation (GROBID TEI-XML with PyMuPDF fallback), isolating factual empirical claims alongside their 2-sentence surrounding context windows and section headers.',
    points: [
      'Extracts citing sentence with pre- and post-context windows',
      'Resolves in-text markers ([12], (Okafor et al., 2023)) directly to bibliography structures',
      'Filters out generic boilerplate, methodology pointers, and review summaries',
    ],
  },
  {
    tab: '2. Match Sources',
    title: 'Waterfall Scholarly Metadata Resolution',
    body: 'Resolves raw references against OpenAlex, Semantic Scholar, and Unpaywall. If a direct DOI is present, full metadata is fetched immediately; otherwise fuzzy title matching (rapidfuzz >= 85 and year ± 1) guarantees precise attribution without fabrication.',
    points: [
      'Multi-source fallback: DOI -> OpenAlex -> Semantic Scholar -> Crossref',
      'Open Access PDF retrieval via Unpaywall for full-text inspection',
      'Unresolved sources are marked CITATION_NOT_FOUND rather than hallucinating references',
    ],
  },
  {
    tab: '3. Verify Evidence',
    title: 'Section-Aware Natural Language Inference',
    body: 'Top passages are embedded into pgvector and evaluated via temperature-0 structured reasoning. Citriva checks whether experimental results genuinely substantiate the claim, looking out for overclaiming and boundary misattribution.',
    points: [
      '5 distinct verdict tokens: Supported, Partially Supported, Unsupported, Contradictory, Outdated',
      'Strict verbatim substring validation: Exact quote must exist character-for-character in source text',
      'Abstract-only evidence is capped at 0.6 confidence automatically',
    ],
  },
  {
    tab: '4. Flag for Review',
    title: 'Human-in-the-Loop Audit & Final PDF Export',
    body: 'Any claim with confidence < 0.75 or a non-supported verdict is automatically routed for human auditor review. Researchers can toggle reviewed states, add peer-review audit notes, and download an official, compiled academic PDF audit report.',
    points: [
      'Automatic routing to Needs Human Review badge',
      'Persistent auditor overrides and inline peer review notes',
      'One-click compiled PDF report download formatted for editorial and grant boards',
    ],
  },
];

export default function Workflow() {
  const [active, setActive] = useState(0);
  const current = CHECKS[active];

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:py-20">
      {/* Pipeline Stepper Strip */}
      <div className="glass mb-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-4 px-6 py-5 border-sky-400/20 bg-sky-950/30">
        {STRIP.map((s, i) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#f0f9ff]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-500/15 text-sky-300">
                <s.icon className="h-4 w-4" aria-hidden />
              </span>
              {s.label}
            </div>
            {i < STRIP.length - 1 && (
              <ArrowRight className="hidden h-3.5 w-3.5 text-sky-400/50 sm:block" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <div className="mb-10 max-w-2xl">
        <p className="eyebrow mb-2">Automated Scholarly Pipeline</p>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-[#f0f9ff]">
          Four Checks, One Report
        </h2>
        <p className="mt-3 text-sm text-muted">
          Every stage operates under strict deterministic safeguards so reviewers can trust every verdict.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        <div role="tablist" aria-label="Verification steps" className="flex gap-2.5 overflow-x-auto lg:flex-col">
          {CHECKS.map((c, i) => (
            <button
              key={c.tab}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                'glass glass-hover whitespace-nowrap px-4 py-3.5 text-left text-xs font-semibold transition-all lg:whitespace-normal',
                i === active
                  ? '!border-sky-300/60 !bg-sky-400/20 text-[#f0f9ff] shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]'
                  : 'text-muted hover:text-[#f0f9ff]',
              )}
            >
              {c.tab}
            </button>
          ))}
        </div>

        <div key={active} role="tabpanel" className="glass fade-up p-6 sm:p-8 border-sky-400/25 bg-sky-950/40">
          <h3 className="font-display text-2xl font-bold text-[#f0f9ff] leading-snug">
            {current.title}
          </h3>
          <p className="mt-3 max-w-2xl leading-relaxed text-sm text-muted">
            {current.body}
          </p>

          <div className="mt-6 space-y-3">
            {current.points.map((p) => (
              <div key={p} className="flex items-start gap-3 text-xs leading-relaxed text-sky-100/90">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                <span>{p}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-5 border-t border-sky-400/15">
            <div className="prof-note">
              <span className="font-semibold text-sky-300">Professor’s Note:</span> A critical pipeline rule: if a paper cannot be fetched in open-access full text, we evaluate solely against the peer-reviewed abstract and explicitly cap confidence at 0.6. We never guess what full text might say.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
