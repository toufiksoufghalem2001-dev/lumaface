/**
 * LumaFace plan builder — deterministic 28-day plan generation + weekly
 * check-in adjustment (program.md "Day composition rules", checkin.md).
 *
 * The rules engine (lib/rules.ts) is the ONLY safety gate: every activity
 * placed by this module has already passed `SafetyEvaluation`. Contradicted
 * items are substituted silently from the relaxation pool (program.md §W3).
 */

import { ACTIVITY_BY_ID, RELAXATION_POOL_IDS, type Activity } from '@/data/activities';
import { CHECK_IN_DAYS, programDay, weekOfDay, type WeekId } from '@/data/program';
import { RULE_VERSION, type Inventory, type SafetyEvaluation } from '@/lib/rules';

/* ── Types ─────────────────────────────────────────────────────────────── */

/** Onboarding-collected profile (persisted as lf_profile). */
export interface UserProfile {
  name?: string;
  /** up to 3 goal ids (data/content.ts GOALS) */
  goals: string[];
  /** daily ritual budget in minutes */
  routineTime: 3 | 5 | 10;
  budgetMode: 'none' | 'affordable' | 'standard' | 'premium';
  adultConfirmed: boolean;
  climate?: 'dry' | 'temperate' | 'humid';
  outdoorTime?: 'indoors' | 'some' | 'lots';
}

/** One item inside a plan day (design.md §8.2). */
export interface PlanItem {
  activityId: string;
  required: boolean;
}

/** A single program day. */
export interface PlanDay {
  day: number; // 1–28
  week: WeekId;
  /** estimated MINUTES for the morning ritual (PM cleanse is the evening habit) */
  estimatedMinutes: number;
  items: PlanItem[];
  focusLine: string;
  isCheckInDay: boolean;
  /** one sentence from the plan engine (program.md Day Sheet "Why line") */
  whyLine?: string;
}

/** The 28-day personalized plan (design.md §8.2). */
export interface Plan {
  planId: string;
  ruleVersion: string;
  goals: string[];
  createdAt: string;
  days: PlanDay[];
  warnings: string[];
  nextCheckInDay: number;
}

/** Check-in answers that drive adjustment (checkin.md). */
export interface CheckInInput {
  /** the check-in day just completed: 7 | 14 | 21 | 28 */
  day: number;
  comfortRating: 1 | 2 | 3;
  irritationFlag: boolean;
  adherenceSelfReport: 'all' | 'most' | 'some' | 'few';
}

/** One row of a plan diff. */
export interface PlanDiffEntry {
  activityId: string;
  reason?: string;
}

/** The visible weekly-adjustment summary (design.md §7.15). */
export interface PlanDiff {
  paused: PlanDiffEntry[];
  kept: PlanDiffEntry[];
  added: PlanDiffEntry[];
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const AM_BASICS = ['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen'] as const;
const PM_CLEANSE = 'pm-cleanse-unwind';
const MASSAGE_DAYS_W2 = [8, 11, 13] as const;

/** W3 "one targeted addition" mapped from the user's top goal (program.md). */
const GOAL_TARGET_MAP: Record<string, string[]> = {
  puffiness: ['morning-depuff-glide'],
  tension: ['brow-tension-awareness', 'temple-relaxation'],
  consistency: ['controlled-smile'],
  'healthy-skin': ['controlled-smile'],
  'fine-lines': ['one-active-intro'],
  blemishes: ['one-active-intro'],
  'uneven-tone': ['one-active-intro'],
  shine: ['one-active-intro'],
  'dryness-comfort': ['gentle-facial-massage'],
};

const FALLBACK_TARGET = ['controlled-smile'];

/* ── Helpers ───────────────────────────────────────────────────────────── */

function act(id: string): Activity {
  const a = ACTIVITY_BY_ID.get(id);
  if (!a) throw new Error(`Unknown activityId in plan builder: ${id}`);
  return a;
}

/** Relaxation pool filtered through the safety evaluation (never empty). */
function relaxationPool(evalResult: SafetyEvaluation): string[] {
  const pool = RELAXATION_POOL_IDS.filter((id) => !evalResult.excludedActivityIds.includes(id));
  return pool.length > 0 ? [...pool] : ['neutral-jaw-rest'];
}

/** Substitute an excluded activity with the pool item for that day slot. */
function substitute(id: string, evalResult: SafetyEvaluation, pool: string[], slot: number): string {
  if (!evalResult.excludedActivityIds.includes(id)) return id;
  return pool[slot % pool.length];
}

/** Guided-seconds cap for a day: AM basics occupy ~2 of the ritual minutes. */
function guidedCapSeconds(routineTime: 3 | 5 | 10): number {
  return (routineTime - 2) * 60;
}

/**
 * Place guided items within the day's seconds cap. An item that doesn't fit
 * is swapped for the shortest pool item (silent substitution).
 */
function fitGuided(ids: string[], evalResult: SafetyEvaluation, routineTime: 3 | 5 | 10, slotSeed: number): string[] {
  const pool = relaxationPool(evalResult);
  const cap = guidedCapSeconds(routineTime);
  const out: string[] = [];
  let used = 0;
  for (const raw of ids) {
    const id = substitute(raw, evalResult, pool, slotSeed + out.length);
    const secs = act(id).durationSeconds;
    if (used + secs <= cap) {
      out.push(id);
      used += secs;
    } else {
      // try the shortest relaxation pool item that fits
      const shortest = [...pool].sort((a, b) => act(a).durationSeconds - act(b).durationSeconds)[0];
      if (used + act(shortest).durationSeconds <= cap && !out.includes(shortest)) {
        out.push(shortest);
        used += act(shortest).durationSeconds;
      }
    }
  }
  // never leave a day without a guided moment
  if (out.length === 0) {
    const shortest = [...pool].sort((a, b) => act(a).durationSeconds - act(b).durationSeconds)[0];
    out.push(shortest);
  }
  return out;
}

/** Morning-ritual estimate in minutes (PM cleanse is the evening habit). */
function estimateMinutes(guidedIds: string[]): number {
  const secs = AM_BASICS.reduce((s, id) => s + act(id).durationSeconds, 0) +
    guidedIds.reduce((s, id) => s + act(id).durationSeconds, 0);
  return Math.max(2, Math.ceil(secs / 60));
}

function makeDay(day: number, guidedIds: string[], focusLine: string, whyLine?: string): PlanDay {
  const base: PlanItem[] = AM_BASICS.map((id) => ({ activityId: id, required: true }));
  if (day % 2 === 1) base.push({ activityId: PM_CLEANSE, required: true }); // alternating evenings
  const items = [...base, ...guidedIds.map((id) => ({ activityId: id, required: false }))];
  return {
    day,
    week: weekOfDay(day),
    estimatedMinutes: estimateMinutes(guidedIds),
    items,
    focusLine,
    isCheckInDay: (CHECK_IN_DAYS as readonly number[]).includes(day),
    whyLine,
  };
}

/** W3 targeted pool for the user's top goal, safety-substituted. */
function targetPoolFor(goals: string[], evalResult: SafetyEvaluation): string[] {
  const top = goals[0];
  const mapped = (top && GOAL_TARGET_MAP[top]) || FALLBACK_TARGET;
  const pool = relaxationPool(evalResult);
  const filtered = mapped.map((id) => (evalResult.excludedActivityIds.includes(id) ? pool[0] : id));
  return filtered.length > 0 ? filtered : pool;
}

/* ── buildPlan ─────────────────────────────────────────────────────────── */

/**
 * Build the deterministic 28-day plan.
 * - AM skincare slots daily (Tier A); PM cleanse on alternating evenings.
 * - W1 Reset: no massage, no movement, no tools — one relaxation item daily.
 * - W2 Consistency: massage D8/D11/D13 (budget permitting), shoulder reset or
 *   de-puff glide (puffiness plans) on other days.
 * - W3 Target: ONE goal-mapped addition, never more than one new item;
 *   contraindicated items substituted silently.
 * - W4 Review: maintains the W3 combination.
 * - Rotation rule: no identical non-skincare set on consecutive days; every
 *   day stays within the 3/5/10-minute budget.
 */
export function buildPlan(profile: UserProfile, safetyEval: SafetyEvaluation, inventory: Inventory): Plan {
  const pool = relaxationPool(safetyEval);
  const days: PlanDay[] = [];
  const puffinessPlan = profile.goals.includes('puffiness');
  const targetPool = targetPoolFor(profile.goals, safetyEval);

  for (let day = 1; day <= 28; day++) {
    const week = weekOfDay(day);
    const tpl = programDay(day);
    let guided: string[];
    let focus = tpl.focusLine;
    let why: string | undefined;

    if (week === 1) {
      guided = fitGuided([pool[(day - 1) % pool.length]], safetyEval, profile.routineTime, day);
      if (day === 7) why = 'Check-in day — your plan adjusts from your answers.';
    } else if (week === 2) {
      if ((MASSAGE_DAYS_W2 as readonly number[]).includes(day)) {
        guided = fitGuided(['gentle-facial-massage'], safetyEval, profile.routineTime, day);
        if (guided.includes('gentle-facial-massage')) {
          focus = 'Massage returns — light strokes, slow breath';
          why = 'Massage returns today because Week 1 stayed comfortable.';
        }
        if (puffinessPlan && guided.includes('morning-depuff-glide') === false) {
          // 10-min budgets: add the de-puff glide alongside massage
          const withGlide = fitGuided([...guided, 'morning-depuff-glide'], safetyEval, profile.routineTime, day);
          if (withGlide.length > guided.length) guided = withGlide;
        }
      } else if (puffinessPlan && day !== 14) {
        const pick = day % 2 === 0 ? 'morning-depuff-glide' : pool[day % pool.length];
        guided = fitGuided([pick], safetyEval, profile.routineTime, day);
        focus = pick === 'morning-depuff-glide' ? 'A gentle glide for puffy mornings' : tpl.focusLine;
      } else {
        guided = fitGuided(['shoulder-reset'], safetyEval, profile.routineTime, day);
      }
      if (day === 14) why = 'Check-in day — and a first comparable capture, if you like.';
    } else if (week === 3) {
      const target = targetPool[(day - 15) % targetPool.length];
      const extra = profile.routineTime === 10 ? pool[(day - 15) % pool.length] : null;
      guided = fitGuided(extra && extra !== target ? [target, extra] : [target], safetyEval, profile.routineTime, day);
      focus = `One focused addition — ${act(target).title.toLowerCase()}`;
      why = 'Your top goal joins today — one addition, watched kindly.';
      if (day === 21) why = 'Check-in day — your plan adjusts from your answers.';
    } else {
      const target = targetPool[(day - 22) % targetPool.length];
      const rotate = pool[(day - 22) % pool.length];
      const picks = day % 2 === 0 ? [target] : [rotate];
      guided = fitGuided(picks, safetyEval, profile.routineTime, day);
      why = 'Your best rhythm, held steady.';
      if (day === 28) why = 'Final check-in — gather your week, and look back kindly.';
    }

    days.push(makeDay(day, guided, focus, why));
  }

  const warnings = safetyEval.warnings.map((w) => w.message);
  if (inventory.products.includes('retinoid') && inventory.products.includes('acids')) {
    warnings.push('Strong actives work best introduced one at a time — your plan paces them.');
  }
  if (profile.outdoorTime === 'lots') {
    warnings.push('Lots of sun — your plan leans harder on SPF and reapply reminders.');
  }

  return {
    planId: `plan_28d_${Date.now().toString(36)}`,
    ruleVersion: RULE_VERSION,
    goals: [...profile.goals],
    createdAt: new Date().toISOString(),
    days,
    warnings,
    nextCheckInDay: 7,
  };
}

/* ── adjustPlanAfterCheckIn ────────────────────────────────────────────── */

/**
 * Adjust the plan after a weekly check-in (checkin.md):
 * - irritationFlag → SAFE-IRR-01 barrier-reset branch: massage/movement/actives
 *   pause; Barrier Reset + Neutral Jaw Rest carry the next 5–7 days.
 * - comfort 3 or adherence some/few → next week trims toward the essentials.
 * - comfortable + adherent → the plan keeps its gentle course.
 * Returns the new plan plus the visible diff (the check-in reward).
 */
export function adjustPlanAfterCheckIn(
  plan: Plan,
  checkIn: CheckInInput,
  safetyEval: SafetyEvaluation,
): { plan: Plan; diff: PlanDiff } {
  const from = checkIn.day + 1;
  const to = Math.min(checkIn.day + 7, 28);
  const pool = relaxationPool(safetyEval);
  const trimmed = checkIn.irritationFlag || checkIn.comfortRating === 3 ||
    checkIn.adherenceSelfReport === 'some' || checkIn.adherenceSelfReport === 'few';

  const newDays = plan.days.map((d) => ({ ...d, items: [...d.items] }));

  for (const day of newDays) {
    if (day.day < from || day.day > to) continue;

    let nextIds: string[];
    if (checkIn.irritationFlag) {
      // Barrier-reset branch — the calm trio + jaw rest, nothing else.
      nextIds = [
        ...AM_BASICS,
        ...(day.day % 2 === 1 ? [PM_CLEANSE] : []),
        'barrier-reset',
        pool.includes('neutral-jaw-rest') ? 'neutral-jaw-rest' : pool[0],
      ];
      day.focusLine = 'A quieter week — your calm trio carries it';
      day.whyLine = 'Strong actives, massage and movement pause while skin settles.';
    } else if (trimmed) {
      // Trim toward the 3-minute essentials — a ritual you keep beats one you quit.
      const keepRelax = pool[(day.day - 1) % pool.length];
      nextIds = [...AM_BASICS, ...(day.day % 2 === 1 ? [PM_CLEANSE] : []), keepRelax];
      day.focusLine = 'A smaller, kinder week — essentials plus one quiet moment';
      day.whyLine = 'Trimmed to fit your week — smaller, not harder.';
    } else {
      continue; // comfortable & adherent: keep the day untouched
    }

    // rebuild items, preserving required flags for basics
    day.items = nextIds.map((id) => ({ activityId: id, required: (AM_BASICS as readonly string[]).includes(id) || id === PM_CLEANSE || id === 'barrier-reset' }));
    day.estimatedMinutes = estimateMinutes(nextIds.filter((id) => !(AM_BASICS as readonly string[]).includes(id) && id !== PM_CLEANSE));
  }

  // Diff = old window items vs new window items (order-stable, deduped).
  const oldWindow = plan.days.filter((d) => d.day >= from && d.day <= to);
  const newWindow = newDays.filter((d) => d.day >= from && d.day <= to);
  const oldSet = [...new Set(oldWindow.flatMap((d) => d.items.map((i) => i.activityId)))];
  const newSet = [...new Set(newWindow.flatMap((d) => d.items.map((i) => i.activityId)))];

  const paused: PlanDiffEntry[] = oldSet
    .filter((id) => !newSet.includes(id))
    .map((id) => ({
      activityId: id,
      reason: checkIn.irritationFlag
        ? id === 'one-active-intro'
          ? 'Paused — actives rest while the barrier resets'
          : 'Paused — stepped back while skin settles'
        : 'Paused — trimmed to fit your week',
    }));
  const kept: PlanDiffEntry[] = newSet
    .filter((id) => oldSet.includes(id))
    .map((id) => ({ activityId: id }));
  const added: PlanDiffEntry[] = newSet
    .filter((id) => !oldSet.includes(id))
    .map((id) => ({
      activityId: id,
      reason: id === 'barrier-reset' ? 'Your calm trio, for 5 quiet days' : 'One small new moment',
    }));

  const warnings = [...plan.warnings];
  if (checkIn.irritationFlag) {
    const msg = 'Your skin is asking for a quieter week — Barrier Reset carries your plan, and no new actives join in.';
    if (!warnings.includes(msg)) warnings.push(msg);
  }

  const newPlan: Plan = {
    ...plan,
    days: newDays,
    warnings,
    nextCheckInDay: Math.min(checkIn.day + 7, 28),
  };

  return { plan: newPlan, diff: { paused, kept, added } };
}

/* ── Read helpers (used by Today / Program screens) ────────────────────── */

/** Activity ids for a plan day, basics first. */
export function planDayActivityIds(plan: Plan, day: number): string[] {
  const d = plan.days.find((x) => x.day === day);
  return d ? d.items.map((i) => i.activityId) : [];
}

/** Total activities ("moments") in a plan day. */
export function planDayMomentCount(plan: Plan, day: number): number {
  const d = plan.days.find((x) => x.day === day);
  return d ? d.items.length : 0;
}
