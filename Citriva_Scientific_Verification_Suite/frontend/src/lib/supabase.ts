import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Returns the shared Supabase client, or null when env vars are not set. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return getOrCreate();
}

let cached: SupabaseClient | null = null;
function getOrCreate(): SupabaseClient {
  if (!cached) {
    cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cached;
}

export const NOT_CONFIGURED_MESSAGE =
  'Authentication is running in local workspace mode. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable remote profile syncing.';

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signUpWithPassword(email: string, password: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(NOT_CONFIGURED_MESSAGE);
  return sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
  });
}

export async function signInWithPassword(email: string, password: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(NOT_CONFIGURED_MESSAGE);
  return sb.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const sb = getSupabaseClient();
  if (!sb) return;
  return sb.auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(NOT_CONFIGURED_MESSAGE);
  return sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset`,
  });
}

export async function verifyEmailOtp(email: string, token: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(NOT_CONFIGURED_MESSAGE);
  return sb.auth.verifyOtp({ email, token, type: 'signup' });
}

export async function resendVerificationEmail(email: string) {
  const sb = getSupabaseClient();
  if (!sb) throw new Error(NOT_CONFIGURED_MESSAGE);
  return sb.auth.resend({ email, type: 'signup' });
}
