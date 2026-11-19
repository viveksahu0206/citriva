'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, Plus, Search, FileUp } from 'lucide-react';
import { useDashboard } from './DashboardProvider';

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { search, setSearch } = useDashboard();

  return (
    /* Dashboard Top Rule: Flat, solid dark navy header, NO glassmorphism, NO backdrop blur */
    <header className="sticky top-0 z-30 flex items-center gap-3.5 bg-[#030914] border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-muted hover:bg-sky-400/10 hover:text-[#f0f9ff] lg:hidden"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Global Search Bar */}
      <div className="relative flex-1 max-w-xl">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400/60"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && pathname === '/dashboard/upload') {
              router.push('/dashboard/documents');
            }
          }}
          placeholder="Search verified manuscripts, DOIs, or claim keywords..."
          aria-label="Search verified manuscripts"
          className="w-full rounded-xl border border-slate-800/80 bg-slate-950/80 px-3.5 py-2 pl-10 text-xs text-[#f0f9ff] outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
        />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <button
          onClick={() => router.push('/dashboard/upload')}
          className="btn btn-primary shrink-0 px-3.5 py-2 text-xs font-semibold"
        >
          <FileUp className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Upload PDF</span>
          <span className="sr-only sm:hidden">Upload</span>
        </button>
      </div>
    </header>
  );
}
