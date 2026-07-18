// @vitest-environment jsdom
/**
 * M2 sync-engine tests — consent gating, outbox semantics, merge logic,
 * deterministic row ids, deleteServerData. No network: the Supabase client
 * is replaced by a mock builder that records every call.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  OUTBOX_KEY,
  checkInId,
  deleteServerData,
  flushOutbox,
  getSyncStatus,
  initialSync,
  mergeSingleton,
  pushCheckIn,
  pushCoachThread,
  pushConsents,
  pushCaptureMeta,
  pushInventory,
  pushPlan,
  pushProfile,
  pushSafety,
  pushSessionLog,
  registerSyncApplier,
  removeCaptureMeta,
  sessionLogId,
  setSyncUser,
  stableUuid,
  startSyncEngine,
  syncNow,
  threadRowId,
  unionById,
  type SyncedSnapshot,
} from '@/lib/sync';
import { __setSupabaseForTests, type MockCall } from './mockSupabase';
import type { Capture, CheckInRecord, CoachThread, ComfortEntry, Consents, SafetyRecord } from '@/lib/store';
import type { Plan, UserProfile } from '@/lib/plan';
import type { Inventory } from '@/lib/rules';

const USER = 'user-123';

/* ── tiny builders ── */
const profile: UserProfile = {
  name: 'Mina',
  goals: ['glow'],
  routineTime: 5,
  budgetMode: 'affordable',
  adultConfirmed: true,
  climate: 'temperate',
  outdoorTime: 'indoors',
};
const safety: SafetyRecord = {
  answers: { eyeSymptoms: true } as SafetyRecord['answers'],
  contraindicationCodes: ['SAFE-EYE-01'],
  ruleVersion: '2026.07.1',
  reviewStatus: 'complete',
};
const inventory: Inventory = { products: ['cleanser'], reactsToNew: 'sometimes-reacts' };
const plan = { planId: 'p1', ruleVersion: '2026.07.1', days: [] } as unknown as Plan;
const consents: Consents = { cameraCoach: false, photoSave: false, analytics: false, coachChat: false, sync: true };
const comfortEntry: ComfortEntry = {
  date: '2026-07-14T08:00:00.000Z',
  activityId: 'neutral-jaw-rest',
  comfortLevel: 1,
  irritationFlag: false,
  seconds: 45,
};
const checkIn: CheckInRecord = {
  date: '2026-07-14T09:00:00.000Z',
  day: 7,
  comfortRating: 2,
  irritationFlag: false,
  adherenceSelfReport: 'most',
  planDiff: { added: [], kept: ['daily-sunscreen'], paused: [] },
};
const thread: CoachThread = {
  id: 'coach_2026-07-14_abc123',
  createdAt: '2026-07-14T10:00:00.000Z',
  messages: [
    { id: 'm1', role: 'user', text: 'hi coach', createdAt: '2026-07-14T10:00:00.000Z' },
    { id: 'm2', role: 'coach', text: 'hello!', createdAt: '2026-07-14T10:00:05.000Z' },
  ],
};
const capture: Capture = {
  captureId: 'cap_abc123',
  localOnly: true,
  dataUrl: 'data:image/jpeg;base64,SECRET',
  qualityMetrics: { lighting: 0.6, blur: 0.2, pose: 0.9 },
  consentVersion: '2026.07.1',
  createdAt: '2026-07-14T11:00:00.000Z',
};

function consentOn(extra: Partial<Consents> = {}) {
  localStorage.setItem('lf_consents', JSON.stringify({ ...consents, ...extra }));
}

beforeEach(() => {
  localStorage.clear();
  __setSupabaseForTests(null);
  setSyncUser(null);
  registerSyncApplier(null);
});

describe('consent gating', () => {
  it('writes nothing when sync consent is off, even signed in', async () => {
    const h = __setSupabaseForTests();
    setSyncUser(USER);
    pushProfile(profile);
    pushSafety(safety);
    pushPlan(plan);
    await flushOutbox();
    expect(h.calls).toHaveLength(0);
    expect(loadOutboxLen()).toBe(0);
  });

  it('writes nothing when signed out, even with consent on', async () => {
    const h = __setSupabaseForTests();
    consentOn();
    pushProfile(profile);
    await flushOutbox();
    expect(h.calls).toHaveLength(0);
    expect(loadOutboxLen()).toBe(0);
  });

  it('writes when consent + user are both present; capture meta needs photoSave', async () => {
    const h = __setSupabaseForTests();
    consentOn(); // photoSave off
    setSyncUser(USER);
    pushCaptureMeta(capture); // dropped: no photoSave consent
    pushProfile(profile); // allowed
    await flushOutbox();
    expect(h.calls.map((c) => c.table)).toEqual(['profiles']);
    consentOn({ photoSave: true });
    pushCaptureMeta(capture);
    await flushOutbox();
    const metaCalls = h.calls.filter((c) => c.table === 'capture_meta');
    expect(metaCalls).toHaveLength(1);
    const payload = metaCalls[0].payload as Record<string, unknown>;
    expect(payload.dataUrl).toBeUndefined(); // metadata only, never photo bytes
    expect(payload.lighting).toBe(0.6);
  });

  it('coach threads need coachChat consent', async () => {
    const h = __setSupabaseForTests();
    consentOn();
    setSyncUser(USER);
    pushCoachThread(thread);
    await flushOutbox();
    expect(h.calls).toHaveLength(0);
    consentOn({ coachChat: true });
    pushCoachThread(thread);
    await flushOutbox();
    expect(h.calls.map((c) => c.table)).toContain('coach_threads');
  });
});

describe('outbox semantics', () => {
  it('coalesces repeated upserts, keeps newest payload', async () => {
    __setSupabaseForTests();
    consentOn();
    setSyncUser(USER);
    pushProfile(profile);
    pushProfile({ ...profile, name: 'Nora' });
    await flushOutbox();
    const calls = __setSupabaseForTests.callsOf('profiles');
    expect(calls).toHaveLength(1);
    expect((calls[0].payload as Record<string, unknown>).display_name).toBe('Nora');
  });

  it('keeps failed items queued for retry (error then success)', async () => {
    const h = __setSupabaseForTests({ failTables: ['plans'] });
    consentOn();
    setSyncUser(USER);
    pushPlan(plan);
    await flushOutbox();
    expect(loadOutboxLen()).toBe(1); // still queued
    h.failTables = [];
    await flushOutbox();
    expect(loadOutboxLen()).toBe(0);
    expect(h.calls.filter((c) => c.table === 'plans')).toHaveLength(2);
  });
});

describe('deterministic ids', () => {
  it('stableUuid is deterministic + uuid-shaped', () => {
    const a = stableUuid('session|x|2026-07-14');
    expect(a).toBe(stableUuid('session|x|2026-07-14'));
    expect(a).not.toBe(stableUuid('session|x|2026-07-15'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('sessionLogId keys on activity+day (re-logging same day replaces)', () => {
    expect(sessionLogId(comfortEntry)).toBe(sessionLogId({ ...comfortEntry, seconds: 999 }));
    expect(sessionLogId(comfortEntry)).not.toBe(sessionLogId({ ...comfortEntry, activityId: 'other' }));
  });

  it('checkInId keys on day+date; threadRowId resolves local ids', () => {
    expect(checkInId(checkIn)).toBe(checkInId({ ...checkIn, comfortRating: 1 }));
    expect(threadRowId('coach_2026-07-14_abc123')).toBe(threadRowId('coach_2026-07-14_abc123'));
  });
});

describe('merge logic', () => {
  it('mergeSingleton: LWW with remote winning on newer updated_at, ties stay local', () => {
    const local = { data: 'L', updatedAt: '2026-07-14T10:00:00Z' };
    const remote = { data: 'R', updatedAt: '2026-07-14T11:00:00Z' };
    expect(mergeSingleton(local, remote).winner).toBe('remote');
    expect(mergeSingleton(local, { ...remote, updatedAt: '2026-07-14T10:00:00Z' }).winner).toBe('local');
    expect(mergeSingleton(local, null).winner).toBe('local');
    expect(mergeSingleton(null, remote).winner).toBe('remote');
    expect(mergeSingleton<string>(null, null).winner).toBe('none');
  });

  it('unionById: append-only union, newest local wins same id, sorted by date', () => {
    const l = [
      { id: 'a', date: '2026-07-10', v: 'local-a' },
      { id: 'b', date: '2026-07-12', v: 'local-b' },
    ];
    const r = [
      { id: 'b', date: '2026-07-12', v: 'remote-b' },
      { id: 'c', date: '2026-07-11', v: 'remote-c' },
    ];
    const merged = unionById(l, r, (x) => x.id);
    expect(merged.map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(merged.find((x) => x.id === 'b')?.v).toBe('local-b');
  });
});

describe('initialSync', () => {
  it('signed-in + consent: imports local data into an empty account, then marks done', async () => {
    const h = __setSupabaseForTests();
    consentOn({ photoSave: true, coachChat: true });
    setSyncUser(USER);
    localStorage.setItem('lf_profile', JSON.stringify(profile));
    localStorage.setItem('lf_safety', JSON.stringify(safety));
    localStorage.setItem('lf_inventory', JSON.stringify(inventory));
    localStorage.setItem('lf_plan', JSON.stringify(plan));
    localStorage.setItem('lf_consents', JSON.stringify(consents));
    localStorage.setItem('lf_checkins', JSON.stringify([checkIn]));
    localStorage.setItem('lf_progress', JSON.stringify({ comfortLog: [comfortEntry] }));
    localStorage.setItem('lf_coach_threads', JSON.stringify([thread]));
    const res = await initialSync(USER);
    expect(res.ok).toBe(true);
    const tables = new Set(h.calls.map((c) => c.table));
    for (const t of ['profiles', 'safety_answers', 'inventories', 'plans', 'check_ins', 'session_logs', 'coach_threads']) {
      expect(tables).toContain(t);
    }
    // second call is a no-op (already done for this user)
    h.calls.length = 0;
    await initialSync(USER);
    expect(h.calls).toHaveLength(0);
  });

  it('remote wins a newer singleton; applies to the store via applier', async () => {
    const h = __setSupabaseForTests();
    consentOn();
    setSyncUser(USER);
    const applySpy: SyncedSnapshot[] = [];
    registerSyncApplier((p) => applySpy.push(p));
    localStorage.setItem('lf_profile', JSON.stringify(profile));
    touchProfileMeta('2026-07-10T00:00:00Z');
    h.rows.profiles = [
      {
        id: USER,
        display_name: 'Remote Name',
        goals: ['calm'],
        routine_time: 10,
        budget_mode: 'affordable',
        adult_confirmed: true,
        climate: 'dry',
        outdoor_time: 'mixed',
        updated_at: '2026-07-15T00:00:00Z',
      },
    ];
    await initialSync(USER);
    expect(applySpy.length).toBeGreaterThan(0);
    expect(applySpy[0].profile?.name).toBe('Remote Name');
    expect(applySpy[0].profile?.routineTime).toBe(10);
  });

  it('append-only comfort log unions local + remote entries', async () => {
    const h = __setSupabaseForTests();
    consentOn();
    setSyncUser(USER);
    const applySpy: SyncedSnapshot[] = [];
    registerSyncApplier((p) => applySpy.push(p));
    localStorage.setItem('lf_progress', JSON.stringify({ comfortLog: [comfortEntry] }));
    const remoteEntry = {
      id: sessionLogId({ activityId: 'other-act', date: '2026-07-15T08:00:00Z' }),
      user_id: USER,
      activity_id: 'other-act',
      comfort_level: 2,
      seconds: 60,
      logged_date: '2026-07-15',
      created_at: '2026-07-15T08:00:00Z',
    };
    h.rows.session_logs = [remoteEntry];
    await initialSync(USER);
    const comfort = applySpy[0]?.comfortLog ?? [];
    expect(comfort.map((e) => e.activityId).sort()).toEqual(['neutral-jaw-rest', 'other-act']);
  });

  it('coach threads merge at message level — two devices keep both sides', async () => {
    consentOn({ coachChat: true });
    const localThread: CoachThread = {
      id: 'coach_2026-07-10_abc123',
      createdAt: '2026-07-10T09:00:00.000Z',
      messages: [{ id: 'm_local', role: 'user', text: 'local question', createdAt: '2026-07-10T09:01:00.000Z' }],
    };
    localStorage.setItem('lf_coach_threads', JSON.stringify([localThread]));
    __setSupabaseForTests();
    setSyncUser(USER);
    const h = mockHarness();
    h.rows.coach_threads = [
      {
        id: threadRowId(localThread.id),
        user_id: USER,
        messages: [{ id: 'm_remote', role: 'user', text: 'remote question', createdAt: '2026-07-10T09:02:00.000Z' }],
        created_at: '2026-07-10T09:00:00.000Z',
        updated_at: '2026-07-10T09:02:00.000Z',
      },
    ];
    const patches: SyncedSnapshot[] = [];
    registerSyncApplier((p) => patches.push(p));

    await initialSync(USER);
    expect(patches).toHaveLength(1);
    const merged = patches[0].coachThreads?.find((t) => t.id === localThread.id);
    expect(merged?.messages.map((m) => m.id)).toEqual(['m_local', 'm_remote']); // union, sorted by createdAt
    // remote was missing the local message → merged thread is pushed back up
    const pushes = h.calls.filter((c) => c.op === 'upsert' && c.table === 'coach_threads');
    expect(pushes).toHaveLength(1);
    const pushedRow = (Array.isArray(pushes[0].payload) ? pushes[0].payload[0] : pushes[0].payload) as {
      messages: { id: string }[];
    };
    expect(pushedRow.messages.map((m) => m.id)).toEqual(['m_local', 'm_remote']);
  });

  it('returns offline when every pull fails (and can retry later)', async () => {
    __setSupabaseForTests({ failTables: ['profiles', 'safety_answers', 'inventories', 'plans', 'check_ins', 'session_logs', 'coach_threads', 'consents', 'capture_meta'] });
    consentOn();
    setSyncUser(USER);
    const res = await initialSync(USER);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('offline');
  });
});

describe('syncNow + status', () => {
  it('syncNow flushes the outbox and stamps lastSyncedAt', async () => {
    __setSupabaseForTests();
    consentOn();
    setSyncUser(USER);
    pushInventory(inventory);
    const res = await syncNow();
    expect(res.ok).toBe(true);
    expect(getSyncStatus().lastSyncedAt).toBeTruthy();
    expect(getSyncStatus().pending).toBe(0);
  });

  it('reports reason when consent is off', async () => {
    __setSupabaseForTests();
    setSyncUser(USER);
    const res = await syncNow();
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('sync-consent-off');
  });
});

describe('deleteServerData', () => {
  it('deletes every user table incl. coach_usage; reports failures honestly', async () => {
    const h = __setSupabaseForTests({ failTables: ['plans'] });
    setSyncUser(USER);
    const res = await deleteServerData();
    expect(res.skipped).toBe(false);
    expect(res.failed).toContain('plans');
    expect(res.deleted).toHaveLength(10); // 9 sync tables + coach_usage
    const deletes = h.calls.filter((c) => c.op === 'delete');
    expect(deletes).toHaveLength(10);
    for (const d of deletes) expect((d.match as Record<string, unknown>).user_id ?? (d.match as Record<string, unknown>).id).toBeTruthy();
  });

  it('skips when signed out', async () => {
    const h = __setSupabaseForTests();
    const res = await deleteServerData();
    expect(res.skipped).toBe(true);
    expect(h.calls).toHaveLength(0);
  });
});

describe('capture meta removal', () => {
  it('removeCaptureMeta deletes the server row when allowed', async () => {
    const h = __setSupabaseForTests();
    consentOn({ photoSave: true });
    setSyncUser(USER);
    removeCaptureMeta(capture.captureId);
    await flushOutbox();
    const del = h.calls.find((c) => c.table === 'capture_meta' && c.op === 'delete');
    expect(del).toBeTruthy();
    expect((del!.match as Record<string, unknown>).id).toBe(stableUuid(`capture|${capture.captureId}`));
  });
});

/* ── local helpers ── */

function loadOutboxLen(): number {
  try {
    return (JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as unknown[]).length;
  } catch {
    return 0;
  }
}

function touchProfileMeta(ts: string) {
  localStorage.setItem('lf_sync_meta', JSON.stringify({ entities: { profiles: ts }, threads: {}, initialSyncDoneFor: {}, lastSyncedAt: null }));
}

function mockHarness() {
  return __setSupabaseForTests.harness;
}

// re-export for TS (helpers use the same import names)
export type { MockCall };
