'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, FileCheck2, FileText, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useDashboard } from './DashboardProvider';
import { MAX_PDF_MB, uploadPdf, validatePdf } from '@/lib/api';
import { cn } from '@/lib/utils';
import TrustBanner from '@/components/TrustBanner';

const STAGES = [
  { key: 'queued', label: 'Magic Bytes & PDF Parsing', hint: 'Validating binary header and structural TEI-XML streams' },
  { key: 'parsing', label: 'Claim Extraction', hint: 'Isolating factual sentences with 2-sentence context windows' },
  { key: 'verifying', label: 'Waterfalling Scholarly APIs', hint: 'Resolving citations via OpenAlex, Semantic Scholar & Unpaywall' },
  { key: 'completed', label: 'Audit Report Compiled', hint: 'Extracting verbatim quote substrings and confidence bounds' },
];

export default function UploadView() {
  const router = useRouter();
  const { addDoc, openReport } = useDashboard();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = useCallback((file: File) => {
    const problem = validatePdf(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSelectedFile(file);
  }, []);

  async function startVerification() {
    if (!selectedFile) return;
    setError(null);
    setUploading(true);
    setProgress(12);
    setStageIndex(0);

    try {
      const result = await uploadPdf(selectedFile);
      setJobId(result.job_id);

      // Smooth progress animation over pipeline stages
      let cur = 15;
      const interval = setInterval(() => {
        cur += Math.floor(Math.random() * 18) + 8;
        if (cur >= 100) {
          cur = 100;
          clearInterval(interval);
          setProgress(100);
          setStageIndex(3);

          setTimeout(() => {
            setUploading(false);
            openReport(result.job_id);
          }, 800);
        } else {
          setProgress(cur);
          if (cur > 30 && cur <= 65) setStageIndex(1);
          else if (cur > 65 && cur < 95) setStageIndex(2);
          else if (cur >= 95) setStageIndex(3);
        }
      }, 700);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed. Please retry.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#f0f9ff]">Upload Academic Manuscript</h2>
        <p className="text-xs text-muted mt-1">
          Supported: Standard research papers, preprints, and manuscripts in text-based PDF format (max {MAX_PDF_MB} MB).
        </p>
      </div>

      {!uploading ? (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileDrop(file);
            }}
            className={cn(
              'glass p-10 text-center border-2 border-dashed transition-all cursor-pointer border-sky-400/25 bg-sky-950/20 hover:border-sky-300/50 hover:bg-sky-900/30',
              dragOver && 'border-sky-300 bg-sky-400/20 scale-[1.01]',
              selectedFile && 'border-emerald-400/40 bg-emerald-950/20',
            )}
            onClick={() => document.getElementById('pdf-file-input')?.click()}
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileDrop(file);
              }}
            />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/15 text-sky-300 mb-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
              {selectedFile ? <FileCheck2 className="h-7 w-7 text-emerald-400" /> : <UploadCloud className="h-7 w-7" />}
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="font-semibold text-sm text-[#f0f9ff]">{selectedFile.name}</p>
                <p className="font-mono text-xs text-emerald-300">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for Verification
                </p>
                <p className="text-[11px] text-muted pt-1">Click or drop another file to replace</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-sm text-[#f0f9ff]">
                  Drag and drop manuscript PDF here, or <span className="text-sky-400 underline">browse</span>
                </p>
                <p className="text-xs text-muted">
                  Strictly evaluated with GROBID parsing, DOI waterfall resolution, and exact quote validation.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {selectedFile && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="btn btn-ghost text-xs px-4 py-2"
              >
                Clear
              </button>
              <button
                onClick={startVerification}
                className="btn btn-primary text-xs px-5 py-2.5 shadow-lg"
              >
                <Sparkles className="h-4 w-4" />
                Launch Claim Verification Audit
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Live Pipeline Progress View */
        <div className="glass p-6 sm:p-8 border-sky-400/25 bg-sky-950/40 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-sky-400 font-bold">
                Verification Pipeline Active
              </span>
              <h3 className="font-display text-xl font-bold text-[#f0f9ff] mt-0.5">
                {selectedFile?.name}
              </h3>
            </div>
            <span className="font-mono text-xl font-bold text-sky-300">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* 4 Pipeline Stage Steppers */}
          <div className="space-y-3 pt-2">
            {STAGES.map((s, i) => {
              const done = stageIndex > i;
              const active = stageIndex === i;
              return (
                <div
                  key={s.key}
                  className={cn(
                    'flex items-start gap-3 rounded-xl p-3 border transition-all text-xs',
                    active && 'border-sky-400/40 bg-sky-500/10 text-sky-100',
                    done && 'border-emerald-400/30 bg-emerald-500/5 text-emerald-200',
                    !active && !done && 'border-transparent text-muted opacity-60',
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-700" />
                    )}
                  </span>
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{s.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prof-note">
            <span className="font-semibold text-sky-300">Professor’s Note:</span> Never fail an entire batch job if one citation fails to resolve. We catch missing DOIs cleanly under CITATION_NOT_FOUND, preserve pipeline execution, and return an auditable report.
          </div>
        </div>
      )}

      <TrustBanner />
    </div>
  );
}
