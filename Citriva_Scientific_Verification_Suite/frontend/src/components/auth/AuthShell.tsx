import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Brand from '@/components/Brand';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="hidden lg:block space-y-6">
        <Brand />
        <h2 className="mt-8 font-display text-4xl font-bold leading-tight tracking-tight text-[#f0f9ff]">
          Autonomous Claim Extraction.
          <br />
          <span className="shimmer-text">Auditable Source Grounding.</span>
        </h2>
        <p className="text-base text-muted max-w-lg leading-relaxed">
          Verify citations against primary peer-reviewed literature across OpenAlex, Semantic Scholar, and Unpaywall.
        </p>
        <ul className="mt-6 space-y-3.5 text-sm text-sky-200/90 font-medium">
          {[
            'Extracts claims with complete sentence context windows',
            'Resolves DOIs and fetches Open-Access full texts',
            'Enforces exact verbatim quote matching guardrails',
            'Routes overclaims and boundary mismatches to human review',
          ].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="prof-note max-w-md mt-6">
          <span className="font-semibold text-sky-300">Professor’s Note:</span> Authentication secures researcher workspaces and guarantees Row-Level Security (RLS) across proprietary unreleased manuscripts.
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Brand />
        </div>
        <div className="glass fade-up p-6 sm:p-8 border-sky-400/25 bg-sky-950/40">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#f0f9ff]">{title}</h1>
          <p className="mt-2 text-xs text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-5 flex items-center justify-between text-xs">
          <Link href="/" className="inline-flex items-center gap-1.5 text-muted hover:text-[#f0f9ff] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to homepage
          </Link>
          <Link
            href="/dashboard"
            className="text-sky-400 hover:text-sky-300 font-semibold"
          >
            Direct Workspace Access →
          </Link>
        </div>
      </div>
    </main>
  );
}
