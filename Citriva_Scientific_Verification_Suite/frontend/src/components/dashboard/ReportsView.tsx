'use client';

import { useMemo } from 'react';
import { Download, FileText, Layers, ShieldCheck } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { docStats, formatDate, VERDICT_META } from '@/lib/utils';
import TrustBanner from '@/components/TrustBanner';

export default function ReportsView() {
  const { docs, openReport, downloadPdfReport } = useDashboard();

  const completed = useMemo(() => docs.filter((d) => d.status === 'completed'), [docs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-[#f0f9ff]">Compiled Academic Audit Reports</h2>
          <p className="text-xs text-muted mt-1">
            Complete verification records with exact quote substrings and auditor annotations.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {completed.map((doc) => {
          const stats = docStats(doc);
          return (
            <div
              key={doc.id}
              className="glass p-5 sm:p-6 border-sky-400/20 bg-sky-950/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0 max-w-xl">
                <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                  Document ID: {doc.id}
                </span>
                <h3 className="font-display text-lg font-bold text-[#f0f9ff] line-clamp-1">
                  {doc.title}
                </h3>
                <p className="font-mono text-xs text-muted">
                  Audited on {formatDate(doc.added)} · {stats.claims} Claims · {stats.flagged} Flagged · Avg Conf: {Math.round(stats.averageConfidence * 100)}%
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => openReport(doc.id)}
                  className="btn btn-secondary text-xs py-2 px-3.5"
                >
                  <Layers className="h-3.5 w-3.5" />
                  View Drawer
                </button>
                <button
                  onClick={() => downloadPdfReport(doc)}
                  className="btn btn-primary text-xs py-2 px-3.5 shadow-md"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <TrustBanner />
    </div>
  );
}
