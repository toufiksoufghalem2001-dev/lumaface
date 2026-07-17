/**
 * LumaFace rules engine — the ONLY safety gate (spec Appendix B).
 *
 * Pure, deterministic functions. Activities declare their rule codes in
 * `contraindicationCodes` (data/activities.ts); this module evaluates the
 * user's answers + inventory against all 8 Appendix-B rules and produces the
 * authoritative exclusion list, warnings and professional-care referrals.
 * The plan builder (lib/plan.ts) and every screen must consume THIS output —
 * never re-implement rule logic.
 */

import { ACTIVITIES } from '@/data/activities';

/** Bump when rule logic changes; stored on every plan/safety record. */
export const RULE_VERSION = '2026.07.1';

/* ── Types ─────────────────────────────────────────────────────────────── */

export type SafeRuleCode =
  | 'SAFE-PREG-RET'
  | 'SAFE-EYE-01'
  | 'SAFE-FACE-01'
  | 'SAFE-PROC-01'
  | 'SAFE-SKIN-01'
  | 'SAFE-IRR-01'
  | 'SAFE-JAW-01'
  | 'SAFE-BODY-01';

export const ALL_RULE_CODES: SafeRuleCode[] = [
  'SAFE-PREG-RET',
  'SAFE-EYE-01',
  'SAFE-FACE-01',
  'SAFE-PROC-01',
  'SAFE-SKIN-01',
  'SAFE-IRR-01',
  'SAFE-JAW-01',
  'SAFE-BODY-01',
];

/**
 * Safety screening answers. The 7 boolean fields map 1:1 to the onboarding
 * questions (data/content.ts SAFETY_QUESTIONS, spec §4.1). The optional acute
 * flags are set by other flows (check-in / coach), never by onboarding:
 * - `suddenFacialWeakness` → SAFE-FACE-01 (acute emergency, stop program)
 * - `activeIrritation`     → SAFE-IRR-01 (from check-in irritation reports)
 * - `bodyHarmingRequest`   → SAFE-BODY-01 (from coach input classification)
 */
export interface SafetyAnswers {
  /** known skincare/cosmetic allergies */
  allergies: boolean;
  /** products often sting, burn or flush */
  sensitiveSkin: boolean;
  pregnantOrTrying: boolean;
  /** procedure/injectables in the last few months */
  recentProcedure: boolean;
  /** incl. jaw (TMJ) pain or history of facial nerve issues */
  facialPainOrNerve: boolean;
  openWoundOrInfection: boolean;
  /** eye pain, vision changes, recent eye injury */
  eyeSymptoms: boolean;
  /** ACUTE: sudden facial weakness (stop program, urgent referral) */
  suddenFacialWeakness?: boolean;
  /** ACUTE: burning / escalating irritation (from check-in) */
  activeIrritation?: boolean;
  /** ACUTE: starvation/dehydration request (from coach) */
  bodyHarmingRequest?: boolean;
}

/** Onboarding Step 3 inventory — categories only, never brands. */
export interface Inventory {
  /** product ids from INVENTORY_OPTIONS (e.g. 'retinoid', 'acids') */
  products: string[];
  /** skin's history with new products */
  reactsToNew: 'usually-fine' | 'sometimes-reacts' | 'often-reacts' | null;
}

/** A calm, kind warning surfaced in plan/UI copy. */
export interface SafetyWarning {
  code: SafeRuleCode;
  message: string;
}

/** A professional-care referral (SafetyBox.urgent content). */
export interface SafetyReferral {
  code: SafeRuleCode;
  message: string;
  urgent: boolean;
}

/** Authoritative output of the rules engine. */
export interface SafetyEvaluation {
  ruleVersion: string;
  /** every rule that fired */
  contraindicationCodes: SafeRuleCode[];
  /** activities the plan must NOT include */
  excludedActivityIds: string[];
  warnings: SafetyWarning[];
  referrals: SafetyReferral[];
  /** true when retinoid education was excluded due to pregnancy (SAFE-PREG-RET) */
  pregnancyRetinoidExcluded: boolean;
}

export const EMPTY_SAFETY_ANSWERS: SafetyAnswers = {
  allergies: false,
  sensitiveSkin: false,
  pregnantOrTrying: false,
  recentProcedure: false,
  facialPainOrNerve: false,
  openWoundOrInfection: false,
  eyeSymptoms: false,
  suddenFacialWeakness: false,
  activeIrritation: false,
  bodyHarmingRequest: false,
};

export const EMPTY_INVENTORY: Inventory = { products: [], reactsToNew: null };

/* ── Rule metadata (human-readable, kind copy) ─────────────────────────── */

export const RULE_META: Record<SafeRuleCode, { name: string; summary: string }> = {
  'SAFE-PREG-RET': {
    name: 'Retinoids & pregnancy',
    summary: 'Pregnant or trying + retinoid in routine → retinoid education is excluded; pregnancy-safe professional guidance is shown.',
  },
  'SAFE-EYE-01': {
    name: 'Eye symptoms',
    summary: 'Vision change, eye pain or injury → eye-area activities stop; professional-care guidance is suggested.',
  },
  'SAFE-FACE-01': {
    name: 'Sudden facial weakness',
    summary: 'Sudden facial weakness → the program stops; urgent professional-care guidance is shown.',
  },
  'SAFE-PROC-01': {
    name: 'Recent procedure or injectables',
    summary: 'Recent procedure/injectable → massage and movement wait for practitioner clearance.',
  },
  'SAFE-SKIN-01': {
    name: 'Open wound or infection',
    summary: 'Open wound/infection → massage, gua sha and movement over the area are excluded.',
  },
  'SAFE-IRR-01': {
    name: 'Escalating irritation',
    summary: 'Burning or escalating irritation → barrier reset; no new actives; professional review if persistent.',
  },
  'SAFE-JAW-01': {
    name: 'Jaw pain or painful click',
    summary: 'Painful click or jaw pain → opening/resistance items are excluded; relaxation-only or referral.',
  },
  'SAFE-BODY-01': {
    name: 'Harmful body requests',
    summary: 'Starvation/dehydration requests → refused; redirected to healthy, non-restrictive care.',
  },
};

/* ── Engine ────────────────────────────────────────────────────────────── */

/** Ids of activities that declare a given rule code. */
function activitiesWithCode(code: SafeRuleCode): string[] {
  return ACTIVITIES.filter((a) => a.contraindicationCodes.includes(code)).map((a) => a.activityId);
}

/**
 * Evaluate all 8 Appendix-B rules. Pure & deterministic.
 *
 * @param answers   safety answers (onboarding + optional acute flags)
 * @param inventory product categories the user currently uses
 */
export function evaluateSafety(answers: SafetyAnswers, inventory: Inventory): SafetyEvaluation {
  const codes = new Set<SafeRuleCode>();
  const excluded = new Set<string>();
  const warnings: SafetyWarning[] = [];
  const referrals: SafetyReferral[] = [];

  /* SAFE-FACE-01 — sudden facial weakness: stop the program, urgent referral.
     Excludes every non-skincare activity (all manipulation/movement); Tier A
     skincare basics and Barrier Reset stay available — gentle cleansing is
     not the risk, facial manipulation is. */
  if (answers.suddenFacialWeakness === true) {
    codes.add('SAFE-FACE-01');
    for (const a of ACTIVITIES) {
      if (a.category !== 'skincare') excluded.add(a.activityId);
    }
    warnings.push({
      code: 'SAFE-FACE-01',
      message: 'Your program is paused. Sudden facial weakness deserves a person, not an app.',
    });
    referrals.push({
      code: 'SAFE-FACE-01',
      message:
        'Sudden facial weakness, one-sided drooping, or new one-sided movement — please seek urgent medical care now. Guidance is always in Help.',
      urgent: true,
    });
  }

  /* SAFE-EYE-01 — vision change / eye pain / injury: stop eye activities. */
  if (answers.eyeSymptoms) {
    codes.add('SAFE-EYE-01');
    for (const id of activitiesWithCode('SAFE-EYE-01')) excluded.add(id);
    warnings.push({
      code: 'SAFE-EYE-01',
      message: 'Eye-area activities stay off your plan while eye symptoms are present.',
    });
    referrals.push({
      code: 'SAFE-EYE-01',
      message:
        'Eye pain, vision changes, or a recent eye injury deserve a qualified professional. Eye-area activities will wait.',
      urgent: false,
    });
  }

  /* SAFE-PROC-01 — recent procedure/injectable: suspend massage & movement. */
  if (answers.recentProcedure) {
    codes.add('SAFE-PROC-01');
    for (const id of activitiesWithCode('SAFE-PROC-01')) excluded.add(id);
    warnings.push({
      code: 'SAFE-PROC-01',
      message:
        'Massage and movement wait until your practitioner says go — skincare basics stay.',
    });
  }

  /* SAFE-SKIN-01 — open wound/infection: no massage/gua sha/movement over area. */
  if (answers.openWoundOrInfection) {
    codes.add('SAFE-SKIN-01');
    for (const id of activitiesWithCode('SAFE-SKIN-01')) excluded.add(id);
    warnings.push({
      code: 'SAFE-SKIN-01',
      message: 'Massage, gua sha and glide work pause while skin heals — nothing touches broken or infected skin.',
    });
  }

  /* SAFE-JAW-01 — painful click / jaw pain / facial nerve history: relaxation only. */
  if (answers.facialPainOrNerve) {
    codes.add('SAFE-JAW-01');
    for (const id of activitiesWithCode('SAFE-JAW-01')) excluded.add(id);
    warnings.push({
      code: 'SAFE-JAW-01',
      message: 'Jaw work becomes relaxation-only — Neutral Jaw Rest is your home base.',
    });
    referrals.push({
      code: 'SAFE-JAW-01',
      message:
        'Jaw pain, a painful click, or locking that persists deserves a dentist or doctor. Relaxation items stay available meanwhile.',
      urgent: false,
    });
  }

  /* SAFE-PREG-RET — pregnant/trying + retinoid: exclude retinoid education. */
  const hasRetinoid = inventory.products.includes('retinoid');
  const pregnancyRetinoidExcluded = answers.pregnantOrTrying && hasRetinoid;
  if (pregnancyRetinoidExcluded) {
    codes.add('SAFE-PREG-RET');
    for (const id of activitiesWithCode('SAFE-PREG-RET')) excluded.add(id);
    warnings.push({
      code: 'SAFE-PREG-RET',
      message:
        "Because you're pregnant or trying, retinoid education is swapped for pregnancy-safe alternatives — and it's worth confirming your routine with your clinician.",
    });
  }

  /* SAFE-IRR-01 — burning/escalating irritation (check-in driven): barrier reset. */
  if (answers.activeIrritation === true) {
    codes.add('SAFE-IRR-01');
    // Massage & movement step back to pure relaxation; no new actives.
    for (const a of ACTIVITIES) {
      if (a.category === 'massage' || a.category === 'movement') excluded.add(a.activityId);
    }
    for (const id of activitiesWithCode('SAFE-PREG-RET')) excluded.add(id); // one-active-intro pauses
    warnings.push({
      code: 'SAFE-IRR-01',
      message: 'Your skin is asking for a quieter week — Barrier Reset carries your plan, and no new actives join in.',
    });
    referrals.push({
      code: 'SAFE-IRR-01',
      message:
        'If symptoms persist beyond a week, feel severe, or worry you — please see a qualified professional.',
      urgent: false,
    });
  }

  /* SAFE-BODY-01 — starvation/dehydration requests: refuse + redirect. */
  if (answers.bodyHarmingRequest === true) {
    codes.add('SAFE-BODY-01');
    warnings.push({
      code: 'SAFE-BODY-01',
      message:
        "LumaFace will never suggest restricting food or water to change your face — that's harmful, and it doesn't work. We're here for healthy, gentle care instead.",
    });
    referrals.push({
      code: 'SAFE-BODY-01',
      message:
        'If eating, drinking, or how you feel about your body is weighing on you, a qualified professional can genuinely help. Kind guidance is in Help.',
      urgent: false,
    });
  }

  return {
    ruleVersion: RULE_VERSION,
    contraindicationCodes: ALL_RULE_CODES.filter((c) => codes.has(c)),
    excludedActivityIds: ACTIVITIES.map((a) => a.activityId).filter((id) => excluded.has(id)),
    warnings,
    referrals,
    pregnancyRetinoidExcluded,
  };
}

/** True when an activity is excluded by the evaluation. */
export function isExcluded(evalResult: SafetyEvaluation, activityId: string): boolean {
  return evalResult.excludedActivityIds.includes(activityId);
}

/** Conservative default when safety screening was skipped: relaxation + Tier A
 *  basics only (onboarding.md). Returns an evaluation that excludes everything
 *  except skincare basics + the relaxation pool. */
export function conservativeSafetyEvaluation(): SafetyEvaluation {
  const keep = new Set(['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen', 'pm-cleanse-unwind', 'barrier-reset', 'neutral-jaw-rest', 'soft-eye-relaxation', 'smile-release']);
  return {
    ruleVersion: RULE_VERSION,
    contraindicationCodes: [],
    excludedActivityIds: ACTIVITIES.map((a) => a.activityId).filter((id) => !keep.has(id)),
    warnings: [
      {
        code: 'SAFE-SKIN-01',
        message: 'Answer 7 quick safety questions anytime to unlock your full plan — until then, your plan stays extra gentle.',
      },
    ],
    referrals: [],
    pregnancyRetinoidExcluded: false,
  };
}
