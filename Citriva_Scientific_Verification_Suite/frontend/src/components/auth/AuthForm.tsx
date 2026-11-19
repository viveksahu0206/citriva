'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from 'lucide-react';
import AuthShell from './AuthShell';
import {
  NOT_CONFIGURED_MESSAGE,
  isSupabaseConfigured,
  sendPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/supabase';

type Mode = 'login' | 'signup';
type View = 'form' | 'reset';

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [view, setView] = useState<View>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Please enter a valid academic or professional email address.');
      return;
    }

    if (view === 'reset') {
      if (!isSupabaseConfigured) {
        setInfo('Supabase environment not configured; redirecting to workspace...');
        setTimeout(() => router.push('/dashboard'), 1000);
        return;
      }
      setBusy(true);
      const { error: err } = await sendPasswordReset(cleanEmail).catch((x: Error) => ({ error: x }));
      setBusy(false);
      if (err) setError(err.message);
      else setInfo('If an account exists for that address, a password reset link has been dispatched.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (isSignup && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured) {
      // Offline fallback: allow researchers to enter workspace directly
      router.push('/dashboard');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { data, error: err } = await signUpWithPassword(cleanEmail, password);
        if (err) {
          setError(err.message);
        } else if (data.session) {
          router.push('/dashboard');
        } else {
          router.push(`/auth/verify?email=${encodeURIComponent(cleanEmail)}&sent=1`);
        }
      } else {
        const { error: err } = await signInWithPassword(cleanEmail, password);
        if (err) {
          if (/not confirmed/i.test(err.message)) {
            router.push(`/auth/verify?email=${encodeURIComponent(cleanEmail)}`);
          } else {
            setError(err.message);
          }
        } else {
          router.push('/dashboard');
        }
      }
    } catch (x) {
      setError(x instanceof Error ? x.message : 'An error occurred during authentication.');
    } finally {
      setBusy(false);
    }
  }

  const title =
    view === 'reset' ? 'Reset Password' : isSignup ? 'Create Researcher Account' : 'Sign in to Citriva';
  const subtitle =
    view === 'reset'
      ? 'Enter your institutional email to receive a secure recovery link.'
      : isSignup
        ? 'Register your research workspace. An OTP verification code will be dispatched.'
        : 'Access your verified manuscripts, active pipeline runs, and audit scorecards.';

  return (
    <AuthShell title={title} subtitle={subtitle}>
      {!isSupabaseConfigured && (
        <div className="mb-5 rounded-xl border border-sky-400/30 bg-sky-950/50 p-3 text-xs leading-relaxed text-sky-200">
          <p className="font-semibold text-sky-300 mb-1">Development Notice</p>
          <p>
            Supabase keys not yet detected in environment. Submitting this form will automatically initialize a local session and open your workspace.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="eyebrow mb-1.5 block">
            Institutional Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400/70" aria-hidden />
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input pl-10"
              placeholder="researcher@institution.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        {view === 'form' && (
          <div>
            <label htmlFor="password" className="eyebrow mb-1.5 block">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400/70" aria-hidden />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className="input pl-10 pr-10"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400/70 hover:text-sky-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {view === 'form' && isSignup && (
          <div>
            <label htmlFor="confirm" className="eyebrow mb-1.5 block">
              Confirm Password
            </label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input"
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 text-xs text-sky-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden />
            {info}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full py-2.5" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {view === 'reset' ? 'Send Password Reset Link' : isSignup ? 'Create Account' : 'Sign in to Workspace'}
        </button>
      </form>

      <div className="mt-5 space-y-2 text-center text-xs text-muted">
        {view === 'reset' ? (
          <button type="button" onClick={() => { setView('form'); setError(null); setInfo(null); }} className="text-sky-400 hover:text-sky-300 font-semibold">
            ← Back to Sign In
          </button>
        ) : (
          <>
            {!isSignup && (
              <button type="button" onClick={() => { setView('reset'); setError(null); setInfo(null); }} className="block w-full text-sky-400/80 hover:text-sky-300">
                Forgot password?
              </button>
            )}
            <p className="pt-2">
              {isSignup ? 'Already have an account?' : 'New researcher on Citriva?'}{' '}
              <Link href={isSignup ? '/login' : '/signup'} className="text-sky-400 hover:text-sky-300 font-semibold">
                {isSignup ? 'Sign In' : 'Create an Account'}
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
