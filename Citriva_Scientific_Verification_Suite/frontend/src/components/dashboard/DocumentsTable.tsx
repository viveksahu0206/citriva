'use client';

import { ArrowRight, CheckCircle2, Clock, FileText, Loader2, XCircle } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { cn, docStats, formatDate } from '@/lib/utils';
import type { DocumentRecord } from '@/types/verification';

export default function DocumentsTable({ onSelect }: { onSelect: (doc: DocumentRecord) => void }) {
  const { filteredDocs } = useDashboard();

  if (filteredDocs.length === 0) {
    return (
      <div className="glass p-12 text-center border-sky-400/20 bg-sky-950/30">
        <FileText className="mx-auto h-10 w-10 text-sky-400/60 mb-3" />
        <h4 className="font-display text-lg font-bold text-[#f0f9ff]">No manuscripts match search</h4>
        <p className="text-xs text-muted mt-1">Try resetting the verdict filter or searching for another keyword.</p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden border-sky-400/20 bg-sky-950/35">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-sky-400/15 bg-sky-950/60 font-mono text-[11px] uppercase tracking-wider text-sky-300/80">
            <tr>
              <th className="px-5 py-3.5">Manuscript</th>
              <th className="px-4 py-3.5">Added Date</th>
              <th className="px-4 py-3.5 text-center">Claims</th>
              <th className="px-4 py-3.5 text-center">Flagged</th>
              <th className="px-4 py-3.5">Pipeline Status</th>
              <th className="px-4 py-3.5 text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-400/10">
            {filteredDocs.map((doc) => {
              const stats = docStats(doc);
              const isBusy = doc.status === 'queued' || doc.status === 'parsing' || doc.status === 'verifying';
              return (
                <tr
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className="cursor-pointer transition-colors hover:bg-sky-900/30 group"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 max-w-md">
                        <p className="font-semibold text-[#f0f9ff] line-clamp-1 group-hover:text-sky-300 transition-colors">
                          {doc.title}
                        </p>
                        <p className="font-mono text-[10px] text-muted truncate mt-0.5">
                          ID: {doc.id} · Avg Conf: {Math.round(stats.averageConfidence * 100)}%
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-muted font-mono">
                    {formatDate(doc.added)}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-semibold text-[#f0f9ff]">
                    {stats.claims}
                  </td>
                  <td className="px-4 py-4 text-center font-mono">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                        stats.flagged > 0
                          ? 'border border-amber-400/30 bg-amber-400/10 text-amber-300'
                          : 'text-muted',
                      )}
                    >
                      {stats.flagged}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {doc.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span>
                    )}
                    {isBusy && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-sky-300">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {doc.status} ({doc.progress}%)
                      </span>
                    )}
                    {doc.status === 'failed' && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase font-semibold text-rose-300">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="btn btn-ghost text-xs py-1 px-2.5 font-medium group-hover:border-sky-300/50">
                      Inspect
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
