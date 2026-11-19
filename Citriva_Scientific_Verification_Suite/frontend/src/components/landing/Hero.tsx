import Link from 'next/link';
import { ArrowRight, FileCheck2, Sparkles, Layers, ShieldCheck } from 'lucide-react';
import SampleVerdictCard from './SampleVerdictCard';

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-2 lg:gap-14 lg:pt-16">
      <div className="fade-up space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-400/10 px-3.5 py-1.5 shadow-[0_0_15px_-3px_rgba(56,189,248,0.3)]">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-200">
            Scientific Claim & Citation Verification
          </span>
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl text-[#f0f9ff]">
          Verify whether research papers <span className="shimmer-text">actually support</span> what they cite.
        </h1>

        <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Citriva parses dense academic PDFs, resolves every bibliographic reference to real scholarly sources (OpenAlex, Semantic Scholar, Unpaywall), extracts exact verbatim evidence, and delivers auditable NLI verdicts with zero hallucinated claims.
        </p>

        {/* Feature Highlights Pills */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200/90">
            <CheckCircleIcon className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Overclaim Detection</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200/90">
            <CheckCircleIcon className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Cross-Reference Audit</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200/90">
            <CheckCircleIcon className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Research Gap Tagging</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-sky-200/90">
            <CheckCircleIcon className="h-4 w-4 text-sky-400 shrink-0" />
            <span>Evidence Traceability</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3.5 pt-3">
          <Link href="/dashboard/upload" className="btn btn-primary text-sm px-5 py-3">
            <FileCheck2 className="h-4 w-4" aria-hidden />
            Upload a Paper
          </Link>
          <Link href="/dashboard" className="btn btn-secondary text-sm px-5 py-3">
            <Layers className="h-4 w-4" aria-hidden />
            Open Workspace
          </Link>
        </div>

        <div className="prof-note max-w-lg">
          <span className="font-semibold text-sky-300">Professor’s Note:</span> The hardest problem in scientific AI is not calling an LLM—it is parsing multi-column PDF layouts, resolving messy bibstrings against open scholarly graphs, and enforcing mathematical quote containment.
        </div>
      </div>

      <SampleVerdictCard />
    </section>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
