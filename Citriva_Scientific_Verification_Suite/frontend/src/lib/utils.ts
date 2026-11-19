import type {
  ClaimVerification,
  DocumentRecord,
  VerdictCounts,
  VerdictStatus,
} from '@/types/verification';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export const VERDICT_ORDER: VerdictStatus[] = [
  'SUPPORTED',
  'PARTIALLY_SUPPORTED',
  'UNSUPPORTED',
  'CONTRADICTORY',
  'POTENTIALLY_OUTDATED',
];

export interface VerdictMeta {
  label: string;
  hex: string;
  text: string;
  bg: string;
  border: string;
}

export const VERDICT_META: Record<VerdictStatus, VerdictMeta> = {
  SUPPORTED: {
    label: 'Supported',
    hex: '#34d399',
    text: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
  },
  PARTIALLY_SUPPORTED: {
    label: 'Partially supported',
    hex: '#fbbf24',
    text: 'text-amber-300',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
  },
  UNSUPPORTED: {
    label: 'Unsupported',
    hex: '#fb7185',
    text: 'text-rose-300',
    bg: 'bg-rose-400/10',
    border: 'border-rose-400/30',
  },
  CONTRADICTORY: {
    label: 'Contradictory',
    hex: '#fb7185',
    text: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/40',
  },
  POTENTIALLY_OUTDATED: {
    label: 'Potentially outdated',
    hex: '#38bdf8',
    text: 'text-sky-300',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/30',
  },
};

export function emptyCounts(): VerdictCounts {
  return {
    SUPPORTED: 0,
    PARTIALLY_SUPPORTED: 0,
    UNSUPPORTED: 0,
    CONTRADICTORY: 0,
    POTENTIALLY_OUTDATED: 0,
  };
}

export interface DocStats {
  claims: number;
  flagged: number;
  needsReview: number;
  averageConfidence: number;
  counts: VerdictCounts;
}

export function docStats(doc: DocumentRecord): DocStats {
  const counts = emptyCounts();
  if (doc.items.length > 0) {
    let conf = 0;
    let review = 0;
    for (const item of doc.items) {
      counts[item.verdict_status] += 1;
      conf += item.confidence;
      if (item.needs_human_review) review += 1;
    }
    const claims = doc.items.length;
    return {
      claims,
      flagged: claims - counts.SUPPORTED,
      needsReview: review,
      averageConfidence: conf / claims,
      counts,
    };
  }
  if (doc.summary) {
    return {
      claims: doc.summary.total_claims,
      flagged: doc.summary.flagged,
      needsReview: 0,
      averageConfidence: doc.summary.average_confidence,
      counts: { ...counts, ...doc.summary.counts },
    };
  }
  return { claims: 0, flagged: 0, needsReview: 0, averageConfidence: 0, counts };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function doiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

export function openAlexUrl(doi: string): string {
  return `https://api.openalex.org/works/https://doi.org/${doi}`;
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'verification-report'
  );
}
