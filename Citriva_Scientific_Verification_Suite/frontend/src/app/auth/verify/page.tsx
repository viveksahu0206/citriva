'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, MailCheck, ArrowRight } from 'lucide-react';
import AuthShell from '@/components/auth/AuthShell';
import OtpInput from '@/components/auth/OtpInput';
import {
  NOT_CONFIGURED_MESSAGE,
  isSupabaseConfigured,
  resendVerificationEmail,
  verifyEmailOtp,
} from '@/lib/supabase';
import { useSession } from '@/lib/useSession';

const RESEND_SECONDS = 45;

export default function VerifyPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const verified = Boolean(user?.email_confirmed_at);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setEmail(q.get('email') ?? '');
    setSent(q.get('sent') === '1');
  }, []);

  useEffect(() => {
    if (!verified) return;
    const t = setTimeout(() => router.push('/dashboard'), 2000);
    return () => clearTimeout(t);
  }, [verified, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured) {
      // Local development fallback
      router.push('/dashboard');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please provide the institutional email address used during registration.');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setBusy(true);
    try {
      const { error: err } = await verifyEmailOtp(email.trim(), code);
      if (err) setError(err.message);
      else router.push('/dashboard');
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Verification failed. Please retry.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    if (!isSupabaseConfigured) {
      setInfo('Local mode active: click "Verify Account" or "Enter Workspace" directly.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter your institutional email first.');
      return;
    }
    setResending(true);
    try {
      const { error: err } = await resendVerificationEmail(email.trim());
      if (err) {
        setError(err.message);
      } else {
        setInfo('A refreshed 6-digit OTP code has been dispatched.');
        setCooldown(RESEND_SECONDS);
      }
    } catch (x) {
      setError(x instanceof Error ? x.message : 'Unable to dispatch code.');
    } finally {
      setResending(false);
    }
  }

  if (!loading && verified) {
    return (
      <AuthShell title="Account Confirmed" subtitle="Your research profile is authorized.">
        <div role="status" className="flex items-start gap-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-4 text-sky-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden />
          <div>
            <p className="font-semibold text-sky-100">Verification Complete</p>
            <p className="mt-1 text-xs text-muted">Routing to your workspace...</p>
          </div>
        </div>
        <Link href="/dashboard" className="btn btn-primary mt-5 w-full">
          Open Workspace Now
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify Account"
      subtitle={
        sent
          ? 'A 6-digit confirmation code and secure link were dispatched to your inbox.'
          : 'Enter the 6-digit code dispatched to your institutional address.'
      }
    >
      {!isSupabaseConfigured && (
        <div className="mb-5 rounded-xl border border-sky-400/30 bg-sky-950/40 p-3 text-xs text-sky-200 leading-relaxed">
          <p className="font-semibold text-sky-300 mb-1">Local Development Mode</p>
          <p>
            Supabase auth service is offline. You may enter any 6 digits or click "Verify Account" below to enter the live workspace immediately.
          </p>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        <div>
          <label htmlFor="verify-email" className="eyebrow mb-1.5 block">
            Institutional Email
          </label>
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="researcher@institution.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </div>

        <div>
          <p className="eyebrow mb-2">6-Digit Verification Code</p>
          <OtpInput value={code} onChange={setCode} disabled={busy} />
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 text-xs text-sky-200">
            <MailCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            {info}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Verify Account & Open Workspace
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-muted space-y-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-sky-400 hover:text-sky-300 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? 'Sending…' : cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Verification Code'}
        </button>
        <p>
          Need to correct email?{' '}
          <Link href="/signup" className="text-sky-400 hover:text-sky-300 font-semibold">
            Re-enter registration
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
