/**
 * billing.ts unit tests — mocked fetch, no network. Covers the typed-error
 * contract (unauthenticated / misconfigured / network / server), entitlement
 * mapping, plan-label mapping, success-page polling (incl. timeout), the
 * auth bridge, and support-ticket REST.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  authFromApp,
  fetchEntitlement,
  listMyTickets,
  mapServerPlanToLabel,
  pollEntitlementUntilPro,
  startCheckout,
  submitSupportTicket,
} from '@/lib/billing';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.fn(handler) as unknown as typeof fetch;
}

const TOKEN = 'jwt-test-token';
const noop = async () => {};

/* ═══════════════════════ startCheckout ═══════════════════════════════ */

describe('startCheckout', () => {
  it('POSTs priceKey with the JWT and returns the checkout url', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay_123' }));
    const res = await startCheckout('yearly', TOKEN, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.url).toBe('https://checkout.stripe.com/c/pay_123');

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/functions/v1/create-checkout-session');
    expect(JSON.parse(String(call[1]?.body))).toEqual({ priceKey: 'yearly' });
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers.apikey).toBeTruthy();
  });

  it('maps the edge 500 "Server misconfigured" to kind misconfigured', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(500, { error: 'Server misconfigured: STRIPE_SECRET_KEY is not set' }));
    const res = await startCheckout('monthly', TOKEN, { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe('misconfigured');
      expect(res.error.status).toBe(500);
    }
  });

  it('maps 401/403 to unauthenticated', async () => {
    for (const status of [401, 403]) {
      const fetchImpl = mockFetch(async () => jsonResponse(status, { message: 'Invalid JWT' }));
      const res = await startCheckout('monthly', TOKEN, { fetchImpl });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.kind).toBe('unauthenticated');
    }
  });

  it('maps a thrown fetch to network', async () => {
    const fetchImpl = mockFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const res = await startCheckout('yearly', TOKEN, { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('network');
  });

  it('a 2xx without a url is a server error, never a fake success', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { ok: true }));
    const res = await startCheckout('yearly', TOKEN, { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('server');
  });

  it('no token → unauthenticated without any request', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { url: 'x' }));
    const res = await startCheckout('yearly', null, { fetchImpl });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.kind).toBe('unauthenticated');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════ fetchEntitlement ════════════════════════════ */

describe('fetchEntitlement', () => {
  it('maps snake_case server fields to camelCase', async () => {
    const fetchImpl = mockFetch(async (url) => {
      expect(String(url)).toContain('/functions/v1/entitlement-status');
      return jsonResponse(200, { is_pro: true, plan_label: 'yearly', current_period_end: '2026-08-01T00:00:00Z' });
    });
    const res = await fetchEntitlement(TOKEN, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.isPro).toBe(true);
      expect(res.data.planLabel).toBe('yearly');
      expect(res.data.currentPeriodEnd).toBe('2026-08-01T00:00:00Z');
    }
  });

  it('treats missing/absent fields as not-pro with nulls', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, {}));
    const res = await fetchEntitlement(TOKEN, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.isPro).toBe(false);
      expect(res.data.planLabel).toBeNull();
      expect(res.data.currentPeriodEnd).toBeNull();
    }
  });
});

/* ═══════════════════════ mapServerPlanToLabel ════════════════════════ */

describe('mapServerPlanToLabel', () => {
  it('maps plan keys and display text to the store PRO labels', () => {
    expect(mapServerPlanToLabel('yearly')).toBe('Annual $49.99/yr');
    expect(mapServerPlanToLabel('annual')).toBe('Annual $49.99/yr');
    expect(mapServerPlanToLabel('Annual plan')).toBe('Annual $49.99/yr');
    expect(mapServerPlanToLabel('monthly')).toBe('Monthly $9.99/mo');
    expect(mapServerPlanToLabel('Monthly $9.99/mo')).toBe('Monthly $9.99/mo');
    expect(mapServerPlanToLabel(null)).toBe('PRO');
    expect(mapServerPlanToLabel(undefined)).toBe('PRO');
    expect(mapServerPlanToLabel('  ')).toBe('PRO');
    // unknown but human-readable passes through verbatim
    expect(mapServerPlanToLabel('Founding member')).toBe('Founding member');
  });
});

/* ═══════════════════ pollEntitlementUntilPro ═════════════════════════ */

describe('pollEntitlementUntilPro', () => {
  it('activates as soon as a poll returns is_pro', async () => {
    let n = 0;
    const fetchImpl = mockFetch(async () => jsonResponse(200, { is_pro: ++n >= 3, plan_label: 'yearly' }));
    const res = await pollEntitlementUntilPro(TOKEN, { fetchImpl, sleep: noop, intervalMs: 10, timeoutMs: 1000 });
    expect(res.activated).toBe(true);
    expect(res.entitlement?.isPro).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('times out honestly: never is_pro → activated false after the budget', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { is_pro: false }));
    const res = await pollEntitlementUntilPro(TOKEN, { fetchImpl, sleep: noop, intervalMs: 10, timeoutMs: 45 });
    expect(res.activated).toBe(false);
    expect(res.entitlement?.isPro).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(5); // ceil(45/10)
  });

  it('bails immediately on unauthenticated', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(401, { message: 'bad jwt' }));
    const res = await pollEntitlementUntilPro(TOKEN, { fetchImpl, sleep: noop, intervalMs: 10, timeoutMs: 1000 });
    expect(res.activated).toBe(false);
    expect(res.error?.kind).toBe('unauthenticated');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('keeps polling through transient errors until the budget runs out', async () => {
    let n = 0;
    const fetchImpl = mockFetch(async () => {
      n += 1;
      return n === 1 ? jsonResponse(500, { error: 'boom' }) : jsonResponse(200, { is_pro: true });
    });
    const res = await pollEntitlementUntilPro(TOKEN, { fetchImpl, sleep: noop, intervalMs: 10, timeoutMs: 1000 });
    expect(res.activated).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

/* ═══════════════════════ authFromApp (parallel contract) ═════════════ */

describe('authFromApp', () => {
  it('missing auth slice → signed out', () => {
    const snap = authFromApp({ pro: { active: false } });
    expect(snap.signedIn).toBe(false);
    expect(snap.token).toBeNull();
    expect(snap.status).toBe('signed-out');
  });

  it('reads the documented contract shape', () => {
    const snap = authFromApp({ auth: { status: 'signed-in', userId: 'u_1', email: 'a@b.c', token: 'tok' } });
    expect(snap).toEqual({ status: 'signed-in', signedIn: true, userId: 'u_1', email: 'a@b.c', token: 'tok' });
  });

  it('finds the token under common alternative field names', () => {
    expect(authFromApp({ auth: { status: 'signed-in', accessToken: 'tok2' } }).token).toBe('tok2');
    expect(authFromApp({ auth: { status: 'signed-in', session: { access_token: 'tok3' } } }).token).toBe('tok3');
  });

  it('explicit signed-out wins even if a stale token lingers', () => {
    const snap = authFromApp({ auth: { status: 'signed_out', token: 'stale' } });
    expect(snap.signedIn).toBe(false);
  });

  it('accepts "authenticated" as a signed-in alias', () => {
    expect(authFromApp({ auth: { status: 'authenticated', token: 'tok' } }).signedIn).toBe(true);
  });
});

/* ═══════════════════════ support tickets REST ════════════════════════ */

describe('support tickets', () => {
  const AUTH = { token: TOKEN, userId: 'user_123' };
  const ROW = {
    id: 't_1',
    user_id: 'user_123',
    category: 'refund',
    message: 'Charged twice',
    email: 'a@b.c',
    status: 'new',
    created_at: '2026-07-18T10:00:00Z',
  };

  it('submitSupportTicket inserts with apikey + JWT and parses the row', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(201, [ROW]));
    const res = await submitSupportTicket({ category: 'refund', message: 'Charged twice', email: 'a@b.c' }, AUTH, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.id).toBe('t_1');

    const call = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(call[0])).toContain('/rest/v1/support_tickets');
    const headers = call[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers.apikey).toBeTruthy();
    expect(headers.Prefer).toBe('return=representation');
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      user_id: 'user_123',
      category: 'refund',
      message: 'Charged twice',
      email: 'a@b.c',
      status: 'new',
    });
  });

  it('listMyTickets queries own rows newest-first', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, [ROW]));
    const res = await listMyTickets(AUTH, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toHaveLength(1);

    const url = String((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain('user_id=eq.user_123');
    expect(url).toContain('order=created_at.desc');
  });

  it('a non-array success payload still yields a usable ticket', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(201, ROW));
    const res = await submitSupportTicket({ category: 'billing', message: 'Hi' }, AUTH, { fetchImpl });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.category).toBe('refund');
  });
});
