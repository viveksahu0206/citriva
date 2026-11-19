import { ShieldAlert } from 'lucide-react';

export default function TrustBanner() {
  return (
    <div className="glass flex items-start gap-3.5 border-sky-400/20 bg-sky-950/40 p-4 text-xs leading-relaxed text-[#f0f9ff]">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold text-sky-200">
          Academic Integrity & Scholarly Review Notice
        </p>
        <p className="text-muted">
          Automated natural language inference and citation verification assist human scholarly audit and do not constitute a definitive academic judgment. Always consult the primary peer-reviewed literature before taking editorial or formal revision actions.
        </p>
      </div>
    </div>
  );
}
