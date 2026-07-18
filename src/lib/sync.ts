/**
 * LumaFace M2 — consent-gated sync engine.
 *
 * Hard rules (architecture contract):
 *  - Graceful degradation: with BACKEND_ENABLED=false, no session, or no
 *    network, every public function is a safe no-op. The app behaves as M1.
 *  - Consent gate: `consents.sync` (default false) gates ALL server writes.
 *    Pulling the user's own rows is a read and is allowed once signed in;
 *    nothing is ever uploaded until the user explicitly opts in.
 *  - Photos NEVER sync. Only `capture_meta` (timestamp + quality flags) may
 *    sync, and only when consents.photoSave AND consents.sync are both true.
 *  - Coach threads sync only when consents.coachChat AND consents.sync.
 *
 * Conflict model: per-entity last-write-wins using updated_at (singleton
 * tables, coach threads) and union-by-deterministic-id for append-only
 * tables (session_logs, check_ins, capture_meta). Deterministic ids make
 * pushes idempotent and round-trips duplicate-free.
 */

import { BACKEND_ENABLED } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import type { Plan, UserProfile } from '@/lib/plan';
import { EMPTY_SAFETY_ANSWERS, type Inventory } from '@/lib/rules';
import type { Capture, CheckInRecord, CoachThread, ComfortEntry, Consents, SafetyRecord } from '@/lib/store';

/* ═══════════════════════ Keys & types ═════════════════════════════════ */

export const OUTBOX_KEY = 'lf_outbox';
export const SYNC_META_KEY = 'lf_sync_meta';

/** localStorage keys owned by the store (mirrored here so sync stays store-runtime-free). */
const LS = {
  profile: 'lf_profile',
  safety: 'lf_safety',
  inventory: 'lf_inventory',
  plan: 'lf_plan',
  progress: 'lf_progress',
  checkins: 'lf_checkins',
  consents: 'lf_consents',
  coachThreads: 'lf_coach_threads',
  photos: 'lf_photos',
} as const;

export type SyncEntity =
  | 'profiles'
  | 'safety_answers'
  | 'inventories'
  | 'plans'
  | 'consents'
  | 'coach_threads'
  | 'session_logs'
  | 'check_ins'
  | 'capture_meta';

/** Every table the signed-in user may delete their own rows from (RLS DELETE policies). */
const USER_TABLES: SyncEntity[] = [
  'capture_meta',
  'session_logs',
  'check_ins',
  'coach_threads',
  'consents',
  'plans',
  'inventories',
  'safety_answers',
  'profiles',
];

export interface OutboxOp {
  /** coalescing key `${table}:${key}` — re-queuing the same key replaces the op */
  id: string;
  userId: string;
  table: SyncEntity;
  op: 'upsert' | 'delete';
  row?: Record<string, unknown>;
  match?: Record<string, unknown>;
  queuedAt: string;
}

interface SyncMeta {
  /** singleton entity → ISO time of last local change */
  entities: Partial<Record<SyncEntity, string>>;
  /** local coach-thread id → ISO time of last local change */
  threads: Record<string, string>;
  /** userId → ISO time initialSync completed (once per account per device) */
  initialSyncDoneFor: Record<string, string>;
  lastSyncedAt: string | null;
}

const EMPTY_META: SyncMeta = { entities: {}, threads: {}, initialSyncDoneFor: {}, lastSyncedAt: null };

/** Remote-won data applied into the app store. */
export interface SyncedSnapshot {
  profile?: UserProfile;
  safety?: SafetyRecord;
  inventory?: Inventory;
  plan?: Plan;
  consents?: Consents;
  coachThreads?: CoachThread[];
  comfortLog?: ComfortEntry[];
  checkIns?: CheckInRecord[];
}

export interface SyncStatus {
  backendEnabled: boolean;
  signedIn: boolean;
  syncConsent: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  syncing: boolean;
}

export interface SyncResult {
  ok: boolean;
  reason?: string;
  applied?: boolean;
  pushed?: boolean;
}

export interface DeleteServerResult {
  skipped: boolean;
  deleted: string[];
  failed: string[];
}

const DEFAULT_CONSENTS: Consents = { cameraCoach: false, photoSave: false, analytics: false, coachChat: false, sync: false };

/* ═══════════════════════ Storage helpers ══════════════════════════════ */

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[LumaFace] sync could not persist ${key}`, e);
  }
}

function loadMeta(): SyncMeta {
  const raw = loadJson<Partial<SyncMeta>>(SYNC_META_KEY, {});
  return { ...EMPTY_META, ...raw, entities: { ...raw.entities }, threads: { ...raw.threads }, initialSyncDoneFor: { ...raw.initialSyncDoneFor } };
}

function saveMeta(meta: SyncMeta): void {
  saveJson(SYNC_META_KEY, meta);
}

function loadOutbox(): OutboxOp[] {
  return loadJson<OutboxOp[]>(OUTBOX_KEY, []);
}

function saveOutbox(ops: OutboxOp[]): void {
  saveJson(OUTBOX_KEY, ops);
}

/** Read the current consents from localStorage (source of truth, always fresh). */
export function readSyncConsent(): boolean {
  return loadJson<Consents>(LS.consents, DEFAULT_CONSENTS).sync === true;
}

function readConsents(): Consents {
  return { ...DEFAULT_CONSENTS, ...loadJson<Partial<Consents>>(LS.consents, {}) };
}

/* ═══════════════════════ Deterministic ids ════════════════════════════ */

function fnv1a(seed: number, str: string): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic UUID-shaped id derived from a seed string (idempotent upserts). */
export function stableUuid(seed: string): string {
  const hex = [0x811c9dc5, 0x811c9dc5 ^ 0x9e3779b9, 0x811c9dc5 ^ 0x3c6ef372, 0x811c9dc5 ^ 0xdaa66d2b]
    .map((s) => fnv1a(s, seed).toString(16).padStart(8, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function sessionLogId(e: Pick<ComfortEntry, 'date' | 'activityId' | 'seconds' | 'comfortLevel'>): string {
  return stableUuid(`session_log:${e.date}|${e.activityId}|${e.seconds}|${e.comfortLevel}`);
}

export function checkInId(r: Pick<CheckInRecord, 'date' | 'day'>): string {
  return stableUuid(`check_in:${r.date}|${r.day}`);
}

export function threadRowId(localThreadId: string): string {
  return stableUuid(`coach_thread:${localThreadId}`);
}

export function captureMetaId(captureId: string): string {
  return stableUuid(`capture_meta:${captureId}`);
}

/* ═══════════════════════ Row mappers (local → remote) ═════════════════ */

type Row = Record<string, unknown>;

export function profileToRow(userId: string, p: UserProfile, updatedAt: string): Row {
  return {
    id: userId,
    display_name: p.name ?? null,
    goals: p.goals ?? [],
    routine_time: p.routineTime ?? null,
    budget_mode: p.budgetMode ?? null,
    climate: p.climate ?? null,
    outdoor_time: p.outdoorTime ?? null,
    adult_confirmed: p.adultConfirmed ?? false,
    hide_comparison: (p as { hideComparison?: boolean }).hideComparison ?? false,
    updated_at: updatedAt,
  };
}

/**
 * Safety record → row. The `answers` jsonb wraps the raw answers together
 * with reviewStatus + ruleVersion so a skipped screening round-trips
 * losslessly (the distinction drives the conservative-plan path).
 */
export function safetyToRow(userId: string, s: SafetyRecord, updatedAt: string): Row {
  return {
    user_id: userId,
    answers: { v: 1, answers: s.answers, reviewStatus: s.reviewStatus, ruleVersion: s.ruleVersion },
    contraindication_codes: s.contraindicationCodes ?? [],
    updated_at: updatedAt,
  };
}

export function inventoryToRow(userId: string, inv: Inventory, updatedAt: string): Row {
  return { user_id: userId, products: inv.products ?? [], reacts_to_new: inv.reactsToNew ?? null, updated_at: updatedAt };
}

export function planToRow(userId: string, plan: Plan, updatedAt: string): Row {
  return {
    user_id: userId,
    plan_id: plan.planId,
    rule_version: plan.ruleVersion,
    goals: plan.goals ?? [],
    days: plan.days,
    warnings: plan.warnings ?? [],
    next_checkin_day: plan.nextCheckInDay,
    created_at: plan.createdAt,
    updated_at: updatedAt,
  };
}

export function consentsToRow(userId: string, c: Consents, updatedAt: string): Row {
  return { user_id: userId, values: c, updated_at: updatedAt };
}

export function threadToRow(userId: string, t: CoachThread, updatedAt: string): Row {
  return { id: threadRowId(t.id), user_id: userId, messages: t.messages, created_at: t.createdAt, updated_at: updatedAt };
}

export function sessionLogToRow(userId: string, e: ComfortEntry): Row {
  return {
    id: sessionLogId(e),
    user_id: userId,
    activity_id: e.activityId,
    comfort_level: e.comfortLevel,
    seconds: e.seconds,
    logged_date: e.date.slice(0, 10),
    created_at: e.date,
  };
}

export function checkInToRow(userId: string, r: CheckInRecord): Row {
  return {
    id: checkInId(r),
    user_id: userId,
    day: r.day,
    comfort_rating: r.comfortRating,
    irritation_flag: r.irritationFlag,
    adherence: r.adherenceSelfReport,
    plan_diff: r.planDiff,
    created_at: r.date,
  };
}

/** Metadata only — the photo itself (dataUrl) NEVER leaves the device. */
export function captureMetaToRow(userId: string, c: Capture): Row {
  return { id: captureMetaId(c.captureId), user_id: userId, captured_at: c.createdAt, quality: c.qualityMetrics };
}

/* ═══════════════════════ Row mappers (remote → local) ═════════════════ */

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

export function rowToProfile(row: Row): UserProfile {
  const out: UserProfile = {
    goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
    routineTime: (row.routine_time as 3 | 5 | 10) ?? 5,
    budgetMode: (row.budget_mode as UserProfile['budgetMode']) ?? 'affordable',
    adultConfirmed: row.adult_confirmed === true,
    climate: (row.climate as UserProfile['climate']) ?? 'temperate',
    outdoorTime: (row.outdoor_time as UserProfile['outdoorTime']) ?? 'indoors',
  };
  const name = str(row.display_name);
  if (name) out.name = name;
  if (row.hide_comparison === true) (out as { hideComparison?: boolean }).hideComparison = true;
  return out;
}

export function rowToSafety(row: Row): SafetyRecord {
  const wrapped = (row.answers ?? {}) as { answers?: SafetyRecord['answers']; reviewStatus?: SafetyRecord['reviewStatus']; ruleVersion?: string };
  const isWrapped = wrapped && typeof wrapped === 'object' && 'answers' in wrapped;
  return {
    answers: (isWrapped ? wrapped.answers : (row.answers as SafetyRecord['answers'])) ?? { ...EMPTY_SAFETY_ANSWERS },
    contraindicationCodes: Array.isArray(row.contraindication_codes) ? (row.contraindication_codes as string[]) : [],
    ruleVersion: (isWrapped && wrapped.ruleVersion) || '2026.07.1',
    reviewStatus: (isWrapped && wrapped.reviewStatus) || 'complete',
  };
}

export function rowToInventory(row: Row): Inventory {
  return {
    products: Array.isArray(row.products) ? (row.products as string[]) : [],
    reactsToNew: (row.reacts_to_new as Inventory['reactsToNew']) ?? null,
  };
}

export function rowToPlan(row: Row): Plan {
  return {
    planId: str(row.plan_id) ?? 'remote',
    ruleVersion: str(row.rule_version) ?? '2026.07.1',
    goals: Array.isArray(row.goals) ? (row.goals as string[]) : [],
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    days: (row.days as Plan['days']) ?? [],
    warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
    nextCheckInDay: (row.next_checkin_day as number) ?? 7,
  };
}

export function rowToConsents(row: Row): Consents {
  return { ...DEFAULT_CONSENTS, ...((row.values ?? {}) as Partial<Consents>) };
}

export function rowToThread(row: Row): CoachThread {
  return {
    id: str(row.id) ?? stableUuid(JSON.stringify(row)),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    messages: (row.messages as CoachThread['messages']) ?? [],
  };
}

export function rowToComfortEntry(row: Row): ComfortEntry {
  const level = (row.comfort_level as 1 | 2 | 3) ?? 1;
  return {
    date: str(row.created_at) ?? new Date().toISOString(),
    activityId: str(row.activity_id) ?? 'unknown',
    comfortLevel: level,
    irritationFlag: level === 3,
    seconds: (row.seconds as number) ?? 0,
  };
}

export function rowToCheckIn(row: Row): CheckInRecord {
  return {
    date: str(row.created_at) ?? new Date().toISOString(),
    day: (row.day as number) ?? 7,
    comfortRating: ((row.comfort_rating as 1 | 2 | 3) ?? 1) as 1 | 2 | 3,
    irritationFlag: row.irritation_flag === true,
    adherenceSelfReport: ((row.adherence as CheckInRecord['adherenceSelfReport']) ?? 'most') as CheckInRecord['adherenceSelfReport'],
    // optionalCaptureId intentionally dropped — photos never sync
    planDiff: (row.plan_diff as CheckInRecord['planDiff']) ?? { added: [], kept: [], paused: [] },
  };
}

/* ═══════════════════════ Pure merge helpers ═══════════════════════════ */

export interface Versioned<T> {
  data: T;
  updatedAt: string | null;
}

export interface MergeOutcome<T> {
  winner: 'local' | 'remote' | 'none';
  data: T | null;
}

/** Last-write-wins for singleton entities. Ties go to the local copy (no churn). */
export function mergeSingleton<T>(local: Versioned<T> | null, remote: Versioned<T> | null): MergeOutcome<T> {
  if (!local && !remote) return { winner: 'none', data: null };
  if (!local) return { winner: 'remote', data: remote!.data };
  if (!remote) return { winner: 'local', data: local.data };
  const lt = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const rt = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
  return rt > lt ? { winner: 'remote', data: remote.data } : { winner: 'local', data: local.data };
}

/** Union of append-only entries by deterministic id; result sorted by date ascending. */
export function unionById<T extends { date: string }>(local: T[], remote: T[], getId: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const r of remote) map.set(getId(r), r);
  for (const l of local) map.set(getId(l), l); // local wins on identical ids (same content by construction)
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ═══════════════════════ Module state ═════════════════════════════════ */

let currentUserId: string | null = null;
let applier: ((patch: SyncedSnapshot) => void) | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let engineStarted = false;
let syncInFlight: Promise<SyncResult> | null = null;
const initialInFlight = new Map<string, Promise<SyncResult>>();
const statusListeners = new Set<(s: SyncStatus) => void>();

function nowIso(): string {
  return new Date().toISOString();
}

/** Register the store's snapshot applier (called once by AppProvider). */
export function registerSyncApplier(fn: ((patch: SyncedSnapshot) => void) | null): void {
  applier = fn;
}

/** Tell the engine who is signed in (null = signed out). */
export function setSyncUser(userId: string | null): void {
  currentUserId = userId;
  notifyStatus();
}

/** Hard gate for ALL server writes. Reads are not gated. */
function canWrite(): boolean {
  return BACKEND_ENABLED && currentUserId !== null && readSyncConsent();
}

/** Per-entity consent: capture_meta needs photoSave, coach_threads need coachChat. */
function entityAllowed(entity: SyncEntity): boolean {
  if (!canWrite()) return false;
  const c = readConsents();
  if (entity === 'capture_meta') return c.photoSave;
  if (entity === 'coach_threads') return c.coachChat;
  return true;
}

/* ═══════════════════════ Status surface ═══════════════════════════════ */

export function getSyncStatus(): SyncStatus {
  const meta = loadMeta();
  return {
    backendEnabled: BACKEND_ENABLED,
    signedIn: currentUserId !== null,
    syncConsent: readSyncConsent(),
    lastSyncedAt: meta.lastSyncedAt,
    pendingCount: loadOutbox().length,
    syncing: syncInFlight !== null,
  };
}

export function subscribeSyncStatus(cb: (s: SyncStatus) => void): () => void {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

function notifyStatus(): void {
  const s = getSyncStatus();
  for (const cb of statusListeners) {
    try {
      cb(s);
    } catch {
      /* listener errors must not break sync */
    }
  }
}

function touchLastSynced(): void {
  const meta = loadMeta();
  meta.lastSyncedAt = nowIso();
  saveMeta(meta);
}

/* ═══════════════════════ Outbox ═══════════════════════════════════════ */

/** Record a local change timestamp (no network) so future merges see local recency. */
function markChanged(entity: SyncEntity, threadId?: string): void {
  const meta = loadMeta();
  const now = nowIso();
  if (entity === 'coach_threads' && threadId) meta.threads[threadId] = now;
  else meta.entities[entity] = now;
  saveMeta(meta);
}

function enqueue(table: SyncEntity, key: string, op: 'upsert' | 'delete', row?: Row, match?: Row): void {
  if (!BACKEND_ENABLED || !currentUserId) return; // mark-only mode; a later sync pushes from state
  const id = `${table}:${key}`;
  const ops = loadOutbox().filter((o) => o.id !== id);
  ops.push({ id, userId: currentUserId, table, op, row, match, queuedAt: nowIso() });
  saveOutbox(ops);
  notifyStatus();
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushOutbox();
  }, 750);
}

/** Flush queued writes. Failed ops stay queued (retried on next flush / online / interval). */
export async function flushOutbox(): Promise<number> {
  if (!BACKEND_ENABLED || !canWrite()) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  const sb = getSupabase();
  if (!sb) return 0;
  const ops = loadOutbox();
  if (ops.length === 0) return 0;
  const remaining: OutboxOp[] = [];
  let flushed = 0;
  for (const op of ops) {
    if (op.userId !== currentUserId) continue; // drop ops queued under a different account
    try {
      const { error } =
        op.op === 'delete'
          ? await sb.from(op.table).delete().match(op.match ?? {})
          : await sb.from(op.table).upsert(op.row ?? {});
      if (error) {
        console.warn(`[LumaFace] sync op ${op.id} failed: ${error.message}`);
        remaining.push(op);
      } else {
        flushed += 1;
      }
    } catch (e) {
      console.warn(`[LumaFace] sync op ${op.id} threw`, e);
      remaining.push(op);
    }
  }
  saveOutbox(remaining);
  if (flushed > 0) touchLastSynced();
  notifyStatus();
  return flushed;
}

/* ═══════════════════════ Push API (called by store actions) ═══════════ */

export function pushProfile(profile: UserProfile): void {
  markChanged('profiles');
  if (currentUserId) enqueue('profiles', 'self', 'upsert', profileToRow(currentUserId, profile, nowIso()));
}

export function pushSafety(safety: SafetyRecord): void {
  markChanged('safety_answers');
  if (currentUserId) enqueue('safety_answers', 'self', 'upsert', safetyToRow(currentUserId, safety, nowIso()));
}

export function pushInventory(inventory: Inventory): void {
  markChanged('inventories');
  if (currentUserId) enqueue('inventories', 'self', 'upsert', inventoryToRow(currentUserId, inventory, nowIso()));
}

export function pushPlan(plan: Plan): void {
  markChanged('plans');
  if (currentUserId) enqueue('plans', 'self', 'upsert', planToRow(currentUserId, plan, nowIso()));
}

export function pushConsents(consents: Consents): void {
  markChanged('consents');
  if (currentUserId) enqueue('consents', 'self', 'upsert', consentsToRow(currentUserId, consents, nowIso()));
}

export function pushCoachThread(thread: CoachThread): void {
  markChanged('coach_threads', thread.id);
  if (!readConsents().coachChat) return; // history consent off → never queued
  if (currentUserId) enqueue('coach_threads', threadRowId(thread.id), 'upsert', threadToRow(currentUserId, thread, nowIso()));
}

export function pushSessionLog(entry: ComfortEntry): void {
  markChanged('session_logs');
  if (currentUserId) enqueue('session_logs', sessionLogId(entry), 'upsert', sessionLogToRow(currentUserId, entry));
}

export function pushCheckIn(record: CheckInRecord): void {
  markChanged('check_ins');
  if (currentUserId) enqueue('check_ins', checkInId(record), 'upsert', checkInToRow(currentUserId, record));
}

/** Metadata only — gated on photoSave AND sync. The photo bytes never leave the device. */
export function pushCaptureMeta(capture: Capture): void {
  if (!readConsents().photoSave) return;
  if (currentUserId) enqueue('capture_meta', captureMetaId(capture.captureId), 'upsert', captureMetaToRow(currentUserId, capture));
}

export function removeCaptureMeta(captureId: string): void {
  if (currentUserId) enqueue('capture_meta', captureMetaId(captureId), 'delete', undefined, { id: captureMetaId(captureId) });
}

/* ═══════════════════════ Pull & reconcile ═════════════════════════════ */

interface PulledRows {
  profiles?: Row | null;
  safety_answers?: Row | null;
  inventories?: Row | null;
  plans?: Row | null;
  consents?: Row | null;
  coach_threads?: Row[];
  session_logs?: Row[];
  check_ins?: Row[];
  capture_meta?: Row[];
}

interface LocalSnapshot {
  profile: UserProfile | null;
  safety: SafetyRecord | null;
  inventory: Inventory | null;
  plan: Plan | null;
  consents: Consents;
  coachThreads: CoachThread[];
  comfortLog: ComfortEntry[];
  checkIns: CheckInRecord[];
  captures: Capture[];
}

function readLocalSnapshot(): LocalSnapshot {
  const progress = loadJson<{ comfortLog?: ComfortEntry[] }>(LS.progress, {});
  return {
    profile: loadJson<UserProfile | null>(LS.profile, null),
    safety: loadJson<SafetyRecord | null>(LS.safety, null),
    inventory: loadJson<Inventory | null>(LS.inventory, null),
    plan: loadJson<Plan | null>(LS.plan, null),
    consents: readConsents(),
    coachThreads: loadJson<CoachThread[]>(LS.coachThreads, []),
    comfortLog: progress.comfortLog ?? [],
    checkIns: loadJson<CheckInRecord[]>(LS.checkins, []),
    captures: loadJson<Capture[]>(LS.photos, []),
  };
}

async function selectRows(table: SyncEntity): Promise<Row[] | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from(table).select('*');
  if (error) {
    console.warn(`[LumaFace] pull ${table} failed: ${error.message}`);
    return undefined;
  }
  return (data ?? []) as Row[];
}

/** Pull every user-scoped table. A failed table comes back undefined and is skipped by reconcile. */
async function pullAll(): Promise<PulledRows> {
  const [profiles, safety, inventories, plans, consents, threads, logs, checkins, captureMeta] = await Promise.all([
    selectRows('profiles'),
    selectRows('safety_answers'),
    selectRows('inventories'),
    selectRows('plans'),
    selectRows('consents'),
    selectRows('coach_threads'),
    selectRows('session_logs'),
    selectRows('check_ins'),
    selectRows('capture_meta'),
  ]);
  const first = (rows: Row[] | undefined): Row | null | undefined => (rows === undefined ? undefined : (rows[0] ?? null));
  return {
    profiles: first(profiles),
    safety_answers: first(safety),
    inventories: first(inventories),
    plans: first(plans),
    consents: first(consents),
    coach_threads: threads,
    session_logs: logs,
    check_ins: checkins,
    capture_meta: captureMeta,
  };
}

async function upsertRows(table: SyncEntity, rows: Row[]): Promise<void> {
  if (rows.length === 0 || !entityAllowed(table)) return;
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(table).upsert(rows);
  if (error) console.warn(`[LumaFace] push ${table} failed: ${error.message}`);
}

/**
 * The merge core: for every entity, last-write-wins or union; remote winners
 * are applied to the store, local winners are pushed (only when consent allows).
 */
async function reconcile(userId: string, remote: PulledRows, local: LocalSnapshot): Promise<{ applied: boolean; pushed: boolean }> {
  const meta = loadMeta();
  const patch: SyncedSnapshot = {};
  const pushRows: Partial<Record<SyncEntity, Row[]>> = {};
  let applied = false;

  const mergeOne = <T>(
    entity: SyncEntity,
    localData: T | null,
    remoteRow: Row | null | undefined,
    fromRow: (r: Row) => T,
    toRow: (data: T, ts: string) => Row,
    apply: (data: T) => void,
  ): void => {
    if (remoteRow === undefined) return; // pull failed — leave this entity alone
    const localTs = meta.entities[entity] ?? null;
    const outcome = mergeSingleton(
      localData ? { data: localData, updatedAt: localTs } : null,
      remoteRow ? { data: fromRow(remoteRow), updatedAt: str(remoteRow.updated_at) } : null,
    );
    if (outcome.winner === 'remote' && outcome.data) {
      apply(outcome.data);
      applied = true;
    } else if (outcome.winner === 'local' && outcome.data) {
      pushRows[entity] = [toRow(outcome.data, localTs ?? nowIso())];
    }
  };

  mergeOne('profiles', local.profile, remote.profiles, rowToProfile, (d, ts) => profileToRow(userId, d, ts), (d) => (patch.profile = d));
  mergeOne('safety_answers', local.safety, remote.safety_answers, rowToSafety, (d, ts) => safetyToRow(userId, d, ts), (d) => (patch.safety = d));
  mergeOne('inventories', local.inventory, remote.inventories, rowToInventory, (d, ts) => inventoryToRow(userId, d, ts), (d) => (patch.inventory = d));
  mergeOne('plans', local.plan, remote.plans, rowToPlan, (d, ts) => planToRow(userId, d, ts), (d) => (patch.plan = d));
  mergeOne('consents', local.consents, remote.consents, rowToConsents, (d, ts) => consentsToRow(userId, d, ts), (d) => (patch.consents = d));

  /* ── coach threads: union by resolved id, per-thread LWW ── */
  if (remote.coach_threads !== undefined) {
    const remoteById = new Map(remote.coach_threads.map((r) => [str(r.id) ?? '', r]));
    const merged: CoachThread[] = [];
    const toPush: Row[] = [];
    const seenRemote = new Set<string>();
    for (const t of local.coachThreads) {
      const rid = threadRowId(t.id);
      const remoteRow = remoteById.get(rid);
      if (!remoteRow) {
        merged.push(t);
        toPush.push(threadToRow(userId, t, meta.threads[t.id] ?? nowIso()));
        continue;
      }
      seenRemote.add(rid);
      const localTs = meta.threads[t.id] ?? t.messages[t.messages.length - 1]?.createdAt ?? t.createdAt;
      const outcome = mergeSingleton({ data: t, updatedAt: localTs }, { data: rowToThread(remoteRow), updatedAt: str(remoteRow.updated_at) });
      if (outcome.winner === 'remote') {
        merged.push({ ...t, messages: (remoteRow.messages as CoachThread['messages']) ?? t.messages });
        applied = true;
      } else {
        merged.push(t);
        toPush.push(threadToRow(userId, t, localTs));
      }
    }
    for (const [rid, remoteRow] of remoteById) {
      if (!seenRemote.has(rid)) {
        merged.push(rowToThread(remoteRow)); // adopt remote-only thread (id becomes its server id)
        applied = true;
      }
    }
    merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    patch.coachThreads = merged;
    pushRows.coach_threads = toPush;
  }

  /* ── append-only unions ── */
  if (remote.session_logs !== undefined) {
    const remoteEntries = remote.session_logs.map(rowToComfortEntry);
    const remoteIds = new Set(remoteEntries.map((e) => sessionLogId(e)));
    const merged = unionById(local.comfortLog, remoteEntries, (e) => sessionLogId(e));
    if (remoteEntries.some((e) => !local.comfortLog.some((l) => sessionLogId(l) === sessionLogId(e)))) {
      patch.comfortLog = merged;
      applied = true;
    }
    const toPush = local.comfortLog.filter((e) => !remoteIds.has(sessionLogId(e))).map((e) => sessionLogToRow(userId, e));
    pushRows.session_logs = toPush;
  }

  if (remote.check_ins !== undefined) {
    const remoteRecs = remote.check_ins.map(rowToCheckIn);
    const remoteIds = new Set(remoteRecs.map((r) => checkInId(r)));
    const merged = unionById(local.checkIns, remoteRecs, (r) => checkInId(r));
    if (remoteRecs.some((r) => !local.checkIns.some((l) => checkInId(l) === checkInId(r)))) {
      patch.checkIns = merged;
      applied = true;
    }
    const toPush = local.checkIns.filter((r) => !remoteIds.has(checkInId(r))).map((r) => checkInToRow(userId, r));
    pushRows.check_ins = toPush;
  }

  /* ── capture_meta: push-only, metadata only ── */
  if (remote.capture_meta !== undefined && entityAllowed('capture_meta')) {
    const remoteIds = new Set(remote.capture_meta.map((r) => str(r.id)));
    const toPush = local.captures.filter((c) => !remoteIds.has(captureMetaId(c.captureId))).map((c) => captureMetaToRow(userId, c));
    pushRows.capture_meta = toPush;
  }

  /* ── apply remote winners locally ── */
  if (applied && applier) {
    try {
      applier(patch);
    } catch (e) {
      console.warn('[LumaFace] applying synced snapshot failed', e);
    }
  }

  /* ── push local winners (consent-gated) ── */
  let pushed = false;
  if (canWrite()) {
    for (const [table, rows] of Object.entries(pushRows) as [SyncEntity, Row[]][]) {
      await upsertRows(table, rows);
      if (rows.length > 0) pushed = true;
    }
  }

  touchLastSynced();
  notifyStatus();
  return { applied, pushed };
}

/* ═══════════════════════ Public orchestration ═════════════════════════ */

/**
 * First sign-in on this device: pull everything; if the account is empty and
 * local data exists, import it (only with sync consent); otherwise merge.
 * Runs once per account per device.
 */
export async function initialSync(userId: string): Promise<SyncResult> {
  if (!BACKEND_ENABLED) return { ok: false, reason: 'backend-disabled' };
  if (!getSupabase()) return { ok: false, reason: 'no-client' };
  const meta = loadMeta();
  if (meta.initialSyncDoneFor[userId]) return { ok: true, reason: 'already-synced' };
  const running = initialInFlight.get(userId);
  if (running) return running;

  const p = (async (): Promise<SyncResult> => {
    try {
      const remote = await pullAll();
      const allFailed = Object.values(remote).every((v) => v === undefined);
      if (allFailed) return { ok: false, reason: 'offline' };
      const local = readLocalSnapshot();
      const { applied, pushed } = await reconcile(userId, remote, local);
      const m = loadMeta();
      m.initialSyncDoneFor[userId] = nowIso();
      saveMeta(m);
      return { ok: true, applied, pushed };
    } catch (e) {
      console.warn('[LumaFace] initialSync failed', e);
      return { ok: false, reason: 'error' };
    }
  })();
  initialInFlight.set(userId, p);
  try {
    return await p;
  } finally {
    initialInFlight.delete(userId);
  }
}

/** Manual "Sync now" — full flush + pull/merge. Requires sync consent. */
export async function syncNow(): Promise<SyncResult> {
  if (!BACKEND_ENABLED) return { ok: false, reason: 'backend-disabled' };
  if (!currentUserId) return { ok: false, reason: 'signed-out' };
  if (!readSyncConsent()) return { ok: false, reason: 'sync-consent-off' };
  if (syncInFlight) return syncInFlight;
  notifyStatus();
  syncInFlight = (async (): Promise<SyncResult> => {
    try {
      await flushOutbox();
      const remote = await pullAll();
      const allFailed = Object.values(remote).every((v) => v === undefined);
      if (allFailed) return { ok: false, reason: 'offline' };
      const { applied, pushed } = await reconcile(currentUserId!, remote, readLocalSnapshot());
      const m = loadMeta();
      m.initialSyncDoneFor[currentUserId!] = m.initialSyncDoneFor[currentUserId!] ?? nowIso();
      saveMeta(m);
      return { ok: true, applied, pushed };
    } catch (e) {
      console.warn('[LumaFace] syncNow failed', e);
      return { ok: false, reason: 'error' };
    }
  })();
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
    notifyStatus();
  }
}

/**
 * Delete every server-side row for the signed-in user (GDPR delete-all).
 * NOT gated by sync consent — deletion is a data right. The auth user
 * record itself remains (known limitation; needs a service-role function).
 */
export async function deleteServerData(): Promise<DeleteServerResult> {
  if (!BACKEND_ENABLED || !currentUserId) return { skipped: true, deleted: [], failed: [] };
  const sb = getSupabase();
  if (!sb) return { skipped: true, deleted: [], failed: [] };
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const table of USER_TABLES) {
    try {
      const column = table === 'profiles' ? 'id' : 'user_id';
      const { error } = await sb.from(table).delete().eq(column, currentUserId);
      if (error) {
        console.warn(`[LumaFace] server delete ${table} failed: ${error.message}`);
        failed.push(table);
      } else {
        deleted.push(table);
      }
    } catch {
      failed.push(table);
    }
  }
  saveOutbox([]);
  return { skipped: false, deleted, failed };
}

/** Wipe local sync bookkeeping (used by the delete-all flow). */
export function clearSyncLocalState(): void {
  try {
    localStorage.removeItem(OUTBOX_KEY);
    localStorage.removeItem(SYNC_META_KEY);
  } catch {
    /* noop */
  }
}

/** Install the online listener + 30s retry interval. Idempotent. */
export function startSyncEngine(): void {
  if (engineStarted || !BACKEND_ENABLED || typeof window === 'undefined') return;
  engineStarted = true;
  window.addEventListener('online', () => {
    void flushOutbox();
  });
  window.setInterval(() => {
    void flushOutbox();
  }, 30_000);
}

/** Test hook — reset all module state between test cases. */
export function __resetSyncForTests(): void {
  currentUserId = null;
  applier = null;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  engineStarted = false;
  syncInFlight = null;
  initialInFlight.clear();
  statusListeners.clear();
  try {
    localStorage.removeItem(OUTBOX_KEY);
    localStorage.removeItem(SYNC_META_KEY);
  } catch {
    /* noop */
  }
}
