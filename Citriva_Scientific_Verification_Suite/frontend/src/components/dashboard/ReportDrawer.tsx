'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, UserCheck, X } from 'lucide-react';
import ClaimCard from './ClaimCard';
import { useDashboard } from './DashboardProvider';
import TrustBanner from '@/components/TrustBanner';
import { cn, docStats, VERDICT_META, VERDICT_ORDER } from '@/lib/utils';
import type { ReportFilter } from '@/types/verification';

export default function ReportDrawer() {
  const { activeDoc, activeFilter, closeReport, getReview, setReview, downloadPdfReport } = useDashboard();
  const [filter, setFilter] = useState<ReportFilter>('ALL');

  useEffect(() => {
    setFilter(activeFilter);
  }, [activeDoc?.id, activeFilter]);

  useEffect(() => {
    if (!activeDoc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReport();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [activeDoc, closeReport]);

  const stats = useMemo(() => (activeDoc ? docStats(activeDoc) : null), [activeDoc]);

  const visible = useMemo(() => {
    if (!activeDoc) return [];
    return activeDoc.items.filter((item) => {
      if (filter === 'ALL') return true;
      if (filter === 'NEEDS_REVIEW') return item.needs_human_review && !getReview(activeDoc.id, item.id).reviewed;
      return item.verdict_status === filter;
    });
  }, [activeDoc, filter, getReview]);

  if (!activeDoc || !stats) return null;

  const chips: Array<{ key: ReportFilter; label: string; count: number }> = [
    { key: 'ALL', label: 'All Claims', count: activeDoc.items.length },
    ...VERDICT_ORDER.map((v) => ({
      key: v as ReportFilter,
      label: VERDICT_META[v].label,
      count: stats.counts[v],
    })),
    {
      key: 'NEEDS_REVIEW',
      label: 'Needs Human Review',
      count: activeDoc.items.filter((i) => i.needs_human_review && !getReview(activeDoc.id, i.id).reviewed).length,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Claim verification report drawer">
      <button aria-label="Close report" onClick={closeReport} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="slide-in relative flex h-full w-full max-w-3xl flex-col border-l border-sky-400/20 bg-[#040e1f] text-[#f0f9ff]">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-sky-400/15 p-5 sm:p-6 bg-[#030914]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                Verification Audit Drawer
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-500" />
              <span className="font-mono text-[10px] text-muted">{activeDoc.id}</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#f0f9ff] leading-tight">
              {activeDoc.title}
            </h2>
            <p className="mt-1 font-mono text-xs text-sky-300/80">
              {stats.claims} Claims Extracted · {stats.flagged} Flagged Discrepancies · {Math.round(stats.averageConfidence * 100)}% Avg Confidence
            </p>
          </div>
          <button
            onClick={closeReport}
            className="rounded-xl p-2 text-muted hover:bg-sky-400/10 hover:text-[#f0f9ff] transition-colors"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Filter Chips & PDF Export Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/15 px-5 py-3.5 bg-sky-950/20">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter claims">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                aria-pressed={filter === c.key}
                className={cn(
                  'rounded-xl border px-3 py-1.5 text-xs font-medium transition-all',
                  filter === c.key
                    ? 'border-sky-300/60 bg-sky-400/20 text-[#f0f9ff] shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                    : 'border-sky-400/15 text-muted hover:border-sky-300/35 hover:text-[#f0f9ff]',
                )}
              >
                {c.label} <span className="font-mono opacity-80 font-bold ml-1">{c.count}</span>
              </button>
            ))}
          </div>

          {/* Strictly PDF export only */}
          <button
            onClick={() => downloadPdfReport(activeDoc)}
            className="btn btn-primary text-xs py-1.5 px-3.5 shadow-md"
            title="Download compiled PDF audit report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Final PDF</span>
          </button>
        </div>

        {/* Claim Cards Scrollable Area */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {visible.length === 0 ? (
            <div className="glass p-8 text-center text-xs text-muted border-sky-400/15 bg-sky-950/20">
              No claims match this filter.
            </div>
          ) : (
            visible.map((item) => (
              <ClaimCard
                key={item.id}
                index={activeDoc.items.indexOf(item) + 1}
                item={item}
                review={getReview(activeDoc.id, item.id)}
                onReview={(patch) => setReview(activeDoc.id, item.id, patch)}
              />
            ))
          )}

          <div className="pt-2">
            <TrustBanner />
          </div>
        </div>
      </div>
    </div>
  );
}
