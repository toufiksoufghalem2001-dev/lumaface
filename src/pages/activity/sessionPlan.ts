/**
 * Guided-session timeline builder (activity.md §B3 "Phase logic").
 *
 * Pure functions — the session player renders entirely from this plan.
 * Choreography per library.md "Session choreography (shared)":
 *   3s "Settle in" intro → per rep: Hold/Work (record-derived seconds,
 *   default ~10s) + 4s Release → one 6s "rest" exhale → Done.
 * Skincare slots run a single continuous timer (no reps); the work window
 * is sliced into equal step windows for the StepCue.
 *
 * Phase labels per design.md §7.5 / activity.md §B3:
 *   "SETTLE IN" · "HOLD · BREATHE" · "RELEASE" · "GLIDE" (massage strokes).
 */

import type { Activity } from '@/data/activities';

export type SessionPhaseKind = 'intro' | 'work' | 'release' | 'outro';

export interface SessionPhase {
  kind: SessionPhaseKind;
  /** eyebrow label in the ring center */
  label: string;
  /** phase length in seconds */
  duration: number;
  /** step cued during this phase (index into activity.steps) */
  stepIndex: number;
  /** 1-based rep number for work/release phases, else null */
  rep: number | null;
  totalReps: number;
  /** cumulative timeline window [start, end) in seconds */
  start: number;
  end: number;
}

export interface SessionPlan {
  phases: SessionPhase[];
  totalSeconds: number;
  reps: number;
  /** true for skincare slots: single continuous timer (no reps) */
  continuous: boolean;
  stepCount: number;
  /** seconds of Hold/Work per rep (0 for continuous) */
  holdSeconds: number;
}

export const INTRO_SECONDS = 3;
export const RELEASE_SECONDS = 4;
export const OUTRO_SECONDS = 6;
/** never let a hold shrink below this — the practice stays unhurried
 *  (3s matches the shortest record cycle: Smile Release 2s smile + release) */
const MIN_HOLD_SECONDS = 3;

const NUMBER_WORDS: Record<string, number> = {
  once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/**
 * Derive the rep count from the record itself: an explicit "Repeat N times"
 * instruction wins; otherwise each guided step is one rep (e.g. the 5-zone
 * massage sequence → 5 reps). Capped so a hold never drops below
 * MIN_HOLD_SECONDS.
 */
export function deriveRepCount(activity: Activity): number {
  const text = activity.steps.join(' ');
  const m = text.match(/repeat(?:\s+the\s+full\s+path)?\s+(\w+)\s+times?/i);
  let reps = 0;
  if (m) {
    const word = m[1].toLowerCase();
    reps = NUMBER_WORDS[word] ?? Number.parseInt(word, 10);
  }
  if (!reps || Number.isNaN(reps) || reps < 1) reps = activity.steps.length;
  const budget = activity.durationSeconds - INTRO_SECONDS - OUTRO_SECONDS;
  while (reps > 1 && (budget - reps * RELEASE_SECONDS) / reps < MIN_HOLD_SECONDS) reps--;
  return Math.max(1, reps);
}

/** Build the full phase timeline for an activity. */
export function buildSessionPlan(activity: Activity): SessionPlan {
  const total = activity.durationSeconds;

  /* ── Skincare slots: single continuous timer (no reps) ── */
  if (activity.category === 'skincare') {
    const work = Math.max(5, total - INTRO_SECONDS - OUTRO_SECONDS);
    const phases: SessionPhase[] = [
      { kind: 'intro', label: 'SETTLE IN', duration: INTRO_SECONDS, stepIndex: 0, rep: null, totalReps: 1, start: 0, end: INTRO_SECONDS },
      { kind: 'work', label: 'PRACTICE', duration: work, stepIndex: 0, rep: 1, totalReps: 1, start: INTRO_SECONDS, end: INTRO_SECONDS + work },
      { kind: 'outro', label: 'REST', duration: OUTRO_SECONDS, stepIndex: activity.steps.length - 1, rep: null, totalReps: 1, start: INTRO_SECONDS + work, end: total },
    ];
    return { phases, totalSeconds: total, reps: 1, continuous: true, stepCount: activity.steps.length, holdSeconds: 0 };
  }

  /* ── Rep-based guided practice ── */
  const reps = deriveRepCount(activity);
  const hold = (total - INTRO_SECONDS - OUTRO_SECONDS - reps * RELEASE_SECONDS) / reps;
  const workLabel = activity.category === 'massage' ? 'GLIDE' : 'HOLD · BREATHE';

  const phases: SessionPhase[] = [
    { kind: 'intro', label: 'SETTLE IN', duration: INTRO_SECONDS, stepIndex: 0, rep: null, totalReps: reps, start: 0, end: INTRO_SECONDS },
  ];
  let t = INTRO_SECONDS;
  for (let r = 1; r <= reps; r++) {
    const stepIndex = (r - 1) % activity.steps.length;
    phases.push({ kind: 'work', label: workLabel, duration: hold, stepIndex, rep: r, totalReps: reps, start: t, end: t + hold });
    t += hold;
    phases.push({ kind: 'release', label: 'RELEASE', duration: RELEASE_SECONDS, stepIndex, rep: r, totalReps: reps, start: t, end: t + RELEASE_SECONDS });
    t += RELEASE_SECONDS;
  }
  phases.push({ kind: 'outro', label: 'REST', duration: OUTRO_SECONDS, stepIndex: activity.steps.length - 1, rep: null, totalReps: reps, start: t, end: t + OUTRO_SECONDS });

  return { phases, totalSeconds: t + OUTRO_SECONDS, reps, continuous: false, stepCount: activity.steps.length, holdSeconds: hold };
}

export interface PhasePosition {
  phase: SessionPhase;
  phaseIndex: number;
  /** seconds inside the current phase */
  phaseElapsed: number;
  /** seconds left in the current phase */
  phaseRemaining: number;
  /** 0..1 ring progress within the phase */
  progress: number;
  /** resolved cue step (continuous timers slice the work window) */
  stepIndex: number;
  /** whole seconds remaining for the countdown numeral */
  countdown: number;
}

/** Locate the timeline position for an elapsed-seconds value (clamped). */
export function phaseAt(plan: SessionPlan, elapsed: number): PhasePosition {
  const e = Math.min(Math.max(elapsed, 0), plan.totalSeconds - 0.001);
  let idx = plan.phases.findIndex((p) => e < p.end);
  if (idx === -1) idx = plan.phases.length - 1;
  const phase = plan.phases[idx];
  const phaseElapsed = e - phase.start;
  const phaseRemaining = Math.max(0, phase.end - e);

  let stepIndex = phase.stepIndex;
  if (plan.continuous && phase.kind === 'work') {
    stepIndex = Math.min(plan.stepCount - 1, Math.floor((phaseElapsed / phase.duration) * plan.stepCount));
  }

  return {
    phase,
    phaseIndex: idx,
    phaseElapsed,
    phaseRemaining,
    progress: Math.min(1, phaseElapsed / phase.duration),
    stepIndex,
    countdown: Math.max(0, Math.ceil(phaseRemaining)),
  };
}

/** Center eyebrow label — continuous timers announce the step window instead. */
export function phaseLabel(plan: SessionPlan, pos: PhasePosition): string {
  if (plan.continuous && pos.phase.kind === 'work') return `STEP ${pos.stepIndex + 1} OF ${plan.stepCount}`;
  return pos.phase.label;
}
