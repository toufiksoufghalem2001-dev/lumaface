/**
 * LumaFace M4 — AI Coach gateway client.
 *
 * Calls the `coach-chat` Edge Function when the user is signed in AND has
 * explicitly granted the coachChat consent (message content leaves the
 * device only then). Every outcome is typed and honest:
 *
 *   ok             → a real coach answer (validated §8.5 shape server-side)
 *   unconfigured   → no AI provider key set yet — caller keeps the local preview
 *   no-consent     → server refused: consent off (client should not retry)
 *   rate_limited   → daily question budget reached server-side
 *   unauthenticated→ session missing/expired
 *   unavailable    → model/edge hiccup — caller falls back, never invents
 *   offline        → network failure
 *
 * The function NEVER fabricates an answer: fallback to the local preview
 * engine is the caller's job, and the UI keeps its honest labels either way.
 */

import { FUNCTIONS_BASE, SUPABASE_PUBLISHABLE_KEY } from '@/lib/config';
import { getSessionToken } from '@/lib/supabase';
import type { CoachAnswer } from '@/lib/store';

export type CoachGatewayStatus =
  | 'ok'
  | 'unconfigured'
  | 'no-consent'
  | 'rate_limited'
  | 'unauthenticated'
  | 'unavailable'
  | 'offline';

export type CoachGatewayResult = { status: Exclude<CoachGatewayStatus, 'ok'> } | { status: 'ok'; answer: CoachAnswer };

export interface GatewayOptions {
  /** test seam — mirrors billing.ts */
  fetchImpl?: typeof fetch;
  /** test seam — skip the supabase session lookup */
  token?: string;
}

function isCoachAnswer(value: unknown): value is CoachAnswer {
  const a = value as CoachAnswer | null;
  return (
    !!a &&
    typeof a === 'object' &&
    typeof a.summary === 'string' &&
    ['education', 'routine_adjustment', 'motivation', 'safety_redirect'].includes(a.intent) &&
    Array.isArray(a.recommended_actions) &&
    Array.isArray(a.warnings) &&
    ['high', 'medium', 'low'].includes(a.confidence) &&
    Array.isArray(a.source_ids) &&
    typeof a.requires_professional_review === 'boolean'
  );
}

export async function askCoachGateway(question: string, opts: GatewayOptions = {}): Promise<CoachGatewayResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const token = opts.token ?? (await getSessionToken());
  if (!token) return { status: 'unauthenticated' };

  let res: Response;
  try {
    res = await fetchImpl(`${FUNCTIONS_BASE}coach-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ question }),
    });
  } catch {
    return { status: 'offline' };
  }

  if (res.status === 401 || res.status === 403) return { status: 'unauthenticated' };
  if (res.status === 429) return { status: 'rate_limited' };
  if (!res.ok) return { status: 'unavailable' };

  let payload: { status?: unknown; answer?: unknown };
  try {
    payload = (await res.json()) as { status?: unknown; answer?: unknown };
  } catch {
    return { status: 'unavailable' };
  }

  if (payload.status === 'ok') {
    return isCoachAnswer(payload.answer) ? { status: 'ok', answer: payload.answer } : { status: 'unavailable' };
  }
  if (
    payload.status === 'unconfigured' ||
    payload.status === 'no-consent' ||
    payload.status === 'rate_limited' ||
    payload.status === 'unauthenticated' ||
    payload.status === 'unavailable'
  ) {
    return { status: payload.status };
  }
  return { status: 'unavailable' };
}
