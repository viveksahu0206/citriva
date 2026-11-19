'use client';

import { useDashboard } from './DashboardProvider';
import DocumentsTable from './DocumentsTable';
import TrustBanner from '@/components/TrustBanner';

export default function DocumentsView() {
  const { openReport } = useDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#f0f9ff]">Manuscript Repository</h2>
        <p className="text-xs text-muted mt-1">
          All user-uploaded preprints and peer-reviewed documents with associated NLI claim audit results.
        </p>
      </div>

      <DocumentsTable onSelect={(doc) => openReport(doc.id)} />

      <TrustBanner />
    </div>
  );
}
