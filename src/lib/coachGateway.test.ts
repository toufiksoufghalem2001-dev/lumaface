// @vitest-environment jsdom
/**
 * coachGateway unit tests — mocked fetch, no network. The gateway must map
 * every server outcome to an honest typed status; it must NEVER fabricate an
 * answer (invalid payloads → 'unavailable', never a guess).
 */

import { describe, it, expect } from 'vitest';
import { askCoachGateway } from '@/lib/coachGateway';
import type { CoachAnswer } from '@/lib/store';

const TOKEN = 'test-token';

function mockFetch(handler: (input: unknown, init?: RequestInit) => Promise<Response>) {
  return handler as unknown as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const VALID_ANSWER: CoachAnswer = {
  intent: 'education',
  summary: 'Daily broad-spectrum SPF is the highest-evidence habit we have.',
  recommended_actions: [{ activity_id: 'daily-sunscreen', reason: 'Tier-A habit' }],
  warnings: [],
  confidence: 'high',
  source_ids: ['AAD'],
  requires_professional_review: false,
};

describe('askCoachGateway', () => {
  it('returns a validated answer on ok', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { status: 'ok', answer: VALID_ANSWER }));
    const res = await askCoachGateway('is sunscreen worth it?', { fetchImpl, token: TOKEN });
    expect(res.status).toBe('ok');
    if (res.status === 'ok') expect(res.answer.summary).toContain('SPF');
  });

  it('sends the question with auth headers to the coach-chat function', async () => {
    let seen: { url: string; auth: string | null; body: string } | null = null;
    const fetchImpl = mockFetch(async (input, init) => {
      seen = {
        url: String(input),
        auth: (init?.headers as Record<string, string>)?.Authorization ?? null,
        body: String(init?.body),
      };
      return jsonResponse(200, { status: 'ok', answer: VALID_ANSWER });
    });
    await askCoachGateway('how often should I massage?', { fetchImpl, token: TOKEN });
    expect(seen!.url).toContain('coach-chat');
    expect(seen!.auth).toBe(`Bearer ${TOKEN}`);
    expect(seen!.body).toBe(JSON.stringify({ question: 'how often should I massage?' }));
  });

  it('maps unconfigured honestly (caller keeps the local preview)', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { status: 'unconfigured' }));
    const res = await askCoachGateway('q', { fetchImpl, token: TOKEN });
    expect(res.status).toBe('unconfigured');
  });

  it('maps no-consent and rate_limited', async () => {
    const noConsent = mockFetch(async () => jsonResponse(200, { status: 'no-consent' }));
    expect((await askCoachGateway('q', { fetchImpl: noConsent, token: TOKEN })).status).toBe('no-consent');
    const limited = mockFetch(async () => jsonResponse(200, { status: 'rate_limited' }));
    expect((await askCoachGateway('q', { fetchImpl: limited, token: TOKEN })).status).toBe('rate_limited');
  });

  it('maps 401/403 to unauthenticated and 429 to rate_limited', async () => {
    for (const status of [401, 403]) {
      const fetchImpl = mockFetch(async () => jsonResponse(status, { message: 'Invalid JWT' }));
      expect((await askCoachGateway('q', { fetchImpl, token: TOKEN })).status).toBe('unauthenticated');
    }
    const tooMany = mockFetch(async () => jsonResponse(429, {}));
    expect((await askCoachGateway('q', { fetchImpl: tooMany, token: TOKEN })).status).toBe('rate_limited');
  });

  it('maps a thrown fetch to offline', async () => {
    const fetchImpl = mockFetch(async () => {
      throw new TypeError('fetch failed');
    });
    expect((await askCoachGateway('q', { fetchImpl, token: TOKEN })).status).toBe('offline');
  });

  it('never fabricates: malformed ok payloads become unavailable', async () => {
    const bad1 = mockFetch(async () => jsonResponse(200, { status: 'ok', answer: { summary: 42 } }));
    expect((await askCoachGateway('q', { fetchImpl: bad1, token: TOKEN })).status).toBe('unavailable');
    const bad2 = mockFetch(async () => jsonResponse(200, { status: 'ok' }));
    expect((await askCoachGateway('q', { fetchImpl: bad2, token: TOKEN })).status).toBe('unavailable');
    const bad3 = mockFetch(async () => jsonResponse(200, { status: 'mystery' }));
    expect((await askCoachGateway('q', { fetchImpl: bad3, token: TOKEN })).status).toBe('unavailable');
    const bad4 = mockFetch(async () => new Response('not json', { status: 200 }));
    expect((await askCoachGateway('q', { fetchImpl: bad4, token: TOKEN })).status).toBe('unavailable');
  });

  it('maps 5xx to unavailable', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(500, { error: 'boom' }));
    expect((await askCoachGateway('q', { fetchImpl, token: TOKEN })).status).toBe('unavailable');
  });

  it('returns unauthenticated without a token (no session)', async () => {
    const fetchImpl = mockFetch(async () => jsonResponse(200, { status: 'ok', answer: VALID_ANSWER }));
    const res = await askCoachGateway('q', { fetchImpl, token: '' });
    expect(res.status).toBe('unauthenticated');
  });
});
