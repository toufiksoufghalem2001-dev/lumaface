/**
 * Rules engine tests — ≥1 trigger + ≥1 non-trigger case per Appendix-B rule,
 * plus the "safety content is never excluded/paywalled" guarantee.
 * Run: npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateSafety,
  conservativeSafetyEvaluation,
  EMPTY_SAFETY_ANSWERS,
  EMPTY_INVENTORY,
  RULE_VERSION,
  ALL_RULE_CODES,
  type SafetyAnswers,
  type Inventory,
} from '@/lib/rules';
import { ACTIVITIES, FREE_ACTIVITY_IDS, RELAXATION_POOL_IDS, getActivity } from '@/data/activities';

function answers(patch: Partial<SafetyAnswers> = {}): SafetyAnswers {
  return { ...EMPTY_SAFETY_ANSWERS, ...patch };
}
function inventory(patch: Partial<Inventory> = {}): Inventory {
  return { ...EMPTY_INVENTORY, ...patch };
}

describe('catalog integrity', () => {
  it('has exactly 24 activities, 8 of them free', () => {
    expect(ACTIVITIES).toHaveLength(24);
    expect(ACTIVITIES.filter((a) => a.free)).toHaveLength(8);
    expect(ACTIVITIES.filter((a) => a.free).map((a) => a.activityId).sort()).toEqual(
      [...FREE_ACTIVITY_IDS].sort(),
    );
  });

  it('every declared contraindication code is a known Appendix-B rule', () => {
    for (const a of ACTIVITIES) {
      for (const code of a.contraindicationCodes) {
        expect(ALL_RULE_CODES).toContain(code);
      }
    }
  });

  it('stamps the current rule version', () => {
    expect(evaluateSafety(answers(), inventory()).ruleVersion).toBe(RULE_VERSION);
  });
});

describe('SAFE-PREG-RET — pregnancy + retinoid', () => {
  it('TRIGGER: pregnant/trying + retinoid in inventory excludes retinoid education', () => {
    const r = evaluateSafety(answers({ pregnantOrTrying: true }), inventory({ products: ['retinoid'] }));
    expect(r.contraindicationCodes).toContain('SAFE-PREG-RET');
    expect(r.excludedActivityIds).toContain('one-active-intro');
    expect(r.pregnancyRetinoidExcluded).toBe(true);
    expect(r.warnings.some((w) => w.code === 'SAFE-PREG-RET')).toBe(true);
  });

  it('NON-TRIGGER: pregnant without retinoid excludes nothing', () => {
    const r = evaluateSafety(answers({ pregnantOrTrying: true }), inventory({ products: ['cleanser'] }));
    expect(r.contraindicationCodes).not.toContain('SAFE-PREG-RET');
    expect(r.excludedActivityIds).not.toContain('one-active-intro');
    expect(r.pregnancyRetinoidExcluded).toBe(false);
  });

  it('NON-TRIGGER: retinoid without pregnancy excludes nothing', () => {
    const r = evaluateSafety(answers(), inventory({ products: ['retinoid'] }));
    expect(r.contraindicationCodes).not.toContain('SAFE-PREG-RET');
    expect(r.pregnancyRetinoidExcluded).toBe(false);
  });
});

describe('SAFE-EYE-01 — eye symptoms', () => {
  it('TRIGGER: eye symptoms exclude every activity declaring SAFE-EYE-01 + referral', () => {
    const r = evaluateSafety(answers({ eyeSymptoms: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-EYE-01');
    const declared = ACTIVITIES.filter((a) => a.contraindicationCodes.includes('SAFE-EYE-01')).map((a) => a.activityId);
    expect(declared.length).toBeGreaterThan(0);
    for (const id of declared) expect(r.excludedActivityIds).toContain(id);
    expect(r.referrals.some((x) => x.code === 'SAFE-EYE-01')).toBe(true);
  });

  it('NON-TRIGGER: no eye symptoms → nothing excluded for SAFE-EYE-01', () => {
    const r = evaluateSafety(answers(), inventory({ products: ['retinoid'] }));
    expect(r.contraindicationCodes).not.toContain('SAFE-EYE-01');
    expect(r.excludedActivityIds).not.toContain('morning-depuff-glide');
  });
});

describe('SAFE-FACE-01 — sudden facial weakness', () => {
  it('TRIGGER: stops all non-skincare activities with an URGENT referral', () => {
    const r = evaluateSafety(answers({ suddenFacialWeakness: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-FACE-01');
    const nonSkincare = ACTIVITIES.filter((a) => a.category !== 'skincare').map((a) => a.activityId);
    for (const id of nonSkincare) expect(r.excludedActivityIds).toContain(id);
    // skincare basics + barrier reset remain available
    expect(r.excludedActivityIds).not.toContain('barrier-reset');
    expect(r.excludedActivityIds).not.toContain('am-gentle-cleanse');
    const ref = r.referrals.find((x) => x.code === 'SAFE-FACE-01');
    expect(ref?.urgent).toBe(true);
  });

  it('NON-TRIGGER: absent flag → no SAFE-FACE-01', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.contraindicationCodes).not.toContain('SAFE-FACE-01');
    expect(r.excludedActivityIds).not.toContain('gentle-cheek-lift');
  });
});

describe('SAFE-PROC-01 — recent procedure or injectables', () => {
  it('TRIGGER: excludes all activities declaring SAFE-PROC-01 (massage + movement)', () => {
    const r = evaluateSafety(answers({ recentProcedure: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-PROC-01');
    const declared = ACTIVITIES.filter((a) => a.contraindicationCodes.includes('SAFE-PROC-01')).map((a) => a.activityId);
    expect(declared).toContain('gentle-facial-massage');
    expect(declared).toContain('gentle-gua-sha');
    for (const id of declared) expect(r.excludedActivityIds).toContain(id);
    // skincare stays
    expect(r.excludedActivityIds).not.toContain('daily-sunscreen');
  });

  it('NON-TRIGGER: no recent procedure → massage stays', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.excludedActivityIds).not.toContain('gentle-facial-massage');
  });
});

describe('SAFE-SKIN-01 — open wound or infection', () => {
  it('TRIGGER: excludes massage, gua sha and glides over the area', () => {
    const r = evaluateSafety(answers({ openWoundOrInfection: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-SKIN-01');
    expect(r.excludedActivityIds).toContain('gentle-facial-massage');
    expect(r.excludedActivityIds).toContain('gentle-gua-sha');
    expect(r.excludedActivityIds).toContain('morning-depuff-glide');
  });

  it('NON-TRIGGER: clear skin → gua sha stays', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.excludedActivityIds).not.toContain('gentle-gua-sha');
  });
});

describe('SAFE-IRR-01 — burning / escalating irritation', () => {
  it('TRIGGER: massage + movement excluded, actives paused, barrier-reset guidance', () => {
    const r = evaluateSafety(answers({ activeIrritation: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-IRR-01');
    const massageMovement = ACTIVITIES.filter((a) => a.category === 'massage' || a.category === 'movement').map((a) => a.activityId);
    for (const id of massageMovement) expect(r.excludedActivityIds).toContain(id);
    expect(r.excludedActivityIds).toContain('one-active-intro');
    expect(r.excludedActivityIds).not.toContain('barrier-reset');
    expect(r.warnings.some((w) => w.code === 'SAFE-IRR-01')).toBe(true);
  });

  it('NON-TRIGGER: comfortable week → no SAFE-IRR-01', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.contraindicationCodes).not.toContain('SAFE-IRR-01');
  });
});

describe('SAFE-JAW-01 — jaw pain / painful click', () => {
  it('TRIGGER: excludes jaw-declaring items, keeps Neutral Jaw Rest, suggests referral', () => {
    const r = evaluateSafety(answers({ facialPainOrNerve: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-JAW-01');
    expect(r.excludedActivityIds).toContain('controlled-jaw-opening');
    expect(r.excludedActivityIds).toContain('controlled-oo-ee');
    expect(r.excludedActivityIds).toContain('lower-face-release');
    expect(r.excludedActivityIds).not.toContain('neutral-jaw-rest');
    expect(r.referrals.some((x) => x.code === 'SAFE-JAW-01')).toBe(true);
  });

  it('NON-TRIGGER: no jaw pain → jaw opening stays', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.excludedActivityIds).not.toContain('controlled-jaw-opening');
  });
});

describe('SAFE-BODY-01 — starvation/dehydration requests', () => {
  it('TRIGGER: refuses with redirect, excludes no activities', () => {
    const r = evaluateSafety(answers({ bodyHarmingRequest: true }), inventory());
    expect(r.contraindicationCodes).toContain('SAFE-BODY-01');
    expect(r.warnings.some((w) => w.code === 'SAFE-BODY-01')).toBe(true);
    expect(r.referrals.some((x) => x.code === 'SAFE-BODY-01')).toBe(true);
    expect(r.excludedActivityIds).toHaveLength(0);
  });

  it('NON-TRIGGER: no such request → silent', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.contraindicationCodes).not.toContain('SAFE-BODY-01');
  });
});

describe('safety content guarantees', () => {
  it('safety content is never paywalled: barrier-reset + relaxation pool are free', () => {
    expect(getActivity('barrier-reset')?.free).toBe(true);
    for (const id of RELAXATION_POOL_IDS) expect(getActivity(id)?.free).toBe(true);
  });

  it('barrier-reset + neutral-jaw-rest + smile-release are never excluded by onboarding answers', () => {
    // every onboarding answer ON + full inventory
    const allOn: SafetyAnswers = {
      allergies: true,
      sensitiveSkin: true,
      pregnantOrTrying: true,
      recentProcedure: true,
      facialPainOrNerve: true,
      openWoundOrInfection: true,
      eyeSymptoms: true,
    };
    const r = evaluateSafety(allOn, inventory({ products: ['retinoid', 'acids', 'benzoyl-peroxide'] }));
    expect(r.excludedActivityIds).not.toContain('barrier-reset');
    expect(r.excludedActivityIds).not.toContain('neutral-jaw-rest');
    expect(r.excludedActivityIds).not.toContain('smile-release');
  });

  it('a safe relaxation option always survives the onboarding answer space', () => {
    const allOn: SafetyAnswers = {
      allergies: true,
      sensitiveSkin: true,
      pregnantOrTrying: true,
      recentProcedure: true,
      facialPainOrNerve: true,
      openWoundOrInfection: true,
      eyeSymptoms: true,
    };
    const r = evaluateSafety(allOn, inventory({ products: ['retinoid'] }));
    const survivors = RELAXATION_POOL_IDS.filter((id) => !r.excludedActivityIds.includes(id));
    expect(survivors.length).toBeGreaterThan(0);
  });

  it('conservative fallback (skipped screening) keeps only basics + relaxation, all free', () => {
    const r = conservativeSafetyEvaluation();
    for (const id of FREE_ACTIVITY_IDS) expect(r.excludedActivityIds).not.toContain(id);
    const survivors = ACTIVITIES.filter((a) => !r.excludedActivityIds.includes(a.activityId));
    for (const s of survivors) expect(s.free).toBe(true);
  });

  it('empty answers exclude nothing', () => {
    const r = evaluateSafety(answers(), inventory());
    expect(r.contraindicationCodes).toHaveLength(0);
    expect(r.excludedActivityIds).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
    expect(r.referrals).toHaveLength(0);
    expect(r.pregnancyRetinoidExcluded).toBe(false);
  });
});
