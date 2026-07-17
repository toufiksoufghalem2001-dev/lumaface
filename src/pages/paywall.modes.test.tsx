// @vitest-environment jsdom
/**
 * M2 billing three-mode runtime tests (engineer B) — Paywall live / soon /
 * demo modes, restore-purchase mapping, BillingSuccess poll + timeout, and
 * the Support page (signed-in ticket flow + signed-out mailto note).
 * Fetch is stubbed; auth arrives via the `authOverride` test seam (the
 * store's auth slice lands with the parallel auth engineer).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, configure } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from '@/lib/store';
import Paywall from '@/pages/Paywall';
import BillingSuccess from '@/pages/BillingSuccess';
import Support from '@/pages/Support';
import type { AuthSnapshot } from '@/lib/billing';

/* jsdom polyfills for framer-motion (same as other runtime tests) */
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const SIGNED_IN: AuthSnapshot = { status: 'signed-in', signedIn: true, userId: 'u_1', email: 'ada@example.com', token: 'jwt-test' };
const SIGNED_OUT: AuthSnapshot = { status: 'signed-out', signedIn: false, userId: null, email: null, token: null };

/* Parallel full-suite runs can starve timers — give async finds headroom. */
configure({ asyncUtilTimeout: 5000 });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function renderPage(el: React.ReactElement) {
  return render(
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MemoryRouter>{el}</MemoryRouter>
      </AppProvider>
    </MotionConfig>,
  );
}

function proStored(): { active: boolean; planLabel: string | null } | null {
  return JSON.parse(localStorage.getItem('lf_pro') ?? 'null') as { active: boolean; planLabel: string | null } | null;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/* ═══════════════════════ Mode A — live Stripe checkout ═══════════════ */

describe('Paywall — live mode (signed in + backend configured)', () => {
  it('purchase POSTs create-checkout-session and redirects to Stripe — no fake charge', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay_test_1' }));
    vi.stubGlobal('fetch', fetchMock);
    const redirect = vi.fn();

    renderPage(<Paywall authOverride={SIGNED_IN} checkoutRedirect={redirect} />);
    // live mode is honestly labeled (no "Demo build" line)
    expect(await screen.findByText(/Secure checkout by Stripe/)).toBeTruthy();
    expect(screen.queryByText('Demo build — no real charge is made.')).toBeNull();

    fireEvent.click(screen.getByText('Start 7-day free trial'));
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay_test_1'));

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/functions/v1/create-checkout-session');
    expect(JSON.parse(String(init.body))).toEqual({ priceKey: 'yearly' });
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt-test');
    // redirect only — PRO is granted by the server via /billing/success, never locally
    expect(proStored()?.active ?? false).toBe(false);
  });

  it('selecting Monthly sends priceKey monthly', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay_test_2' }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<Paywall authOverride={SIGNED_IN} checkoutRedirect={vi.fn()} />);
    fireEvent.click(await screen.findByRole('radio', { name: /^Monthly/ }));
    fireEvent.click(screen.getByText('Subscribe for $9.99/month'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ priceKey: 'monthly' });
  });
});

/* ══════════════════ Mode B — Stripe unconfigured (honest) ════════════ */

describe('Paywall — payments opening soon (edge 500 "Server misconfigured")', () => {
  it('shows the honest opening-soon state; no redirect, no charge', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(500, { error: 'Server misconfigured: STRIPE_SECRET_KEY is not set' }));
    vi.stubGlobal('fetch', fetchMock);
    const redirect = vi.fn();

    renderPage(<Paywall authOverride={SIGNED_IN} checkoutRedirect={redirect} />);
    fireEvent.click(await screen.findByText('Start 7-day free trial'));

    expect((await screen.findAllByText('Payments open soon')).length).toBeGreaterThan(0);
    expect(screen.getByText(/finishing our secure checkout setup/)).toBeTruthy();
    expect(screen.getByText('Payments open soon — nothing is charged today.')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
    expect(proStored()?.active ?? false).toBe(false);
  });
});

/* ══════════════════ Mode C — signed out (M1 demo path) ═══════════════ */

describe('Paywall — demo mode (signed out)', () => {
  it('keeps the M1 simulated purchase + demo label + gentle sign-in note', async () => {
    renderPage(<Paywall authOverride={SIGNED_OUT} />);
    expect(await screen.findByText('Demo build — no real charge is made.')).toBeTruthy();
    expect(screen.getByText(/Sign in from Profile/)).toBeTruthy();

    fireEvent.click(screen.getByText('Start 7-day free trial'));
    expect(await screen.findByText('Preparing your trial…')).toBeTruthy();
    expect(await screen.findByText(/Welcome to/, {}, { timeout: 4000 })).toBeTruthy();
    // lf_pro persists via the store's passive effect — poll until it flushes
    await waitFor(() => expect(proStored()).toEqual({ active: true, planLabel: 'Annual $49.99/yr' }));
  }, 10000);
});

/* ═══════════════════════ Restore purchase ════════════════════════════ */

describe('Paywall — restore purchase', () => {
  it('signed in + is_pro → setPro(mapped label) + restored state', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { is_pro: true, plan_label: 'yearly', current_period_end: '2026-08-01T00:00:00Z' }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<Paywall authOverride={SIGNED_IN} />);
    fireEvent.click(await screen.findByText('Restore purchase'));

    expect(await screen.findByText('Your subscription is restored — everything is open again.')).toBeTruthy();
    await waitFor(() => expect(proStored()).toEqual({ active: true, planLabel: 'Annual $49.99/yr' }));
    const [url] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/functions/v1/entitlement-status');
  });

  it('signed in + not pro → honest "no active subscription found"', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { is_pro: false }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<Paywall authOverride={SIGNED_IN} />);
    fireEvent.click(await screen.findByText('Restore purchase'));

    expect(await screen.findByText('No active subscription found for this account.')).toBeTruthy();
    expect(proStored()?.active ?? false).toBe(false);
  });
});

/* ═══════════════════════ BillingSuccess ══════════════════════════════ */

describe('BillingSuccess', () => {
  it('polls until is_pro → setPro + trial line', async () => {
    let n = 0;
    const fetchMock = vi.fn(async () => jsonResponse(200, { is_pro: ++n >= 2, plan_label: 'yearly' }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<BillingSuccess authOverride={SIGNED_IN} pollConfig={{ intervalMs: 5, timeoutMs: 1000 }} />);
    expect(await screen.findByText(/Welcome to/)).toBeTruthy();
    expect(screen.getByText(/7-day trial is active/)).toBeTruthy();
    await waitFor(() => expect(proStored()).toEqual({ active: true, planLabel: 'Annual $49.99/yr' }));
    expect(fetchMock.mock.calls.length).toBe(2);
  });

  it('budget exhausted → honest "payment received, activation pending"', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { is_pro: false }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<BillingSuccess authOverride={SIGNED_IN} pollConfig={{ intervalMs: 5, timeoutMs: 25 }} />);
    expect(await screen.findByText(/Payment received — activation pending/)).toBeTruthy();
    expect(screen.getByText('Open the paywall')).toBeTruthy();
    expect(proStored()?.active ?? false).toBe(false);
  });

  it('signed out → sign-in prompt, no polling', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { is_pro: true }));
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<BillingSuccess authOverride={SIGNED_OUT} />);
    expect(await screen.findByText(/One more step — sign in/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/* ═══════════════════════ Support ═════════════════════════════════════ */

describe('Support', () => {
  it('signed out → policy + form render with the mailto note', async () => {
    renderPage(<Support authOverride={SIGNED_OUT} />);
    expect(await screen.findByText('The 48-hour refund promise.')).toBeTruthy();
    expect(screen.getByText(/not signed in — tapping send opens your email app/)).toBeTruthy();
    expect(screen.getByLabelText('Tell us what happened')).toBeTruthy();
    expect(screen.getByText(/care@lumaface\.app/)).toBeTruthy();
  });

  it('signed in → loads own tickets and a new ticket appears after send', async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return jsonResponse(200, [
          { id: 't_old', user_id: 'u_1', category: 'billing', message: 'Earlier question about my trial', email: null, status: 'new', created_at: '2026-07-18T10:00:00Z' },
        ]);
      }
      return jsonResponse(201, [
        { id: 't_new', user_id: 'u_1', category: 'refund', message: 'Double charge on my card', email: 'ada@example.com', status: 'new', created_at: '2026-07-18T11:00:00Z' },
      ]);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage(<Support authOverride={SIGNED_IN} />);
    // own rows load (REST, user-scoped)
    expect(await screen.findByText('Earlier question about my trial')).toBeTruthy();

    // refund category + message + send
    fireEvent.click(screen.getByText('Refund'));
    fireEvent.change(screen.getByLabelText('Tell us what happened'), { target: { value: 'Double charge on my card' } });
    fireEvent.click(screen.getByText('Send to support'));

    expect(await screen.findByText(/a person replies within 2 days\./)).toBeTruthy();
    expect((await screen.findAllByText('Double charge on my card')).length).toBeGreaterThan(0);
    const postCall = fetchMock.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'POST');
    expect(postCall).toBeTruthy();
    expect(String((postCall as unknown[])[0])).toContain('/rest/v1/support_tickets');
  });
});
