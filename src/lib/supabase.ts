/**
 * LumaFace M2 — Supabase client factory + session helpers.
 *
 * A single lazy client is created on first use (never at module import), so
 * the app boots identically with or without a backend. When BACKEND_ENABLED
 * is false every helper degrades to a no-op / null — callers never need to
 * special-case the offline build.
 *
 * Auth model: email magic-link (OTP). The session is persisted by supabase-js
 * itself (localStorage, `sb-*-auth-token`); the app store keeps no auth
 * tokens of its own. Magic-link returns are handled automatically via
 * `detectSessionInUrl` when the client is created on the callback route.
 */

import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { BACKEND_ENABLED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

let client: SupabaseClient | null = null;

/** Lazy singleton. Returns null when the backend is disabled. Never throws. */
export function getSupabase(): SupabaseClient | null {
  if (!BACKEND_ENABLED) return null;
  if (!client) {
    try {
      client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (e) {
      console.warn('[LumaFace] Supabase client could not be created — running local-only.', e);
      return null;
    }
  }
  return client;
}

/** Current session (refreshed by supabase-js as needed), or null. */
export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

/** Access token for calling Edge Functions (`Authorization: Bearer …`). */
export async function getSessionToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/** The signed-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

/** Send an email magic link. Returns null on success, the error message otherwise. */
export async function sendMagicLink(email: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return 'Accounts are unavailable in this build — LumaFace works fully offline.';
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    return error ? error.message : null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not send the sign-in link. Please try again.';
  }
}

/** End the Supabase session. Local app data is untouched. */
export async function signOutBackend(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch (e) {
    console.warn('[LumaFace] sign-out failed', e);
  }
}

/** Subscribe to auth state changes. Returns an unsubscribe fn (noop when offline). */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void): () => void {
  const sb = getSupabase();
  if (!sb) return () => {};
  const {
    data: { subscription },
  } = sb.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => subscription.unsubscribe();
}

/** Test hook — drop the singleton between test cases. */
export function __resetSupabaseForTests(): void {
  client = null;
}
