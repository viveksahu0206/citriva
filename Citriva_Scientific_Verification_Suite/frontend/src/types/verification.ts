export type VerdictStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'UNSUPPORTED'
  | 'CONTRADICTORY'
  | 'POTENTIALLY_OUTDATED';

export type JobStatus = 'queued' | 'parsing' | 'verifying' | 'completed' | 'failed';

export interface SourcePaper {
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  oa_pdf_url: string | null;
  source_url: string | null;
}

export interface CrossReferenceFinding {
  source_title: string;
  source_citation: string;
  doi?: string | null;
  verdict: VerdictStatus;
  finding_summary: string;
}

export interface EvidenceTracePointer {
  page?: number | null;
  section?: string | null;
  sentence_id?: string | null;
  exact_passage: string;
}

export interface ClaimVerification {
  id: string;
  claim_text: string;
  context_text: string;
  raw_citation: string;
  source_paper: SourcePaper;
  verdict_status: VerdictStatus;
  evidence_quote: string;
  explanation: string;
  /** 0.0 - 1.0 */
  confidence: number;
  needs_human_review: boolean;

  /** Innovation Feature 1: Cross-Reference Verification */
  cross_references?: CrossReferenceFinding[];

  /** Innovation Feature 2: Research Gap Identification */
  research_gap?: string | null;

  /** Innovation Feature 3: Overclaim Detection */
  overclaim_detected?: boolean;
  overclaim_explanation?: string | null;

  /** Innovation Feature 4: Evidence Traceability */
  evidence_trace?: EvidenceTracePointer | null;
}

export type VerdictCounts = Record<VerdictStatus, number>;

export interface JobSummary {
  total_claims: number;
  flagged: number;
  average_confidence: number;
  counts: VerdictCounts;
}

export interface JobResponse {
  job_id: string;
  status: JobStatus;
  /** 0 - 100 */
  progress: number;
  error_message: string | null;
  summary: JobSummary | null;
  items: ClaimVerification[];
}

export type DocumentOrigin = 'workspace' | 'backend' | 'simulated';

export interface DocumentRecord {
  id: string;
  title: string;
  /** ISO date string */
  added: string;
  status: JobStatus;
  progress: number;
  origin: DocumentOrigin;
  job_id?: string;
  error_message?: string | null;
  summary?: JobSummary | null;
  items: ClaimVerification[];
}

export type ReportFilter = 'ALL' | 'NEEDS_REVIEW' | VerdictStatus;

export interface ReviewEntry {
  reviewed: boolean;
  overrideVerdict?: VerdictStatus;
  note: string;
}

export type ReviewMap = Record<string, ReviewEntry>;

/** A run of text, optionally highlighted for claim vs source comparison */
export interface Segment {
  t: string;
  hl?: boolean;
}

export interface InteractiveComparison {
  id: string;
  tab: string;
  category: string;
  claimParts: Segment[];
  quoteParts: Segment[];
  citation: {
    raw: string;
    title: string;
    authors: string;
    year: number;
    doi: string;
  };
  verdict: VerdictStatus;
  confidence: number;
  mismatchNote: string;
  needsReview: boolean;
  innovationBadge: 'Cross-Reference' | 'Research Gap' | 'Overclaim Detected' | 'Traceability';
}
