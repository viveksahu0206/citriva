'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError, docFromJob, exportReportPdf, getJob, loadStoredDocuments, persistDocuments } from '@/lib/api';
import { docStats } from '@/lib/utils';
import type {
  DocumentRecord,
  ReportFilter,
  ReviewEntry,
  ReviewMap,
  VerdictStatus,
} from '@/types/verification';

const REVIEWS_KEY = 'citriva_claim_reviews_v2';

interface DashboardContextValue {
  docs: DocumentRecord[];
  filteredDocs: DocumentRecord[];
  search: string;
  setSearch: (value: string) => void;
  verdictFilter: VerdictStatus | null;
  setVerdictFilter: (value: VerdictStatus | null) => void;
  addDoc: (doc: DocumentRecord) => void;
  activeDoc: DocumentRecord | null;
  activeFilter: ReportFilter;
  openReport: (id: string, filter?: ReportFilter) => void;
  closeReport: () => void;
  reviews: ReviewMap;
  getReview: (docId: string, claimId: string) => ReviewEntry;
  setReview: (docId: string, claimId: string, patch: Partial<ReviewEntry>) => void;
  downloadPdfReport: (doc: DocumentRecord) => Promise<void>;
  toast: string | null;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside <DashboardProvider>');
  return ctx;
}

function isActiveStatus(status: DocumentRecord['status']): boolean {
  return status === 'queued' || status === 'parsing' || status === 'verifying';
}

export default function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [search, setSearch] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<VerdictStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ReportFilter>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const hydrated = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Load stored workspace documents and review annotations */
  useEffect(() => {
    const loadedDocs = loadStoredDocuments();
    setDocs(loadedDocs);

    try {
      const rawReviews = localStorage.getItem(REVIEWS_KEY);
      if (rawReviews) setReviews(JSON.parse(rawReviews) as ReviewMap);
    } catch {
      /* ignore storage parse blip */
    }
    hydrated.current = true;

    const open = new URLSearchParams(window.location.search).get('open');
    if (open) setActiveId(open);
  }, []);

  /* Save updates to local storage */
  useEffect(() => {
    if (!hydrated.current || docs.length === 0) return;
    persistDocuments(docs);
  }, [docs]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
    } catch {
      /* storage full */
    }
  }, [reviews]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* Reactive Polling for In-Flight Processing Jobs */
  const activeKey = docs
    .filter((d) => d.job_id && isActiveStatus(d.status))
    .map((d) => `${d.id}:${d.status}`)
    .join('|');

  useEffect(() => {
    if (!activeKey) return;
    const timer = setInterval(async () => {
      const targets = docs.filter((d) => d.job_id && isActiveStatus(d.status));
      for (const doc of targets) {
        try {
          const job = await getJob(doc.job_id as string);
          setDocs((prev) =>
            prev.map((p) =>
              p.id === doc.id
                ? docFromJob(job, p.title, p.origin === 'simulated', p)
                : p,
            ),
          );
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setDocs((prev) =>
              prev.map((p) =>
                p.id === doc.id
                  ? { ...p, status: 'failed', error_message: err.message }
                  : p,
              ),
            );
          }
        }
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [activeKey, docs]);

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (q && !d.title.toLowerCase().includes(q)) return false;
      if (verdictFilter && docStats(d).counts[verdictFilter] === 0) return false;
      return true;
    });
  }, [docs, search, verdictFilter]);

  const addDoc = useCallback((doc: DocumentRecord) => {
    setDocs((prev) => [doc, ...prev.filter((p) => p.id !== doc.id)]);
  }, []);

  const openReport = useCallback((id: string, filter: ReportFilter = 'ALL') => {
    setActiveId(id);
    setActiveFilter(filter);
  }, []);

  const closeReport = useCallback(() => setActiveId(null), []);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeId) ?? null,
    [docs, activeId],
  );

  const getReview = useCallback(
    (docId: string, claimId: string): ReviewEntry =>
      reviews[`${docId}:${claimId}`] ?? { reviewed: false, note: '' },
    [reviews],
  );

  const setReview = useCallback(
    (docId: string, claimId: string, patch: Partial<ReviewEntry>) => {
      const key = `${docId}:${claimId}`;
      setReviews((prev) => ({
        ...prev,
        [key]: { reviewed: false, note: '', ...prev[key], ...patch },
      }));
    },
    [],
  );

  /**
   * PDF Report Download Only:
   * GET /api/v1/jobs/{job_id}/export?format=pdf
   * Strictly PDF format only; never .md or .json.
   */
  const downloadPdfReport = useCallback(
    async (doc: DocumentRecord) => {
      try {
        await exportReportPdf(doc);
        showToast(`Audit report for "${doc.title.slice(0, 32)}..." downloaded.`);
      } catch (err) {
        showToast('Unable to compile PDF report. Please verify connection.');
      }
    },
    [showToast],
  );

  const value: DashboardContextValue = {
    docs,
    filteredDocs,
    search,
    setSearch,
    verdictFilter,
    setVerdictFilter,
    addDoc,
    activeDoc,
    activeFilter,
    openReport,
    closeReport,
    reviews,
    getReview,
    setReview,
    downloadPdfReport,
    toast,
  };

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
