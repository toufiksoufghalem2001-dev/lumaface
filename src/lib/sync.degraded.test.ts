// @vitest-environment jsdom
/**
 * Graceful degradation — with BACKEND_ENABLED=false every sync/auth surface
 * must be a safe no-op (M1 behavior: fully local, no client, no throws).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ getSupabase: vi.fn(() => null) }));

vi.mock('@/lib/config', () => ({
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  FUNCTIONS_BASE: '',
  BACKEND_ENABLED: false,
}));

vi.mock('@/lib/supabase', () => ({
  getSupabase: h.getSupabase,
  getSession: vi.fn(async () => null),
  getSessionToken: vi.fn(async () => null),
  sendMagicLink: vi.fn(async () => 'Accounts are unavailable in this build — LumaFace works fully offline.'),
  signOutBackend: vi.fn(async () => {}),
  onAuthStateChange: vi.fn(() => () => {}),
}));

import {
  __resetSyncForTests,
  OUTBOX_KEY,
  deleteServerData,
  flushOutbox,
  getSyncStatus,
  initialSync,
  pushPlan,
  pushProfile,
  setSyncUser,
  startSyncEngine,
  syncNow,
} from '@/lib/sync';
import { DEFAULT_PROFILE } from '@/lib/store';
import type { Plan } from '@/lib/plan';
import { getSessionToken, getSupabase, sendMagicLink } from '@/lib/supabase';

const PLAN: Plan = {
  planId: 'p',
  ruleVersion: '2026.07.1',
  goals: [],
  createdAt: '2026-07-01T08:00:00.000Z',
  days: [],
  warnings: [],
  nextCheckInDay: 7,
};

beforeEach(() => {
  localStorage.clear();
  __resetSyncForTests();
  h.getSupabase.mockClear();
});

describe('graceful degradation (BACKEND_ENABLED=false)', () => {
  it('status reports the backend as disabled', () => {
    expect(getSyncStatus().backendEnabled).toBe(false);
  });

  it('push helpers do not queue or touch the client', async () => {
    setSyncUser('user-1');
    localStorage.setItem('lf_consents', JSON.stringify({ sync: true }));
    pushProfile(DEFAULT_PROFILE);
    pushPlan(PLAN);
    await flushOutbox();
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(h.getSupabase).not.toHaveBeenCalled();
  });

  it('initialSync / syncNow / deleteServerData degrade to honest no-ops', async () => {
    setSyncUser('user-1');
    expect(await initialSync('user-1')).toMatchObject({ ok: false, reason: 'backend-disabled' });
    expect(await syncNow()).toMatchObject({ ok: false, reason: 'backend-disabled' });
    expect((await deleteServerData()).skipped).toBe(true);
    expect(h.getSupabase).not.toHaveBeenCalled();
  });

  it('startSyncEngine installs nothing', () => {
    startSyncEngine(); // must not throw
    expect(getSyncStatus().pendingCount).toBe(0);
  });

  it('supabase helpers degrade: null client, null token, honest error string', async () => {
    expect(getSupabase()).toBeNull();
    expect(await getSessionToken()).toBeNull();
    expect(await sendMagicLink('a@b.c')).toMatch(/unavailable/i);
  });
});
