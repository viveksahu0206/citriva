'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileCheck2, FileUp, Sparkles, TrendingUp } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import DocumentsTable from './DocumentsTable';
import { cn, docStats, VERDICT_META, VERDICT_ORDER } from '@/lib/utils';
import type { VerdictStatus } from '@/types/verification';

export default function OverviewView() {
  const router = useRouter();
  const { docs, verdictFilter, setVerdictFilter, openReport } = useDashboard();

  const aggregate = useMemo(() => {
    let totalClaims = 0;
    let flagged = 0;
    let confSum = 0;
    let claimDocs = 0;
    const counts = {
      SUPPORTED: 0,
      PARTIALLY_SUPPORTED: 0,
      UNSUPPORTED: 0,
      CONTRADICTORY: 0,
      POTENTIALLY_OUTDATED: 0,
    };

    for (const d of docs) {
      const s = docStats(d);
      totalClaims += s.claims;
      flagged += s.flagged;
      if (s.claims > 0) {
        confSum += s.averageConfidence;
        claimDocs += 1;
      }
      for (const k of VERDICT_ORDER) counts[k] += s.counts[k];
    }

    const avgConf = claimDocs > 0 ? confSum / claimDocs : 0;
    return {
      papers: docs.length,
      claims: totalClaims,
      flagged,
      avgConfidence: Math.round(avgConf * 100),
      counts,
    };
  }, [docs]);

  const cards = [
    { label: 'Papers Checked', value: aggregate.papers, icon: FileCheck2, color: 'text-sky-400' },
    { label: 'Claims Analysed', value: aggregate.claims, icon: TrendingUp, color: 'text-indigo-400' },
    { label: 'Citations Flagged', value: aggregate.flagged, icon: AlertTriangle, color: 'text-amber-400' },
    {
      label: 'Average Confidence',
      value: `${aggregate.avgConfidence}%`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass p-5 border-sky-400/20 bg-sky-950/35 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1.5">{c.label}</p>
              <p className="font-display text-3xl font-bold text-[#f0f9ff]">{c.value}</p>
            </div>
            <span className={cn('p-3 rounded-xl border border-sky-400/20 bg-sky-400/10', c.color)}>
              <c.icon className="h-6 w-6" aria-hidden />
            </span>
          </div>
        ))}
      </div>

      {/* Interactive Verdicts Breakdown Filter Bar */}
      <div className="glass p-5 sm:p-6 border-sky-400/20 bg-sky-950/35 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-[#f0f9ff]">Verdicts Breakdown</h3>
            <p className="text-xs text-muted">Click any category token to filter manuscripts across the workspace.</p>
          </div>
          {verdictFilter && (
            <button
              onClick={() => setVerdictFilter(null)}
              className="btn btn-ghost text-xs py-1.5 px-3 border-sky-400/30"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {VERDICT_ORDER.map((v) => {
            const meta = VERDICT_META[v];
            const active = verdictFilter === v;
            const count = aggregate.counts[v];
            return (
              <button
                key={v}
                onClick={() => setVerdictFilter(active ? null : (v as VerdictStatus))}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all duration-150',
                  active
                    ? 'border-sky-300/80 bg-sky-400/20 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                    : 'border-sky-400/15 bg-sky-950/30 hover:border-sky-300/40 hover:bg-sky-900/30',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.hex }} />
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-200">
                    {meta.label}
                  </span>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-[#f0f9ff]">{count}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Uploaded Manuscripts Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-[#f0f9ff]">Verified Academic Manuscripts</h3>
            <p className="text-xs text-muted">Select any manuscript to inspect claim-by-claim evidence drawer.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/upload')}
            className="btn btn-primary text-xs py-2 px-3.5"
          >
            <FileUp className="h-3.5 w-3.5" />
            Upload New Paper
          </button>
        </div>

        <DocumentsTable onSelect={(doc) => openReport(doc.id)} />
      </div>
    </div>
  );
}
