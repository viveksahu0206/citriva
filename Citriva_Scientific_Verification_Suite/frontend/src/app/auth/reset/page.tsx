'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import { NOT_CONFIGURED_MESSAGE, isSupabaseConfigured, updatePassword } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError(NOT_CONFIGURED_MESSAGE);
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError(err.message);
      } else {
        setDone(true);
        setTimeout(() => router.push('/dashboard'), 1800);
      }
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Could not update your password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Open this page from the link in your reset email.">
      {done ? (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>Password updated. Redirecting to your dashboard…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!loading && !user && (
            <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-sm text-amber-200">
              No reset session found. Request a new link from the{' '}
              <Link href="/login" className="underline">
                sign-in page
              </Link>
              .
            </p>
          )}
          <div>
            <label htmlFor="new-password" className="eyebrow mb-1.5 block">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="eyebrow mb-1.5 block">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
