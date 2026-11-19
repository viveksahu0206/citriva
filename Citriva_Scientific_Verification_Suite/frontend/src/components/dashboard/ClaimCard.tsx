'use client';

import { useState } from 'react';
import { AlertTriangle, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Flag, Info, Link2, Sparkles, UserCheck } from 'lucide-react';
import { cn, doiUrl, VERDICT_META } from '@/lib/utils';
import ConfidenceBar from '@/components/ConfidenceBar';
import VerdictPill from '@/components/VerdictPill';
import type { ClaimVerification, ReviewEntry, VerdictStatus } from '@/types/verification';

export default function ClaimCard({
  item,
  index,
  review,
  onReview,
}: {
  item: ClaimVerification;
  index: number;
  review: ReviewEntry;
  onReview: (patch: Partial<ReviewEntry>) => void;
}) {
  const [showContext, setShowContext] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(review.note);

  const meta = VERDICT_META[item.verdict_status];
  const p = item.source_paper;
  const isReviewed = review.reviewed;

  return (
    <div
      className={cn(
        'glass p-5 sm:p-6 transition-all duration-200 border-sky-400/20 bg-sky-950/30 space-y-4',
        isReviewed && 'border-emerald-400/35 bg-emerald-950/15',
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-400/15 font-mono text-xs font-bold text-sky-300">
            #{index}
          </span>
          <VerdictPill verdict={item.verdict_status} />
          {item.needs_human_review && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-violet-300">
              <AlertTriangle className="h-3 w-3" />
              Needs Review
            </span>
          )}
        </div>

        {/* Auditor Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onReview({ reviewed: !isReviewed })}
            className={cn(
              'btn text-xs py-1.5 px-3 transition-colors',
              isReviewed
                ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                : 'btn-ghost text-muted hover:text-[#f0f9ff]',
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            {isReviewed ? 'Audited by Human' : 'Mark Reviewed'}
          </button>
        </div>
      </div>

      {/* Claim Sentence */}
      <div className="space-y-1.5">
        <p className="eyebrow text-sky-300/80">Claim Statement in Manuscript</p>
        <blockquote className="font-display text-base sm:text-lg leading-relaxed text-[#f0f9ff] border-l-2 border-sky-400/50 pl-3 py-0.5">
          “{item.claim_text}”
        </blockquote>

        {/* Context Window Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setShowContext(!showContext)}
            className="inline-flex items-center gap-1 text-xs text-sky-400/80 hover:text-sky-300 transition-colors font-medium"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', showContext && 'rotate-90')} />
            {showContext ? 'Hide Context Window' : 'Show 2-Sentence Context Window'}
          </button>
          {showContext && (
            <div className="fade-up mt-2 rounded-xl border border-sky-400/15 bg-sky-950/50 p-3 text-xs leading-relaxed text-muted">
              {item.context_text}
            </div>
          )}
        </div>
      </div>

      {/* Matched Scientific Citation & Links */}
      <div className="rounded-xl border border-sky-400/15 bg-sky-950/40 p-3.5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
              Matched Citation
            </span>
            <p className="font-semibold text-xs text-sky-100 mt-0.5">{item.raw_citation}</p>
            <p className="text-xs text-muted mt-0.5 line-clamp-1">
              {p.title} {p.year ? `(${p.year})` : ''} {p.authors.length ? `— ${p.authors.join(', ')}` : ''}
            </p>
          </div>
          <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
            <BookOpen className="h-4 w-4" />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-sky-400/10">
          {p.doi && (
            <a
              href={doiUrl(p.doi)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:text-sky-300 hover:underline"
            >
              <Link2 className="h-3 w-3" />
              doi:{p.doi}
            </a>
          )}
          {p.oa_pdf_url && (
            <a
              href={p.oa_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open Access PDF
            </a>
          )}
        </div>
      </div>

      {/* Verbatim Evidence Quote */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-sky-300/80">Verbatim Retrieved Evidence Quote</p>
          {item.evidence_trace?.section && (
            <span className="font-mono text-[10px] text-muted">
              Sec: {item.evidence_trace.section} {item.evidence_trace.page ? `· p.${item.evidence_trace.page}` : ''}
            </span>
          )}
        </div>
        <div className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-3.5 text-xs leading-relaxed text-[#f0f9ff]">
          “{item.evidence_quote}”
        </div>
      </div>

      {/* Analytical Explanation */}
      <div className="space-y-1">
        <p className="eyebrow text-sky-300/80">NLI Audit Diagnostic</p>
        <p className="text-xs leading-relaxed text-muted">{item.explanation}</p>
      </div>

      {/* Innovation Badges: Overclaim, Research Gap, Cross Reference */}
      {(item.overclaim_detected || item.research_gap || (item.cross_references && item.cross_references.length > 0)) && (
        <div className="space-y-2 pt-2 border-t border-sky-400/10">
          {item.overclaim_detected && item.overclaim_explanation && (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
              <span className="font-bold text-rose-300 uppercase tracking-wide font-mono text-[10px] block mb-0.5">
                Overclaim Detected (Pillar 3)
              </span>
              {item.overclaim_explanation}
            </div>
          )}

          {item.research_gap && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-200">
              <span className="font-bold text-amber-300 uppercase tracking-wide font-mono text-[10px] block mb-0.5">
                Research Gap Identified (Pillar 2)
              </span>
              {item.research_gap}
            </div>
          )}

          {item.cross_references && item.cross_references.map((cr, idx) => (
            <div key={idx} className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3 text-xs leading-relaxed text-indigo-200">
              <span className="font-bold text-indigo-300 uppercase tracking-wide font-mono text-[10px] block mb-0.5">
                Cross-Reference Finding (Pillar 1) — {cr.source_citation}
              </span>
              {cr.finding_summary}
            </div>
          ))}
        </div>
      )}

      {/* Confidence Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] font-mono text-muted">
          <span>Inference Confidence</span>
        </div>
        <ConfidenceBar value={item.confidence} color={meta.hex} />
      </div>

      {/* Auditor Notes Field */}
      <div className="border-t border-sky-400/10 pt-3">
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Record peer review note, retraction recommendation, or author query..."
              className="w-full rounded-xl border border-sky-400/25 bg-sky-950/60 p-3 text-xs text-[#f0f9ff] outline-none focus:border-sky-300"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNote(false)}
                className="btn btn-ghost text-xs py-1 px-3"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReview({ note: noteDraft });
                  setEditingNote(false);
                }}
                className="btn btn-primary text-xs py-1 px-3"
              >
                Save Audit Note
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs">
            <p className="text-muted italic">
              {review.note ? `Note: "${review.note}"` : 'No auditor note recorded.'}
            </p>
            <button
              onClick={() => {
                setNoteDraft(review.note);
                setEditingNote(true);
              }}
              className="text-sky-400 hover:text-sky-300 font-semibold font-mono text-[11px]"
            >
              {review.note ? 'Edit Note' : '+ Add Audit Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
