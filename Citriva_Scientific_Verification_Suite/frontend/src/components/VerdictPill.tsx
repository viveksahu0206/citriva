import { cn, VERDICT_META } from '@/lib/utils';
import type { VerdictStatus } from '@/types/verification';

export default function VerdictPill({
  verdict,
  className,
}: {
  verdict: VerdictStatus;
  className?: string;
}) {
  const meta = VERDICT_META[verdict];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wide',
        meta.text,
        meta.bg,
        meta.border,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.hex }} />
      {meta.label}
    </span>
  );
}
