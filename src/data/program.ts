/**
 * LumaFace 28-day program — static structure per program.md "Day composition
 * rules" (the rules engine in lib/plan.ts personalizes from this template).
 *
 * Weeks: W1 Reset (D1–7) · W2 Consistency (D8–14) · W3 Target (D15–21) ·
 * W4 Review (D22–28). Check-in days: 7, 14, 21, 28.
 */

/** Days that host a weekly check-in. */
export const CHECK_IN_DAYS = [7, 14, 21, 28] as const;

export type WeekId = 1 | 2 | 3 | 4;

export interface WeekDef {
  week: WeekId;
  name: 'Reset' | 'Consistency' | 'Target' | 'Review';
  /** day range, inclusive */
  days: [number, number];
  /** week header tint (program.md §2) */
  tint: string;
  intent: string;
  expectations: string;
}

export const WEEKS: WeekDef[] = [
  {
    week: 1,
    name: 'Reset',
    days: [1, 7],
    tint: '#EBF5F2',
    intent:
      'A safe baseline: cleanse, moisturize, protect, and two minutes of relaxation. No aggressive tools, nothing new all at once.',
    expectations:
      "You'll build the habit and a calm baseline. Skin often feels more comfortable simply from consistent gentle care (Tier A).",
  },
  {
    week: 2,
    name: 'Consistency',
    days: [8, 14],
    tint: '#F7F0E2',
    intent:
      'The routine, kept. Three gentle massage sessions and a posture reset join in. First comparable capture, if you like.',
    expectations:
      "Massage may temporarily ease the look of morning puffiness; most people describe this week as 'relaxing' more than 'transforming' (Tier B).",
  },
  {
    week: 3,
    name: 'Target',
    days: [15, 21],
    tint: '#F6E9E5',
    intent:
      'One goal-focused addition joins your core routine — introduced alone, watched closely.',
    expectations:
      'Your targeted addition is experimental — enjoy the practice; expect no reshaping. Evidence for face movement is preliminary (Tier C).',
  },
  {
    week: 4,
    name: 'Review',
    days: [22, 28],
    tint: '#FBEFF1',
    intent:
      'Hold the routine steady, gather your week, and look back kindly. Your next 28 days take shape.',
    expectations:
      'Review is about habits and how your skin feels — and, if you opted in, a same-conditions photo compare. Visible change, when it happens, is slow and personal.',
  },
];

/** Week number for a given program day (1–28). */
export function weekOfDay(day: number): WeekId {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export interface ProgramDayTemplate {
  day: number;
  week: WeekId;
  /** base (pre-personalization) activity ids — AM basics always first */
  activityIds: string[];
  estMin: number;
  focusLine: string;
  isCheckInDay: boolean;
}

const AM_BASICS = ['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen'];
const PM_CLEANSE = 'pm-cleanse-unwind';
/** W1 relaxation rotation (program.md) */
const W1_RELAXATION_ROTATION = ['neutral-jaw-rest', 'soft-eye-relaxation', 'smile-release'];
/** W2 massage days (program.md) */
const W2_MASSAGE_DAYS = [8, 11, 13];

const FOCUS_W1 = [
  'A gentle beginning — basics, and your jaw at rest',
  'Cleanse, protect, and a soft moment for tired eyes',
  'Keep it small — basics plus a real, small smile',
  'The same kind basics — comfort is the point',
  'Basics, then thirty quiet seconds for your jaw',
  'A calm repeat — protect, then rest your eyes',
  'Week one, gathered — basics, a smile, and your check-in',
];

/**
 * The 28-day default template (5-minute baseline, no goals applied).
 * lib/plan.ts filters/substitutes through the safety evaluation and reshapes
 * W2–W4 around goals and the routine-time budget. Free tier unlocks D1–3.
 */
export const PROGRAM: ProgramDayTemplate[] = Array.from({ length: 28 }, (_, i) => {
  const day = i + 1;
  const week = weekOfDay(day);
  const isCheckInDay = (CHECK_IN_DAYS as readonly number[]).includes(day);

  // AM basics daily; PM cleanse on alternating (odd) evenings.
  const base = day % 2 === 1 ? [...AM_BASICS, PM_CLEANSE] : [...AM_BASICS];

  let activityIds: string[];
  let focusLine: string;
  let estMin: number;

  if (week === 1) {
    const relax = W1_RELAXATION_ROTATION[i % W1_RELAXATION_ROTATION.length];
    activityIds = [...base, relax];
    focusLine = FOCUS_W1[i];
    estMin = 5;
  } else if (week === 2) {
    if (W2_MASSAGE_DAYS.includes(day)) {
      activityIds = [...base, 'gentle-facial-massage'];
      focusLine = 'Massage returns — light strokes, slow breath';
      estMin = 5;
    } else {
      activityIds = [...base, 'shoulder-reset'];
      focusLine = 'The routine, kept — plus a shoulder reset';
      estMin = 4;
    }
  } else if (week === 3) {
    // Default target (no goals): gentle movement awareness, alternated.
    const target = day % 2 === 1 ? 'controlled-smile' : 'neutral-jaw-rest';
    activityIds = [...base, 'gentle-facial-massage', target];
    focusLine = 'One focused addition, watched kindly';
    estMin = 7;
  } else {
    const rotate = W1_RELAXATION_ROTATION[i % W1_RELAXATION_ROTATION.length];
    activityIds = [...base, 'gentle-facial-massage', rotate];
    focusLine = day === 28 ? 'Day 28 — hold steady, look back kindly' : 'Hold the routine steady';
    estMin = 7;
  }

  return { day, week, activityIds, estMin, focusLine, isCheckInDay };
});

/** Template lookup by day number (1–28). */
export function programDay(day: number): ProgramDayTemplate {
  return PROGRAM[Math.min(Math.max(day, 1), 28) - 1];
}
