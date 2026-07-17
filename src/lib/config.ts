/**
 * LumaFace M2 — backend configuration contract.
 *
 * The Supabase publishable key is designed to be public (it is protected by
 * Row Level Security, not secrecy), so shipping it in the bundle is safe.
 * Optional Vite env vars may override the defaults (preview/staging builds):
 *
 *   VITE_SUPABASE_URL             e.g. https://<ref>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY e.g. sb_publishable_...
 *   VITE_FUNCTIONS_BASE           e.g. https://<ref>.supabase.co/functions/v1/
 *
 * BACKEND_ENABLED is the graceful-degradation switch: when false (missing
 * config) every auth/sync call becomes a no-op and the app behaves exactly
 * like M1 (local-only). Nothing in the app may assume a reachable backend.
 */

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

export const SUPABASE_URL: string = env.VITE_SUPABASE_URL ?? 'https://jxosubjpnkwyewtbxaah.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY: string =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_RlP0GGtj_UR0OAKJ2XOgFA_2yoxFK9c';

/** Base URL for Supabase Edge Functions (always ends with a slash). */
export const FUNCTIONS_BASE: string = (env.VITE_FUNCTIONS_BASE ?? `${SUPABASE_URL}/functions/v1/`).replace(/\/?$/, '/');

/** True only when both URL + publishable key are present. */
export const BACKEND_ENABLED: boolean = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
