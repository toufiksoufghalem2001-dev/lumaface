/* eslint-disable react-refresh/only-export-components --
   Contract file: the provider, hook, types AND pure helpers intentionally
   live together so feature engineers import everything from one place. */
/**
 * LumaFace app store — AppProvider + useApp() typed hook.
 *
 * Persists every key from design.md §8.7 to localStorage. All state stays on
 * the device; photos never leave it. The rules engine (lib/rules.ts) and the
 * plan builder (lib/plan.ts) are the only sources of safety/plan logic.
 *
 * Storage keys:
 *   lf_onboarded · lf_profile · lf_safety · lf_inventory · lf_plan ·
 *   lf_progress · lf_checkins · lf_consents · lf_photos · lf_pro ·
 *   lf_coach_threads
 *
 * M2: auth state (signed-in/out) mirrors the supabase-js session — nothing
 * auth-related is persisted beyond that session. The consent-gated sync
 * engine (lib/sync.ts, keys lf_outbox / lf_sync_meta) is notified from the
 * mutating actions below; applying remote winners never re-triggers pushes.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BACKEND_ENABLED } from '@/lib/config';
import { onAuthStateChange, signOutBackend } from '@/lib/supabase';
import {
  clearSyncLocalState,
  initialSync,
  pushCaptureMeta,
  pushCheckIn,
  pushCoachThread,
  pushConsents,
  pushInventory,
  pushPlan,
  pushProfile,
  pushSafety,
  pushSessionLog,
  registerSyncApplier,
  removeCaptureMeta,
  setSyncUser,
  startSyncEngine,
  syncNow,
  type SyncedSnapshot,
} from '@/lib/sync';
import {
  evaluateSafety,
  conservativeSafetyEvaluation,
  EMPTY_SAFETY_ANSWERS,
  EMPTY_INVENTORY,
  RULE_VERSION,
  type Inventory,
  type SafetyAnswers,
  type SafetyEvaluation,
} from '@/lib/rules';
import {
  buildPlan,
  adjustPlanAfterCheckIn,
  type CheckInInput,
  type Plan,
  type PlanDiff,
  type UserProfile,
} from '@/lib/plan';
import { ACTIVITY_BY_ID } from '@/data/activities';

/* ═══════════════════════════ Exported types ═══════════════════════════ */

/** Persisted safety record (lf_safety). */
export interface SafetyRecord {
  answers: SafetyAnswers;
  contraindicationCodes: string[];
  ruleVersion: string;
  /** 'skipped' = user skipped screening → conservative plan */
  reviewStatus: 'complete' | 'skipped';
}

/** Granular, revocable consents (lf_consents) — ALL default false. */
export interface Consents {
  cameraCoach: boolean;
  photoSave: boolean;
  analytics: boolean;
  coachChat: boolean;
  /** M2: gates ALL server writes (sync/upload). Off = fully local, like M1. */
  sync: boolean;
}
export type ConsentKey = keyof Consents;

/** M2 auth state — mirrors the supabase-js session, nothing persisted. */
export interface AuthState {
  status: 'signed-out' | 'signed-in';
  userId?: string;
  email?: string;
  /** Live Supabase access token for edge-function calls (billing/entitlements). Never persisted. */
  accessToken?: string;
}

/** Quality metadata for a capture — never appearance analysis (§8.6). */
export interface CaptureQuality {
  lighting: number;
  blur: number;
  pose: number;
}

/** On-device progress photo (lf_photos). NEVER uploaded, NEVER analyzed. */
export interface Capture {
  captureId: string;
  localOnly: true;
  dataUrl: string;
  qualityMetrics: CaptureQuality;
  consentVersion: string;
  createdAt: string;
}

/** One session's comfort log entry (inside lf_progress.comfortLog). */
export interface ComfortEntry {
  date: string;
  activityId: string;
  comfortLevel: 1 | 2 | 3;
  irritationFlag: boolean;
  seconds: number;
}

/** Persisted progress (lf_progress). */
export interface ProgressState {
  /** program day numbers fully completed */
  completedDays: number[];
  /** lifetime guided-session count */
  sessions: number;
  /** lifetime guided minutes */
  minutes: number;
  streak: number;
  /** ISO date (YYYY-MM-DD) of last streak day */
  lastDone: string | null;
  /** badgeId → ISO date earned */
  badges: Record<string, string>;
  comfortLog: ComfortEntry[];
  /** YYYY-MM-DD → activityIds done that day (skincare check-offs + sessions) */
  dailyLog: Record<string, string[]>;
  /** sessions completed before 9am (Early Ritual badge) */
  earlySessions: number;
}

/** Weekly check-in record (lf_checkins, design.md §8.3). */
export interface CheckInRecord {
  date: string;
  day: number;
  comfortRating: 1 | 2 | 3;
  irritationFlag: boolean;
  adherenceSelfReport: 'all' | 'most' | 'some' | 'few';
  optionalCaptureId?: string;
  planDiff: PlanDiff;
}

/** Simulated PRO entitlement (lf_pro). */
export interface ProState {
  active: boolean;
  planLabel: string | null;
}

/** Structured coach answer (design.md §8.5 / spec §4.3). */
export interface CoachAnswer {
  intent: 'education' | 'routine_adjustment' | 'motivation' | 'safety_redirect';
  summary: string;
  recommended_actions: { activity_id: string; reason: string }[];
  warnings: { code: string; message: string }[];
  confidence: 'high' | 'medium' | 'low';
  source_ids: string[];
  requires_professional_review: boolean;
}

/** One chat message in a local preview thread. */
export interface CoachThreadMessage {
  id: string;
  role: 'user' | 'coach';
  /** user text, or coach plain text when no structured answer */
  text: string;
  answer?: CoachAnswer;
  createdAt: string;
}

/** Local preview coach thread (lf_coach_threads). */
export interface CoachThread {
  id: string;
  createdAt: string;
  messages: CoachThreadMessage[];
}

/** Everything completeOnboarding needs to build the first plan. */
export interface OnboardingResult {
  profile: UserProfile;
  safetyAnswers: SafetyAnswers;
  inventory: Inventory;
  consents?: Partial<Consents>;
}

/** The useApp() context value. */
export interface AppContextValue {
  /* ── state ── */
  onboarded: boolean;
  profile: UserProfile | null;
  safety: SafetyRecord | null;
  inventory: Inventory | null;
  plan: Plan | null;
  progress: ProgressState;
  checkIns: CheckInRecord[];
  consents: Consents;
  photos: Capture[];
  pro: ProState;
  coachThreads: CoachThread[];
  /** M2: auth state (supabase session mirror) */
  auth: AuthState;
  /** derived: current safety evaluation (from stored answers + inventory; conservative when skipped) */
  safetyEval: SafetyEvaluation;
  /** derived: current program day (first incomplete of 1–28) */
  currentDay: number;
  /** derived: activityIds completed today */
  todayDoneIds: string[];

  /* ── actions ── */
  /** finish onboarding: evaluate safety, build plan, mark onboarded */
  completeOnboarding: (data: OnboardingResult) => void;
  /** "Take a look around first": conservative plan + gentle defaults */
  skipOnboarding: () => void;
  /** merge profile fields; rebuilds the plan when goals/routineTime change */
  setProfile: (patch: Partial<UserProfile>) => void;
  /** store safety answers, re-evaluate, rebuild plan */
  setSafetyAnswers: (answers: SafetyAnswers) => void;
  /** store inventory, re-evaluate (retinoid/pregnancy), rebuild plan if exclusions changed */
  setInventory: (inventory: Inventory) => void;
  /** grant simulated PRO (planLabel e.g. "Annual $49.99/yr") */
  setPro: (planLabel: string) => void;
  /** revoke simulated PRO */
  clearPro: () => void;
  /** log a completed guided session; updates streak/badges/minutes */
  logSession: (activityId: string, comfortLevel: 1 | 2 | 3, seconds: number) => void;
  /** manual toggle for skincare basics check-offs on Today */
  toggleTodayItem: (activityId: string) => void;
  /** mark a program day complete (idempotent) */
  markDayComplete: (day: number) => void;
  /** save a weekly check-in; adjusts the plan; returns the visible diff */
  saveCheckIn: (input: CheckInInput & { optionalCaptureId?: string }) => PlanDiff;
  /** set one consent flag (all default off) */
  setConsent: (key: ConsentKey, value: boolean) => void;
  /** add an on-device photo (requires photoSave consent by UI convention) */
  addPhoto: (dataUrl: string, qualityMetrics?: CaptureQuality) => Capture;
  /** delete one on-device photo */
  deletePhoto: (captureId: string) => void;
  /** upsert a local coach preview thread */
  saveCoachThread: (thread: CoachThread) => void;
  /** M2: set auth state (used by the session listener in AppProvider / tests) */
  setAuth: (next: AuthState) => void;
  /** M2: end the Supabase session. Local data is kept, fully intact. */
  signOut: () => Promise<void>;
  /** M2 (sync engine → store): apply remote winners. Never triggers pushes. */
  applySyncedSnapshot: (patch: SyncedSnapshot) => void;
  /** download all lf_* data as JSON */
  exportData: () => void;
  /** wipe every lf_* key and reload */
  deleteAllData: () => void;
  /** PRO gating: true when the activity is PRO and the user is free */
  isActivityLocked: (activityId: string) => boolean;
}

/* ═══════════════════════════ Storage helpers ══════════════════════════ */

const K = {
  onboarded: 'lf_onboarded',
  profile: 'lf_profile',
  safety: 'lf_safety',
  inventory: 'lf_inventory',
  plan: 'lf_plan',
  progress: 'lf_progress',
  checkins: 'lf_checkins',
  consents: 'lf_consents',
  photos: 'lf_photos',
  pro: 'lf_pro',
  coachThreads: 'lf_coach_threads',
} as const;

const ALL_KEYS = Object.values(K);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[LumaFace] could not persist ${key}`, e);
  }
}

/* ═══════════════════════════ Defaults ═════════════════════════════════ */

const DEFAULT_CONSENTS: Consents = { cameraCoach: false, photoSave: false, analytics: false, coachChat: false, sync: false };

const DEFAULT_PROGRESS: ProgressState = {
  completedDays: [],
  sessions: 0,
  minutes: 0,
  streak: 0,
  lastDone: null,
  badges: {},
  comfortLog: [],
  dailyLog: {},
  earlySessions: 0,
};

const DEFAULT_PRO: ProState = { active: false, planLabel: null };

export const DEFAULT_PROFILE: UserProfile = {
  goals: [],
  routineTime: 5,
  budgetMode: 'affordable',
  adultConfirmed: true,
  climate: 'temperate',
  outdoorTime: 'indoors',
};

/* ═══════════════════════════ Pure helpers ═════════════════════════════ */

/** Local date key YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

/** First incomplete program day (1–28). */
export function currentDayOf(completedDays: number[]): number {
  for (let d = 1; d <= 28; d++) if (!completedDays.includes(d)) return d;
  return 28;
}

/** Badge ids earned by a progress state (habits & care, never appearance). */
export function earnedBadges(p: ProgressState): string[] {
  const out: string[] = [];
  if (p.sessions >= 1) out.push('first-light');
  if (p.streak >= 3) out.push('three-day-rhythm');
  if (p.streak >= 7) out.push('diamond-week');
  if (p.completedDays.length >= 28) out.push('full-circle');
  if (p.sessions >= 100) out.push('century-of-care');
  if (p.earlySessions >= 5) out.push('early-ritual');
  return out;
}

/* ═══════════════════════════ Provider ═════════════════════════════════ */

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState<boolean>(() => load(K.onboarded, false));
  const [profile, setProfileState] = useState<UserProfile | null>(() => load(K.profile, null));
  const [safety, setSafety] = useState<SafetyRecord | null>(() => load(K.safety, null));
  const [inventory, setInventoryState] = useState<Inventory | null>(() => load(K.inventory, null));
  const [plan, setPlan] = useState<Plan | null>(() => load(K.plan, null));
  const [progress, setProgress] = useState<ProgressState>(() => load(K.progress, DEFAULT_PROGRESS));
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>(() => load(K.checkins, []));
  const [consents, setConsents] = useState<Consents>(() => ({ ...DEFAULT_CONSENTS, ...load(K.consents, DEFAULT_CONSENTS) }));
  const [photos, setPhotos] = useState<Capture[]>(() => load(K.photos, []));
  const [pro, setProState] = useState<ProState>(() => load(K.pro, DEFAULT_PRO));
  const [coachThreads, setCoachThreads] = useState<CoachThread[]>(() => load(K.coachThreads, []));
  const [auth, setAuthState] = useState<AuthState>({ status: 'signed-out' });

  /* ── persistence effects ── */
  useEffect(() => save(K.onboarded, onboarded), [onboarded]);
  useEffect(() => save(K.profile, profile), [profile]);
  useEffect(() => save(K.safety, safety), [safety]);
  useEffect(() => save(K.inventory, inventory), [inventory]);
  useEffect(() => save(K.plan, plan), [plan]);
  useEffect(() => save(K.progress, progress), [progress]);
  useEffect(() => save(K.checkins, checkIns), [checkIns]);
  useEffect(() => save(K.consents, consents), [consents]);
  useEffect(() => save(K.photos, photos), [photos]);
  useEffect(() => save(K.pro, pro), [pro]);
  useEffect(() => save(K.coachThreads, coachThreads), [coachThreads]);

  /* ── M2: session listener + sync engine bootstrap (degrades to noop offline) ── */
  useEffect(() => {
    if (!BACKEND_ENABLED) return;
    startSyncEngine();
    const unsubscribe = onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setAuthState(user ? { status: 'signed-in', userId: user.id, email: user.email ?? undefined, accessToken: session?.access_token ?? undefined } : { status: 'signed-out' });
      setSyncUser(user?.id ?? null);
      if (user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        void initialSync(user.id);
      }
    });
    return unsubscribe;
  }, []);

  /* ── M2: sync engine applies remote winners through this callback ── */
  const applySyncedSnapshot = useCallback((patch: SyncedSnapshot) => {
    if (patch.profile) setProfileState(patch.profile);
    if (patch.safety) setSafety(patch.safety);
    if (patch.inventory) setInventoryState(patch.inventory);
    if (patch.plan) setPlan(patch.plan);
    if (patch.consents) setConsents(patch.consents);
    if (patch.coachThreads) setCoachThreads(patch.coachThreads);
    if (patch.checkIns) setCheckIns(patch.checkIns);
    if (patch.comfortLog) setProgress((prev) => ({ ...prev, comfortLog: patch.comfortLog! }));
  }, []);

  useEffect(() => {
    registerSyncApplier(applySyncedSnapshot);
    return () => registerSyncApplier(null);
  }, [applySyncedSnapshot]);

  /* ── derived ── */
  const safetyEval = useMemo<SafetyEvaluation>(() => {
    if (!safety) return evaluateSafety(EMPTY_SAFETY_ANSWERS, inventory ?? EMPTY_INVENTORY);
    if (safety.reviewStatus === 'skipped') return conservativeSafetyEvaluation();
    return evaluateSafety(safety.answers, inventory ?? EMPTY_INVENTORY);
  }, [safety, inventory]);

  const currentDay = useMemo(() => currentDayOf(progress.completedDays), [progress.completedDays]);
  const todayDoneIds = useMemo(() => progress.dailyLog[todayKey()] ?? [], [progress.dailyLog]);

  /* ── actions ── */

  const completeOnboarding = useCallback((data: OnboardingResult) => {
    const evalResult = evaluateSafety(data.safetyAnswers, data.inventory);
    const newPlan = buildPlan(data.profile, evalResult, data.inventory);
    const safetyRecord: SafetyRecord = {
      answers: data.safetyAnswers,
      contraindicationCodes: evalResult.contraindicationCodes,
      ruleVersion: RULE_VERSION,
      reviewStatus: 'complete',
    };
    const nextConsents: Consents = { ...DEFAULT_CONSENTS, ...load(K.consents, {}), ...data.consents };
    setProfileState(data.profile);
    setSafety(safetyRecord);
    setInventoryState(data.inventory);
    if (data.consents) setConsents(nextConsents);
    setPlan(newPlan);
    setOnboarded(true);
    /* M2: notify sync (no-op unless signed in + sync consent) */
    pushProfile(data.profile);
    pushSafety(safetyRecord);
    pushInventory(data.inventory);
    pushPlan(newPlan);
    if (data.consents) pushConsents(nextConsents);
  }, []);

  const skipOnboarding = useCallback(() => {
    const p = DEFAULT_PROFILE;
    const evalResult = conservativeSafetyEvaluation();
    const safetyRecord: SafetyRecord = {
      answers: { ...EMPTY_SAFETY_ANSWERS },
      contraindicationCodes: [],
      ruleVersion: RULE_VERSION,
      reviewStatus: 'skipped',
    };
    const newPlan = buildPlan(p, evalResult, EMPTY_INVENTORY);
    setProfileState(p);
    setSafety(safetyRecord);
    setInventoryState(EMPTY_INVENTORY);
    setPlan(newPlan);
    setOnboarded(true);
    pushProfile(p);
    pushSafety(safetyRecord);
    pushInventory(EMPTY_INVENTORY);
    pushPlan(newPlan);
  }, []);

  const setProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      const next = { ...(profile ?? DEFAULT_PROFILE), ...patch };
      setProfileState(next);
      pushProfile(next);
      if (plan && (patch.goals !== undefined || patch.routineTime !== undefined)) {
        const evalResult =
          safety && safety.reviewStatus === 'complete'
            ? evaluateSafety(safety.answers, inventory ?? EMPTY_INVENTORY)
            : conservativeSafetyEvaluation();
        const newPlan = buildPlan(next, evalResult, inventory ?? EMPTY_INVENTORY);
        setPlan(newPlan);
        pushPlan(newPlan);
      }
    },
    [profile, plan, safety, inventory],
  );

  const setSafetyAnswers = useCallback(
    (answers: SafetyAnswers) => {
      const inv = inventory ?? EMPTY_INVENTORY;
      const evalResult = evaluateSafety(answers, inv);
      const safetyRecord: SafetyRecord = {
        answers,
        contraindicationCodes: evalResult.contraindicationCodes,
        ruleVersion: RULE_VERSION,
        reviewStatus: 'complete',
      };
      setSafety(safetyRecord);
      pushSafety(safetyRecord);
      if (profile) {
        const newPlan = buildPlan(profile, evalResult, inv);
        setPlan(newPlan);
        pushPlan(newPlan);
      }
    },
    [inventory, profile],
  );

  const setInventory = useCallback(
    (inv: Inventory) => {
      setInventoryState(inv);
      pushInventory(inv);
      if (profile && safety?.reviewStatus === 'complete') {
        const evalResult = evaluateSafety(safety.answers, inv);
        const newPlan = buildPlan(profile, evalResult, inv);
        setPlan(newPlan);
        pushPlan(newPlan);
        if (safety) {
          const nextSafety: SafetyRecord = { ...safety, contraindicationCodes: evalResult.contraindicationCodes, ruleVersion: RULE_VERSION };
          setSafety(nextSafety);
          pushSafety(nextSafety);
        }
      }
    },
    [profile, safety],
  );

  const setPro = useCallback((planLabel: string) => setProState({ active: true, planLabel }), []);
  const clearPro = useCallback(() => setProState(DEFAULT_PRO), []);

  const logSession = useCallback(
    (activityId: string, comfortLevel: 1 | 2 | 3, seconds: number) => {
      const entry: ComfortEntry = {
        date: new Date().toISOString(),
        activityId,
        comfortLevel,
        irritationFlag: comfortLevel === 3,
        seconds,
      };
      pushSessionLog(entry);
      setProgress((prev) => {
        const today = todayKey();
        const firstToday = prev.lastDone !== today;
        const streak = firstToday ? (prev.lastDone === yesterdayKey() ? prev.streak + 1 : 1) : prev.streak;
        const hour = new Date().getHours();
        const dayLog = prev.dailyLog[today] ?? [];
        const nextLog = dayLog.includes(activityId) ? dayLog : [...dayLog, activityId];

        // auto-complete the current program day when every item is done
        let completedDays = prev.completedDays;
        if (plan) {
          const d = currentDayOf(prev.completedDays);
          const dayItems = plan.days.find((x) => x.day === d)?.items.map((i) => i.activityId) ?? [];
          if (dayItems.length > 0 && dayItems.every((id) => nextLog.includes(id)) && !completedDays.includes(d)) {
            completedDays = [...completedDays, d].sort((a, b) => a - b);
          }
        }

        const next: ProgressState = {
          ...prev,
          completedDays,
          sessions: prev.sessions + 1,
          minutes: Math.round((prev.minutes + seconds / 60) * 10) / 10,
          streak,
          lastDone: today,
          earlySessions: prev.earlySessions + (hour < 9 ? 1 : 0),
          dailyLog: { ...prev.dailyLog, [today]: nextLog },
          comfortLog: [...prev.comfortLog, entry],
          badges: { ...prev.badges },
        };
        for (const id of earnedBadges(next)) {
          if (!next.badges[id]) next.badges[id] = today;
        }
        return next;
      });
    },
    [plan],
  );

  const toggleTodayItem = useCallback((activityId: string) => {
    setProgress((prev) => {
      const today = todayKey();
      const dayLog = prev.dailyLog[today] ?? [];
      const nextLog = dayLog.includes(activityId)
        ? dayLog.filter((id) => id !== activityId)
        : [...dayLog, activityId];
      return { ...prev, dailyLog: { ...prev.dailyLog, [today]: nextLog } };
    });
  }, []);

  const markDayComplete = useCallback((day: number) => {
    setProgress((prev) =>
      prev.completedDays.includes(day)
        ? prev
        : { ...prev, completedDays: [...prev.completedDays, day].sort((a, b) => a - b) },
    );
  }, []);

  const saveCheckIn = useCallback(
    (input: CheckInInput & { optionalCaptureId?: string }): PlanDiff => {
      const answers: SafetyAnswers = {
        ...(safety?.answers ?? EMPTY_SAFETY_ANSWERS),
        activeIrritation: input.irritationFlag,
      };
      const evalResult = evaluateSafety(answers, inventory ?? EMPTY_INVENTORY);
      const basePlan = plan ?? buildPlan(profile ?? DEFAULT_PROFILE, evalResult, inventory ?? EMPTY_INVENTORY);
      const { plan: newPlan, diff } = adjustPlanAfterCheckIn(basePlan, input, evalResult);
      setPlan(newPlan);
      pushPlan(newPlan);
      const record: CheckInRecord = {
        date: new Date().toISOString(),
        day: input.day,
        comfortRating: input.comfortRating,
        irritationFlag: input.irritationFlag,
        adherenceSelfReport: input.adherenceSelfReport,
        optionalCaptureId: input.optionalCaptureId,
        planDiff: diff,
      };
      setCheckIns((prev) => [...prev, record]);
      pushCheckIn(record);
      return diff;
    },
    [safety, inventory, plan, profile],
  );

  const setConsent = useCallback(
    (key: ConsentKey, value: boolean) => {
      const next: Consents = { ...consents, [key]: value };
      save(K.consents, next); // synchronous — the sync consent gate reads localStorage
      setConsents(next);
      pushConsents(next);
      if (key === 'sync' && value) void syncNow(); // opting in: full sync immediately
    },
    [consents],
  );

  const addPhoto = useCallback((dataUrl: string, qualityMetrics?: CaptureQuality): Capture => {
    const capture: Capture = {
      captureId: `cap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      localOnly: true,
      dataUrl,
      qualityMetrics: qualityMetrics ?? { lighting: 0.8, blur: 0.1, pose: 0.9 },
      consentVersion: RULE_VERSION,
      createdAt: new Date().toISOString(),
    };
    setPhotos((prev) => [...prev, capture]);
    pushCaptureMeta(capture); // metadata only; gated on photoSave + sync inside sync.ts
    return capture;
  }, []);

  const deletePhoto = useCallback((captureId: string) => {
    setPhotos((prev) => prev.filter((p) => p.captureId !== captureId));
    removeCaptureMeta(captureId);
  }, []);

  const saveCoachThread = useCallback((thread: CoachThread) => {
    pushCoachThread(thread);
    setCoachThreads((prev) => {
      const i = prev.findIndex((t) => t.id === thread.id);
      if (i === -1) return [...prev, thread];
      const next = [...prev];
      next[i] = thread;
      return next;
    });
  }, []);

  const exportData = useCallback(() => {
    const dump: Record<string, unknown> = {};
    for (const key of ALL_KEYS) {
      try {
        dump[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        dump[key] = null;
      }
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), app: 'LumaFace', data: dump }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumaface-data-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const setAuth = useCallback((next: AuthState) => {
    setAuthState(next);
  }, []);

  const signOut = useCallback(async () => {
    await signOutBackend(); // clears the persisted supabase session; local lf_* data is kept
    setSyncUser(null);
    setAuthState({ status: 'signed-out' });
  }, []);

  const deleteAllData = useCallback(() => {
    for (const key of ALL_KEYS) localStorage.removeItem(key);
    clearSyncLocalState(); // lf_outbox + lf_sync_meta
    window.location.reload();
  }, []);

  const isActivityLocked = useCallback(
    (activityId: string) => {
      const a = ACTIVITY_BY_ID.get(activityId);
      if (!a) return false;
      return !a.free && !pro.active;
    },
    [pro.active],
  );

  const value: AppContextValue = {
    onboarded,
    profile,
    safety,
    inventory,
    plan,
    progress,
    checkIns,
    consents,
    photos,
    pro,
    coachThreads,
    auth,
    safetyEval,
    currentDay,
    todayDoneIds,
    completeOnboarding,
    skipOnboarding,
    setProfile,
    setSafetyAnswers,
    setInventory,
    setPro,
    clearPro,
    logSession,
    toggleTodayItem,
    markDayComplete,
    saveCheckIn,
    setConsent,
    addPhoto,
    deletePhoto,
    saveCoachThread,
    setAuth,
    signOut,
    applySyncedSnapshot,
    exportData,
    deleteAllData,
    isActivityLocked,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Typed app hook — the single entry point for all screens. */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
