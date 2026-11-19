'use client';

import Link from 'next/link';
import Brand from '@/components/Brand';
import { useSession } from '@/lib/useSession';
import { isSupabaseConfigured } from '@/lib/supabase';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faq', label: 'FAQ' },
];

export default function Navbar() {
  const { user, loading } = useSession();
  const signedIn = !!user;
  const unverified = signedIn && !user?.email_confirmed_at;

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Brand />
        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm font-medium text-muted transition-colors hover:text-[#f0f9ff]">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2.5">
          {!loading && isSupabaseConfigured && !signedIn && (
            <Link href="/login" className="btn btn-ghost hidden px-3.5 py-2 sm:inline-flex text-xs font-semibold">
              Sign In
            </Link>
          )}
          {!loading && unverified && (
            <Link
              href={`/auth/verify?email=${encodeURIComponent(user?.email ?? '')}`}
              className="btn btn-ghost hidden px-3.5 py-2 sm:inline-flex text-xs font-semibold text-amber-300 border-amber-400/30"
            >
              Verify Account
            </Link>
          )}
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary px-4 py-2 text-xs font-semibold">
              Open Workspace
            </Link>
          ) : isSupabaseConfigured ? (
            <Link href="/signup" className="btn btn-primary px-4 py-2 text-xs font-semibold">
              Create Account
            </Link>
          ) : (
            <Link href="/dashboard" className="btn btn-primary px-4 py-2 text-xs font-semibold">
              Open Dashboard
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
