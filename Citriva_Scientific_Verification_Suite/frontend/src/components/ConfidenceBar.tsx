import { pct } from '@/lib/utils';

export default function ConfidenceBar({ value, color }: { value: number; color: string }) {
  const width = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/80 border border-slate-800/60"
        role="progressbar"
        aria-label="Confidence score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
      >
        <div
          className="h-full rounded-full transition-all duration-500 shadow-sm"
          style={{ width, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs text-[#f0f9ff]">{pct(value)}</span>
    </div>
  );
}
