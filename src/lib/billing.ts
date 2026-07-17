/**
 * billing.ts — LumaFace M2 billing + support client (engineer B).
 *
 * Talks to the live Supabase backend:
 *   POST {FUNCTIONS_BASE}/create-checkout-session  (JWT) {priceKey} → {url}
 *   POST {FUNCTIONS_BASE}/entitlement-status       (JWT) → {is_pro, plan_label?, current_period_end?}
 *   POST/GET {SUPABASE_URL}/rest/v1/support_tickets (JWT, RLS: own rows)
 *
 * Every function takes the session JWT explicitly, so this module stays
 * independent of how the auth engineer shapes the store slice. Errors are
 * typed (`BillingErrorKind`) so the UI can render the three-mode contract:
 * signed-in+configured → Stripe redirect · misconfigured → honest
 * "payments opening soon" · signed-out → M1 demo path. Nothing here ever
 * fakes a real charge.
 */

import { FUNCTIONS_BASE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

/* ═══════════════════════════ Types ═══════════════════════════════════ */

export type PriceKey = 'monthly' | 'yearly';

/** Server entitlement, mapped to camelCase. */
export interface EntitlementStatus {
  isPro: boolean;
  planLabel: string | null;
  currentPeriodEnd: string | null;
}

/**
 * - `unauthenticated`: no/expired JWT (401/403, or no token supplied)
 * - `misconfigured`: backend reachable but Stripe not set up (edge 500 "Server misconfigured")
 * - `network`: fetch threw (offline/DNS/CORS)
 * - `server`: any other non-2xx or an unreadable success payload
 */
export type BillingErrorKind = 'unauthenticated' | 'misconfigured' | 'network' | 'server';

export interface BillingError {
  kind: BillingErrorKind;
  message: string;
  status?: number;
}

export type BillingResult<T> = { ok: true; data: T } | { ok: false; error: BillingError };

export interface RequestOptions {
  /** injectable for tests */
  fetchImpl?: typeof fetch;
  functionsBase?: string;
}

/* ═══════════════════════ Internal helpers ════════════════════════════ */

function fail<T = never>(kind: BillingErrorKind, message: string, status?: number): BillingResult<T> {
  return { ok: false, error: status === undefined ? { kind, message } : { kind, message, status } };
}

function pickStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

/** Pull a human message out of an edge/PostgREST error body. */
function errorMessage(json: unknown): string | null {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    return pickStr(o.error) ?? pickStr(o.message) ?? pickStr(o.msg);
  }
  return null;
}

async function request<T>(url: string, init: RequestInit, fetchImpl?: typeof fetch): Promise<BillingResult<T>> {
  const f = fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await f(url, init);
  } catch {
    return fail('network', 'Could not reach the server — check your connection and try again.');
  }
  const text = await res.text().catch(() => '');
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body — keep raw text for the message */
    }
  }
  if (!res.ok) {
    const msg = errorMessage(json) ?? (text || `Request failed (${res.status})`);
    if (res.status === 401 || res.status === 403) {
      return fail('unauthenticated', 'Your session expired — sign in again.', res.status);
    }
    if (/misconfigur/i.test(msg)) return fail('misconfigured', msg, res.status);
    return fail('server', msg, res.status);
  }
  return { ok: true, data: json as T };
}

function fnBase(opts?: { functionsBase?: string }): string {
  return (opts?.functionsBase ?? FUNCTIONS_BASE).replace(/\/+$/, '');
}

function edgeHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
}

/* ═══════════════════════ Auth bridge (parallel contract) ═════════════ */

/**
 * Normalized view of the auth slice the parallel engineer adds to the store
 * (`state.auth.status` / `userId` / `email`, plus a session token). Reads
 * defensively: missing slice → signed-out, and the token is looked up under
 * the common field names so the merge order never breaks billing.
 */
export interface AuthSnapshot {
  /** normalized lowercase status, e.g. 'signed-in' | 'signed-out' | 'loading' */
  status: string;
  signedIn: boolean;
  userId: string | null;
  email: string | null;
  token: string | null;
}

const SIGNED_OUT: AuthSnapshot = { status: 'signed-out', signedIn: false, userId: null, email: null, token: null };

export function authFromApp(app: unknown): AuthSnapshot {
  if (!app || typeof app !== 'object') return SIGNED_OUT;
  const auth = (app as { auth?: unknown }).auth;
  if (!auth || typeof auth !== 'object') return SIGNED_OUT;
  const a = auth as Record<string, unknown>;
  const session = (a.session && typeof a.session === 'object' ? a.session : {}) as Record<string, unknown>;
  const user = (a.user && typeof a.user === 'object' ? a.user : {}) as Record<string, unknown>;

  const token = pickStr(a.token) ?? pickStr(a.accessToken) ?? pickStr(a.access_token) ?? pickStr(session.access_token);
  const statusRaw = pickStr(a.status) ?? (token ? 'signed-in' : 'signed-out');
  const status = statusRaw.toLowerCase().replace(/[\s_]+/g, '-');
  const signedIn =
    status === 'signed-in' || status === 'authenticated' || (Boolean(token) && status !== 'signed-out' && status !== 'loading');

  return {
    status,
    signedIn,
    userId: pickStr(a.userId) ?? pickStr(a.user_id) ?? pickStr(user.id),
    email: pickStr(a.email) ?? pickStr(user.email),
    token,
  };
}

/* ═══════════════════════════ Entitlement ═════════════════════════════ */

interface RawEntitlement {
  is_pro?: unknown;
  plan_label?: unknown;
  current_period_end?: unknown;
}

/** POST entitlement-status — the server is the source of truth for PRO. */
export async function fetchEntitlement(
  token: string | null | undefined,
  opts: RequestOptions = {},
): Promise<BillingResult<EntitlementStatus>> {
  if (!token) return fail('unauthenticated', 'Sign in to check your subscription.');
  const res = await request<RawEntitlement>(
    `${fnBase(opts)}/entitlement-status`,
    { method: 'POST', headers: edgeHeaders(token) },
    opts.fetchImpl,
  );
  if (!res.ok) return res;
  const raw = res.data ?? {};
  return {
    ok: true,
    data: {
      isPro: raw.is_pro === true,
      planLabel: pickStr(raw.plan_label),
      currentPeriodEnd: pickStr(raw.current_period_end),
    },
  };
}

/* ═══════════════════════════ Stripe Checkout ═════════════════════════ */

/**
 * POST create-checkout-session → {url} for the Stripe Checkout redirect.
 * `misconfigured` means payments are not switched on server-side — the UI
 * must show the honest "opening soon" state, never a fake charge.
 */
export async function startCheckout(
  priceKey: PriceKey,
  token: string | null | undefined,
  opts: RequestOptions = {},
): Promise<BillingResult<{ url: string }>> {
  if (!token) return fail('unauthenticated', 'Sign in to purchase.');
  const res = await request<{ url?: unknown }>(
    `${fnBase(opts)}/create-checkout-session`,
    { method: 'POST', headers: edgeHeaders(token), body: JSON.stringify({ priceKey }) },
    opts.fetchImpl,
  );
  if (!res.ok) return res;
  const url = res.data ? pickStr(res.data.url) : null;
  if (!url) return fail('server', 'Checkout did not return a link — no charge was made.');
  return { ok: true, data: { url } };
}

/** Map a server plan label ('yearly', 'monthly', a price id, or display text) to the store's PRO label. */
export function mapServerPlanToLabel(planLabel?: string | null): string {
  const raw = (planLabel ?? '').trim();
  if (!raw) return 'PRO';
  const low = raw.toLowerCase();
  if (/annual|year|yr/.test(low)) return 'Annual $49.99/yr';
  if (/month/.test(low)) return 'Monthly $9.99/mo';
  return raw; // unknown but human-readable — show verbatim
}

/* ═══════════════════ Success-page entitlement polling ════════════════ */

export interface PollEntitlementOptions extends RequestOptions {
  /** delay between attempts (default 1500ms) */
  intervalMs?: number;
  /** overall budget (default 20000ms) */
  timeoutMs?: number;
  /** injectable for tests */
  sleep?: (ms: number) => Promise<void>;
}

export interface PollEntitlementOutcome {
  activated: boolean;
  /** last successful read (may be isPro:false) */
  entitlement: EntitlementStatus | null;
  /** last error (null if the last attempt succeeded) */
  error: BillingError | null;
}

/**
 * /billing/success: poll entitlement-status until the Stripe webhook flips
 * is_pro, or the budget runs out. Unauthenticated bails immediately; other
 * errors keep polling (the webhook may simply be slow).
 */
export async function pollEntitlementUntilPro(token: string, opts: PollEntitlementOptions = {}): Promise<PollEntitlementOutcome> {
  const intervalMs = Math.max(1, opts.intervalMs ?? 1500);
  const timeoutMs = Math.max(intervalMs, opts.timeoutMs ?? 20000);
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxAttempts = Math.max(1, Math.ceil(timeoutMs / intervalMs));

  let entitlement: EntitlementStatus | null = null;
  let error: BillingError | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetchEntitlement(token, opts);
    if (res.ok) {
      entitlement = res.data;
      error = null;
      if (res.data.isPro) return { activated: true, entitlement, error: null };
    } else {
      error = res.error;
      if (res.error.kind === 'unauthenticated') return { activated: false, entitlement, error };
    }
    if (attempt < maxAttempts - 1) await sleep(intervalMs);
  }
  return { activated: false, entitlement, error };
}

/* ═══════════════════════════ Support tickets ═════════════════════════ */

export type SupportCategory = 'billing' | 'refund' | 'technical' | 'content' | 'other';

export interface SupportTicketInput {
  category: SupportCategory;
  message: string;
  email?: string | null;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  category: string;
  message: string;
  email: string | null;
  status: string;
  created_at: string;
}

export interface SupportOptions extends RequestOptions {
  supabaseUrl?: string;
  apiKey?: string;
}

function restBase(opts?: SupportOptions): string {
  return (opts?.supabaseUrl ?? SUPABASE_URL).replace(/\/+$/, '');
}

function restHeaders(token: string, apiKey?: string, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: apiKey ?? SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
    ...extra,
  };
}

/** Insert one row into support_tickets (RLS scopes it to the owner). */
export async function submitSupportTicket(
  input: SupportTicketInput,
  auth: { token: string; userId: string },
  opts: SupportOptions = {},
): Promise<BillingResult<SupportTicket>> {
  const res = await request<SupportTicket[] | SupportTicket>(
    `${restBase(opts)}/rest/v1/support_tickets`,
    {
      method: 'POST',
      headers: restHeaders(auth.token, opts?.apiKey, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
      body: JSON.stringify({
        user_id: auth.userId,
        category: input.category,
        message: input.message,
        email: input.email ?? null,
        status: 'new',
      }),
    },
    opts.fetchImpl,
  );
  if (!res.ok) return res;
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!row || typeof row !== 'object') return fail('server', 'Your message was sent, but the reply was unreadable.');
  return { ok: true, data: row };
}

/** Read the signed-in user's own tickets, newest first. */
export async function listMyTickets(
  auth: { token: string; userId: string },
  opts: SupportOptions = {},
): Promise<BillingResult<SupportTicket[]>> {
  const qs = new URLSearchParams({
    select: 'id,user_id,category,message,email,status,created_at',
    user_id: `eq.${auth.userId}`,
    order: 'created_at.desc',
    limit: '20',
  });
  const res = await request<SupportTicket[]>(
    `${restBase(opts)}/rest/v1/support_tickets?${qs.toString()}`,
    { method: 'GET', headers: restHeaders(auth.token, opts?.apiKey) },
    opts.fetchImpl,
  );
  if (!res.ok) return res;
  return { ok: true, data: Array.isArray(res.data) ? res.data : [] };
}
