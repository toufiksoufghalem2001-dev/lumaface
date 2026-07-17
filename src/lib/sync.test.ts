// @vitest-environment jsdom
/**
 * Sync engine tests — merge logic, outbox retry, consent gating, import/merge
 * orchestration, per-entity consent (photos/coach), server delete. The
 * supabase-js boundary (@/lib/supabase) and the config module are mocked, so
 * no network ever happens.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

/* ── hoisted fake backend state ── */
const h = vi.hoisted(() => {
  interface Call {
    table: string;
    op: 'upsert' | 'delete' | 'select';
    payload?: unknown;
    match?: Record<string, unknown>;
    col?: string;
    val?: unknown;
  }
  const calls: Call[] = [];
  const rows: Record<string, Record<string, unknown>[]> = {};
  const failUpsertTables = new Set<string>();
  const state = { selectFails: false };
  function reset() {
    calls.length = 0;
    for (const k of Object.keys(rows)) delete rows[k];
    failUpsertTables.clear();
    state.selectFails = false;
  }
  return { calls, rows, failUpsertTables, state, reset };
});

vi.mock('@/lib/config', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'pk-test',
  FUNCTIONS_BASE: 'https://test.supabase.co/functions/v1/',
  BACKEND_ENABLED: true,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    from(table: string) {
      return {
        async select() {
          h.calls.push({ table, op: 'select' });
          if (h.state.selectFails) return { data: null, error: { message: 'connection down' } };
          return { data: h.rows[table] ?? [], error: null };
        },
        async upsert(payload: unknown) {
          h.calls.push({ table, op: 'upsert', payload });
          if (h.failUpsertTables.has(table)) {
            h.failUpsertTables.delete(table);
            return { data: null, error: { message: 'boom' } };
          }
          const list = h.rows[table] ?? (h.rows[table] = []);
          for (const item of Array.isArray(payload) ? payload : [payload]) {
            const row = item as Record<string, unknown>;
            const key = 'id' in row ? 'id' : 'user_id';
            const i = list.findIndex((x) => x[key] === row[key]);
            if (i === -1) list.push(row);
            else list[i] = { ...list[i], ...row };
          }
          return { data: null, error: null };
        },
        delete() {
          return {
            async match(m: Record<string, unknown>) {
              h.calls.push({ table, op: 'delete', match: m });
              return { error: null };
            },
            async eq(col: string, val: unknown) {
              h.calls.push({ table, op: 'delete', col, val });
              h.rows[table] = [];
              return { error: null };
            },
          };
        },
      };
    },
  }),
  getSession: vi.fn(async () => null),
  getSessionToken: vi.fn(async () => null),
  sendMagicLink: vi.fn(async () => null),
  signOutBackend: vi.fn(async () => {}),
  onAuthStateChange: vi.fn(() => () => {}),
}));

import {
  __resetSyncForTests,
  OUTBOX_KEY,
  captureMetaId,
  checkInId,
  deleteServerData,
  flushOutbox,
  getSyncStatus,
  initialSync,
  mergeSingleton,
  pushCaptureMeta,
  pushCheckIn,
  pushCoachThread,
  pushConsents,
  pushPlan,
  pushProfile,
  pushSessionLog,
  registerSyncApplier,
  removeCaptureMeta,
  sessionLogId,
  setSyncUser,
  stableUuid,
  syncNow,
  threadRowId,
  unionById,
  type SyncedSnapshot,
} from '@/lib/sync';
import { DEFAULT_PROFILE, type Capture, type CoachThread, type ComfortEntry } from '@/lib/store';
import type { Plan } from '@/lib/plan';

const USER = '11111111-1111-4111-8111-111111111111';

const PLAN: Plan = {
  planId: 'plan_test',
  ruleVersion: '2026.07.1',
  goals: ['glow'],
  createdAt: '2026-07-01T08:00:00.000Z',
  days: [],
  warnings: [],
  nextCheckInDay: 7,
};

const ENTRY: ComfortEntry = { date: '2026-07-10T09:00:00.000Z', activityId: 'neutral-jaw-rest', comfortLevel: 1, irritationFlag: false, seconds: 45 };

function consentOn(extra: Record<string, boolean> = {}) {
  localStorage.setItem('lf_consents', JSON.stringify({ cameraCoach: false, photoSave: false, analytics: false, coachChat: false, sync: true, ...extra }));
}

function outbox(): { id: string; table: string }[] {
  return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as { id: string; table: string }[];
}

function upsertCalls(table?: string) {
  return h.calls.filter((c) => c.op === 'upsert' && (!table || c.table === table));
}

beforeEach(() => {
  localStorage.clear();
  h.reset();
  __resetSyncForTests();
  setSyncUser(USER);
});

/* ═══════════ pure merge logic ═══════════ */

describe('mergeSingleton (last-write-wins)', () => {
  it('handles nulls and picks the newer timestamp', () => {
    expect(mergeSingleton<string>(null, null)).toEqual({ winner: 'none', data: null });
    expect(mergeSingleton({ data: 'L', updatedAt: '2026-01-01T00:00:00Z' }, null)).toEqual({ winner: 'local', data: 'L' });
    expect(mergeSingleton(null, { data: 'R', updatedAt: '2026-01-01T00:00:00Z' })).toEqual({ winner: 'remote', data: 'R' });
    expect(
      mergeSingleton({ data: 'L', updatedAt: '2026-01-01T00:00:00Z' }, { data: 'R', updatedAt: '2026-02-01T00:00:00Z' }).winner,
    ).toBe('remote');
    expect(
      mergeSingleton({ data: 'L', updatedAt: '2026-03-01T00:00:00Z' }, { data: 'R', updatedAt: '2026-02-01T00:00:00Z' }).winner,
    ).toBe('local');
    /* tie → local (no churn) */
    expect(
      mergeSingleton({ data: 'L', updatedAt: '2026-02-01T00:00:00Z' }, { data: 'R', updatedAt: '2026-02-01T00:00:00Z' }).winner,
    ).toBe('local');
    /* missing local timestamp = oldest → remote wins */
    expect(mergeSingleton({ data: 'L', updatedAt: null }, { data: 'R', updatedAt: '2026-02-01T00:00:00Z' }).winner).toBe('remote');
  });
});

describe('unionById (append-only)', () => {
  const a = { id: 'a', date: '2026-01-02T00:00:00Z' };
  const b = { id: 'b', date: '2026-01-01T00:00:00Z' };
  const c = { id: 'c', date: '2026-01-03T00:00:00Z' };
  it('unions, dedupes and sorts by date', () => {
    const merged = unionById([a, b], [b, c], (x) => x.id);
    expect(merged.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('stableUuid', () => {
  it('is deterministic and uuid-shaped', () => {
    expect(stableUuid('seed')).toBe(stableUuid('seed'));
    expect(stableUuid('seed')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(stableUuid('a')).not.toBe(stableUuid('b'));
  });
});

/* ═══════════ consent gating ═══════════ */

describe('consent gating', () => {
  it('queues but never uploads while sync=false; flushes once enabled', async () => {
    pushProfile(DEFAULT_PROFILE);
    await flushOutbox();
    expect(upsertCalls()).toHaveLength(0); // zero server writes without consent
    expect(outbox()).toHaveLength(1); // but queued for later

    consentOn();
    await flushOutbox();
    expect(upsertCalls('profiles')).toHaveLength(1);
    expect(outbox()).toHaveLength(0);
  });

  it('syncNow refuses to run without sync consent', async () => {
    const res = await syncNow();
    expect(res).toMatchObject({ ok: false, reason: 'sync-consent-off' });
    expect(h.calls.filter((c) => c.op !== 'select')).toHaveLength(0);
    expect(upsertCalls()).toHaveLength(0);
    expect(h.calls).toHaveLength(0); // not even reads
  });

  it('capture_meta requires photoSave AND sync; never carries photo bytes', async () => {
    const cap: Capture = {
      captureId: 'cap_1',
      localOnly: true,
      dataUrl: 'data:image/jpeg;base64,SECRETPIXELS',
      qualityMetrics: { lighting: 0.8, blur: 0.1, pose: 0.9 },
      consentVersion: '2026.07.1',
      createdAt: '2026-07-10T10:00:00.000Z',
    };
    consentOn(); // sync on, photoSave off
    pushCaptureMeta(cap);
    await flushOutbox();
    expect(upsertCalls('capture_meta')).toHaveLength(0);
    expect(outbox()).toHaveLength(0);

    consentOn({ photoSave: true });
    pushCaptureMeta(cap);
    await flushOutbox();
    expect(upsertCalls('capture_meta')).toHaveLength(1);
    const payload = JSON.stringify(upsertCalls('capture_meta')[0].payload);
    expect(payload).not.toContain('SECRETPIXELS');
    expect(payload).not.toContain('data:image');

    removeCaptureMeta('cap_1');
    await flushOutbox();
    const del = h.calls.find((c) => c.op === 'delete' && c.table === 'capture_meta');
    expect(del?.match).toEqual({ id: captureMetaId('cap_1') });
  });

  it('coach threads require coachChat consent and use a derived uuid', async () => {
    const thread: CoachThread = {
      id: 'coach_2026-07-10_abc123',
      createdAt: '2026-07-10T09:00:00.000Z',
      messages: [{ id: 'm1', role: 'user', text: 'hi', createdAt: '2026-07-10T09:01:00.000Z' }],
    };
    consentOn(); // coachChat off
    pushCoachThread(thread);
    await flushOutbox();
    expect(upsertCalls('coach_threads')).toHaveLength(0);

    consentOn({ coachChat: true });
    pushCoachThread(thread);
    await flushOutbox();
    expect(upsertCalls('coach_threads')).toHaveLength(1);
    const row = upsertCalls('coach_threads')[0].payload as Record<string, unknown>;
    expect(row.id).toBe(threadRowId(thread.id));
    expect(row.id).not.toBe(thread.id); // local string id never leaks as PK
  });
});

/* ═══════════ outbox ═══════════ */

describe('offline outbox', () => {
  it('keeps failed ops and retries them successfully', async () => {
    consentOn();
    h.failUpsertTables.add('plans');
    pushPlan(PLAN);
    await flushOutbox();
    expect(upsertCalls('plans')).toHaveLength(1);
    expect(outbox()).toHaveLength(1); // still queued after failure

    await flushOutbox(); // now succeeds
    expect(upsertCalls('plans')).toHaveLength(2);
    expect(outbox()).toHaveLength(0);
    expect(h.rows.plans).toHaveLength(1);
  });

  it('drops ops queued under a different account', async () => {
    consentOn();
    pushProfile(DEFAULT_PROFILE);
    expect(outbox()).toHaveLength(1);
    setSyncUser('22222222-2222-4222-8222-222222222222');
    await flushOutbox();
    expect(upsertCalls('profiles')).toHaveLength(0);
    expect(outbox()).toHaveLength(0);
  });

  it('coalesces repeated upserts of the same entity', () => {
    consentOn();
    pushProfile({ ...DEFAULT_PROFILE, name: 'A' });
    pushProfile({ ...DEFAULT_PROFILE, name: 'B' });
    expect(outbox()).toHaveLength(1);
  });

  it('incremental pushes upsert rows on flush (session log + consents)', async () => {
    consentOn();
    pushSessionLog(ENTRY);
    pushConsents({ cameraCoach: false, photoSave: false, analytics: false, coachChat: false, sync: true });
    await flushOutbox();
    expect(upsertCalls('consents')).toHaveLength(1);
    expect(upsertCalls('session_logs')).toHaveLength(1);
    const row = upsertCalls('session_logs')[0].payload as Record<string, unknown>;
    expect(row).toMatchObject({ id: sessionLogId(ENTRY), user_id: USER, activity_id: ENTRY.activityId, logged_date: '2026-07-10' });
  });
});

/* ═══════════ initial sync: import & merge ═══════════ */

describe('initialSync', () => {
  it('imports local data into an empty account (with consent), once', async () => {
    consentOn();
    localStorage.setItem('lf_profile', JSON.stringify({ ...DEFAULT_PROFILE, name: 'Luma' }));
    localStorage.setItem('lf_plan', JSON.stringify(PLAN));
    localStorage.setItem('lf_progress', JSON.stringify({ comfortLog: [ENTRY] }));

    const res = await initialSync(USER);
    expect(res).toMatchObject({ ok: true, pushed: true });
    expect(h.rows.profiles).toHaveLength(1);
    expect(h.rows.profiles[0]).toMatchObject({ id: USER, display_name: 'Luma' });
    expect(h.rows.plans).toHaveLength(1);
    expect(h.rows.session_logs).toHaveLength(1);
    expect(h.rows.session_logs[0].id).toBe(sessionLogId(ENTRY));

    const again = await initialSync(USER);
    expect(again.reason).toBe('already-synced');
    expect(upsertCalls('profiles')).toHaveLength(1); // no second push
  });

  it('does NOT import when sync consent is off', async () => {
    localStorage.setItem('lf_profile', JSON.stringify(DEFAULT_PROFILE));
    const res = await initialSync(USER);
    expect(res.ok).toBe(true);
    expect(upsertCalls()).toHaveLength(0); // reads only
  });

  it('merges: newer remote profile wins and is applied locally', async () => {
    consentOn();
    localStorage.setItem('lf_profile', JSON.stringify({ ...DEFAULT_PROFILE, name: 'Local' }));
    h.rows.profiles = [
      {
        id: USER,
        display_name: 'Remote',
        goals: ['calm'],
        routine_time: 10,
        budget_mode: 'standard',
        adult_confirmed: true,
        climate: 'humid',
        outdoor_time: 'lots',
        hide_comparison: false,
        updated_at: '2999-01-01T00:00:00.000Z',
      },
    ];
    const patches: SyncedSnapshot[] = [];
    registerSyncApplier((p) => patches.push(p));

    const res = await initialSync(USER);
    expect(res).toMatchObject({ ok: true, applied: true });
    expect(patches).toHaveLength(1);
    expect(patches[0].profile).toMatchObject({ name: 'Remote', goals: ['calm'], routineTime: 10, climate: 'humid' });
  });

  it('unions remote session logs into the local comfort log without dupes', async () => {
    consentOn();
    localStorage.setItem('lf_progress', JSON.stringify({ comfortLog: [ENTRY] }));
    const remoteOnly: ComfortEntry = { date: '2026-07-11T09:00:00.000Z', activityId: 'brow-glide', comfortLevel: 2, irritationFlag: false, seconds: 30 };
    h.rows.session_logs = [
      { id: sessionLogId(ENTRY), user_id: USER, activity_id: ENTRY.activityId, comfort_level: 1, seconds: 45, logged_date: '2026-07-10', created_at: ENTRY.date },
      { id: sessionLogId(remoteOnly), user_id: USER, activity_id: 'brow-glide', comfort_level: 2, seconds: 30, logged_date: '2026-07-11', created_at: remoteOnly.date },
    ];
    const patches: SyncedSnapshot[] = [];
    registerSyncApplier((p) => patches.push(p));

    await initialSync(USER);
    expect(patches).toHaveLength(1);
    expect(patches[0].comfortLog?.map((e) => e.activityId)).toEqual(['neutral-jaw-rest', 'brow-glide']);
    expect(upsertCalls('session_logs')).toHaveLength(0); // nothing local-only to push
  });

  it('returns offline when every pull fails (and can retry later)', async () => {
    consentOn();
    h.state.selectFails = true;
    const res = await initialSync(USER);
    expect(res).toMatchObject({ ok: false, reason: 'offline' });
    h.state.selectFails = false;
    const retry = await initialSync(USER);
    expect(retry.ok).toBe(true); // not marked done → retries
  });
});

/* ═══════════ syncNow ═══════════ */

describe('syncNow', () => {
  it('pushes local winners, pulls, and stamps lastSyncedAt', async () => {
    consentOn();
    localStorage.setItem('lf_profile', JSON.stringify({ ...DEFAULT_PROFILE, name: 'Now' }));
    pushCheckIn({ date: '2026-07-14T20:00:00.000Z', day: 7, comfortRating: 2, irritationFlag: false, adherenceSelfReport: 'most', planDiff: { added: [], kept: [], paused: [] } });
    const res = await syncNow();
    expect(res.ok).toBe(true);
    expect(h.rows.profiles).toHaveLength(1);
    expect(h.rows.check_ins).toHaveLength(1);
    expect(h.rows.check_ins[0].id).toBe(checkInId({ date: '2026-07-14T20:00:00.000Z', day: 7 }));
    expect(getSyncStatus().lastSyncedAt).not.toBeNull();
  });
});

/* ═══════════ server delete ═══════════ */

describe('deleteServerData', () => {
  it('deletes every user table for the current user (not consent-gated)', async () => {
    // no consentOn() — deletion is a data right, not a sync write
    const res = await deleteServerData();
    expect(res.skipped).toBe(false);
    expect(res.failed).toHaveLength(0);
    expect(res.deleted).toHaveLength(9);
    const deletes = h.calls.filter((c) => c.op === 'delete');
    expect(deletes).toHaveLength(9);
    for (const d of deletes) {
      expect(d.val).toBe(USER);
      expect(d.col === 'user_id' || (d.table === 'profiles' && d.col === 'id')).toBe(true);
    }
  });
});
