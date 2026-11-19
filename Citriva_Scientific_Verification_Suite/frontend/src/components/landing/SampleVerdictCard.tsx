'use client';

import { useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, Link2, Sparkles } from 'lucide-react';
import { HERO_INTERACTIVE_COMPARISONS } from '@/lib/research-records';
import { cn, VERDICT_META } from '@/lib/utils';
import ConfidenceBar from '@/components/ConfidenceBar';
import VerdictPill from '@/components/VerdictPill';
import type { Segment } from '@/types/verification';

function HighlightedParts({ parts, tone }: { parts: Segment[]; tone: 'claim' | 'quote' }) {
  return (
    <>
      {parts.map((p, i) =>
        p.hl ? (
          <mark
            key={i}
            className={cn(
              'rounded px-1.5 py-0.5 font-medium transition-colors',
              tone === 'claim'
                ? 'bg-rose-500/25 text-rose-200 border-b border-rose-400/50'
                : 'bg-sky-500/25 text-sky-200 border-b border-sky-400/50',
            )}
          >
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        ),
      )}
    </>
  );
}

export default function SampleVerdictCard() {
  const [index, setIndex] = useState(0);
  const [showComparison, setShowComparison] = useState(true);
  const sample = HERO_INTERACTIVE_COMPARISONS[index];
  const meta = VERDICT_META[sample.verdict];

  return (
    <div className="glass fade-up p-5 sm:p-6 relative overflow-hidden border-sky-400/20 bg-sky-950/30">
      {/* Top Bar with Innovation Badge */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-sky-300 font-semibold">
            Live Verification Engine
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[11px] text-sky-300">
          <Sparkles className="h-3 w-3 text-sky-400" />
          {sample.innovationBadge}
        </span>
      </div>

      {/* Domain Switcher Tabs */}
      <div role="tablist" aria-label="Verification examples" className="mb-5 flex flex-wrap gap-2">
        {HERO_INTERACTIVE_COMPARISONS.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200',
              i === index
                ? 'border-sky-300/60 bg-sky-400/20 text-[#f0f9ff] shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                : 'border-sky-400/15 text-muted hover:border-sky-300/35 hover:text-[#f0f9ff] hover:bg-sky-900/20',
            )}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Claim Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-mono text-[11px] uppercase tracking-wider text-sky-300/80">
            Citing Sentence in Manuscript
          </span>
          <span className="font-mono text-[10px] text-sky-400/70">{sample.category}</span>
        </div>
        <blockquote className="font-display text-lg leading-relaxed text-[#f0f9ff] sm:text-xl border-l-2 border-sky-400/40 pl-3.5 py-0.5">
          “<HighlightedParts parts={sample.claimParts} tone="claim" />”
        </blockquote>
      </div>

      {/* Matched Source Citation */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-sky-400/15 bg-sky-950/40 p-3.5">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
        <div className="min-w-0 text-xs">
          <p className="font-semibold text-sky-100">{sample.citation.raw}</p>
          <p className="text-muted mt-0.5 line-clamp-1">
            {sample.citation.title} — {sample.citation.authors} ({sample.citation.year})
          </p>
          <a
            href={`https://doi.org/${sample.citation.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
          >
            doi:{sample.citation.doi}
            <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Verdict & Human Review Indicators */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-400/10 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictPill verdict={sample.verdict} />
          {sample.needsReview && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-400/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-violet-300">
              <AlertTriangle className="h-3 w-3 text-violet-400" aria-hidden />
              Needs Human Review
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-muted">Inference Confidence</span>
        </div>
      </div>

      <div className="mt-2.5">
        <ConfidenceBar value={sample.confidence} color={meta.hex} />
      </div>

      {/* Toggle Comparison View */}
      <div className="mt-5 border-t border-sky-400/10 pt-4">
        <button
          onClick={() => setShowComparison(!showComparison)}
          aria-pressed={showComparison}
          className="btn btn-ghost w-full text-xs font-semibold py-2"
        >
          {showComparison ? 'Hide Evidence vs Claim Audit' : 'Compare Verbatim Source Quote vs Manuscript Claim'}
        </button>

        {showComparison && (
          <div className="fade-up mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3">
                <p className="eyebrow mb-1 !text-rose-300 font-semibold">Manuscript Claim</p>
                <p className="text-xs leading-relaxed text-[#f0f9ff]">
                  <HighlightedParts parts={sample.claimParts} tone="claim" />
                </p>
              </div>

              <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
                <p className="eyebrow mb-1 !text-sky-300 font-semibold">Verbatim Source Evidence</p>
                <p className="text-xs leading-relaxed text-[#f0f9ff]">
                  <HighlightedParts parts={sample.quoteParts} tone="quote" />
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200/90">
              <p className="font-semibold text-amber-300 mb-0.5">Verification Diagnostic</p>
              {sample.mismatchNote}
            </div>

            <div className="prof-note">
              <span className="font-semibold text-sky-300">Professor’s Note:</span> A model must never judge from parametric memory alone. Every verdict must be anchored to an exact verbatim substring from the retrieved PDF, bounding hallucination risks in scientific evaluation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
