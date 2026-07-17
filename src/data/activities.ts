/**
 * LumaFace activity catalog — 24 records (8 free, 16 PRO).
 * Transcribed COMPLETELY from /design/library.md (the content source of truth,
 * spec Appendix A format). Nothing truncated.
 *
 * Global metadata for every record: version "2026.07.1" · status approved ·
 * locale "en" · approvedAt 2026-07-17.
 * Reviewers: skincare → Dr. A. Rahal (board-certified dermatologist);
 * massage/movement/neck-posture/relaxation → S. Okafor, PT (licensed
 * physiotherapist); eye-area records carry both reviews.
 */

import type { ActivityCategoryId, EvidenceTierId } from '@/lib/theme';

export type ActivityStatus = 'draft' | 'approved' | 'retired';
export type ActivityDifficulty = 'Gentle' | 'Moderate';
export type ActivityLocale = 'en';

/** Analytics-safe metadata only — no free text, no face data. */
export interface ActivityAnalyticsMetadata {
  category: ActivityCategoryId;
  evidenceTier: EvidenceTierId;
  durationSeconds: number;
}

/** Activity record (design.md §8.1 / spec Appendix A). */
export interface Activity {
  /** e.g. "am-gentle-cleanse" */
  activityId: string;
  /** content revision, e.g. "2026.07.1" */
  version: string;
  status: ActivityStatus;
  locale: ActivityLocale;
  title: string;
  category: ActivityCategoryId;
  /** onboarding goal ids (see GOALS in data/content.ts) this activity serves */
  goalIds: string[];
  evidenceTier: EvidenceTierId;
  durationSeconds: number;
  /** e.g. "daily AM", "3×/week", "as needed" */
  frequency: string;
  difficulty: ActivityDifficulty;
  /** e.g. "none", "clean washcloth", "gua sha tool (optional)" */
  equipment: string;
  /** setup steps */
  preparation: string[];
  /** numbered, second-person, calm */
  steps: string[];
  /** one line, used by StepCue */
  breathingCue: string;
  /** what the camera coach checks (M1: simulated); "none" if unused */
  cameraRules: string;
  /** refs to Appendix B SAFE-* rule codes — the rules engine is the only gate */
  contraindicationCodes: string[];
  stopConditions: string[];
  /** tier-permitted language only */
  expectedOutcome: string;
  /** claims this activity must never be associated with */
  prohibitedClaims: string[];
  /** e.g. ["R7","R26","CONTENT-042"] — see SOURCES in data/content.ts */
  sourceIds: string[];
  expertReviewer: string;
  expertCredential: string;
  /** ISO date */
  approvedAt: string;
  /** free = never paywalled (8 records: 4 AM/PM basics + Barrier Reset + 3 relaxation) */
  free: boolean;
  media: { illustration: string; captionsUrl?: string };
  analyticsSafeMetadata: ActivityAnalyticsMetadata;
}

const VERSION = '2026.07.1';
const APPROVED_AT = '2026-07-17';
const REVIEWER_DERM = 'Dr. A. Rahal';
const CRED_DERM = 'Board-certified dermatologist (content reviewer)';
const REVIEWER_PT = 'S. Okafor, PT';
const CRED_PT = 'Licensed physiotherapist, movement content reviewer';
const REVIEWER_BOTH = 'Dr. A. Rahal & S. Okafor, PT';
const CRED_BOTH = 'Board-certified dermatologist · Licensed physiotherapist (content reviewers)';

interface ActivityDraft
  extends Omit<Activity, 'version' | 'status' | 'locale' | 'approvedAt' | 'analyticsSafeMetadata' | 'expertReviewer' | 'expertCredential'> {
  expertReviewer?: string;
  expertCredential?: string;
}

function mk(d: ActivityDraft): Activity {
  const { expertReviewer, expertCredential, ...rest } = d;
  return {
    version: VERSION,
    status: 'approved',
    locale: 'en',
    approvedAt: APPROVED_AT,
    ...rest,
    expertReviewer: expertReviewer ?? (d.category === 'skincare' ? REVIEWER_DERM : REVIEWER_PT),
    expertCredential: expertCredential ?? (d.category === 'skincare' ? CRED_DERM : CRED_PT),
    analyticsSafeMetadata: {
      category: d.category,
      evidenceTier: d.evidenceTier,
      durationSeconds: d.durationSeconds,
    },
  };
}

/* ═══════════════════════ Category 1 — Skincare Foundation (Warm Ochre) ══ */

const amGentleCleanse = mk({
  activityId: 'am-gentle-cleanse',
  title: 'Morning Gentle Cleanse',
  category: 'skincare',
  goalIds: ['healthy-skin', 'dryness-comfort'],
  evidenceTier: 'A',
  durationSeconds: 30,
  frequency: 'daily AM',
  difficulty: 'Gentle',
  equipment: 'mild cleanser, lukewarm water',
  preparation: ['Wash your hands. Let the water run lukewarm — never hot.'],
  steps: [
    'Wet your face with lukewarm water.',
    'Massage a small amount of gentle cleanser with your fingertips — cheeks, forehead, nose, chin — 20 unhurried seconds.',
    'Rinse thoroughly.',
    'Pat dry with a soft towel. Never rub.',
  ],
  breathingCue: 'Breathe normally — this is the easy part.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['Any cleanser that repeatedly burns or stings — stop that product, not the habit.'],
  expectedOutcome:
    'Supports a clean, comfortable base for the day. Dermatologist-recommended guidance.',
  prohibitedClaims: ['deep detox', 'shrinks pores', 'treats acne'],
  sourceIds: ['R7', 'R26', 'R39'],
  free: true,
  media: { illustration: 'FaceCleanseAm' },
});

const amMoisturizer = mk({
  activityId: 'am-moisturizer',
  title: 'Morning Moisturizer',
  category: 'skincare',
  goalIds: ['dryness-comfort', 'healthy-skin'],
  evidenceTier: 'A',
  durationSeconds: 30,
  frequency: 'daily AM',
  difficulty: 'Gentle',
  equipment: 'simple moisturizer',
  preparation: ['Cleanse first; leave skin slightly damp.'],
  steps: [
    'Take a pea-to-almond sized amount.',
    'Dot over forehead, cheeks, nose, chin.',
    'Spread gently outward with fingertips.',
    'Add a little extra to any dry-feeling areas.',
  ],
  breathingCue: 'One slow breath in as you smooth, out as you finish.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['A moisturizer that repeatedly stings or flushes your skin is not your moisturizer — stop it.'],
  expectedOutcome:
    'Supports skin comfort and helps reduce visible dryness. Dermatologist-recommended guidance.',
  prohibitedClaims: ['rebuilds collagen', 'erases lines'],
  sourceIds: ['R26', 'R39'],
  free: true,
  media: { illustration: 'FaceMoisturize' },
});

const dailySunscreen = mk({
  activityId: 'daily-sunscreen',
  title: 'Daily Sunscreen',
  category: 'skincare',
  goalIds: ['healthy-skin', 'uneven-tone', 'fine-lines'],
  evidenceTier: 'A',
  durationSeconds: 60,
  frequency: 'daily AM, reapply with extended outdoor time',
  difficulty: 'Gentle',
  equipment: 'broad-spectrum SPF 30+',
  preparation: ['Last step of your morning routine, before makeup.'],
  steps: [
    'Use about two finger-lengths of sunscreen for face and neck.',
    'Dot across face, neck and ears.',
    "Spread evenly — don't forget ears and the back of the neck.",
    'Reapply when you spend long stretches outdoors.',
  ],
  breathingCue: 'Breathe in — this is the kindest long-term habit you own.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['Persistent stinging or reaction → stop that product; persistent symptoms deserve professional review.'],
  expectedOutcome:
    'Helps protect against UV-related visible aging and pigment changes. Dermatologist-recommended guidance — it does not reverse existing conditions.',
  prohibitedClaims: ['reverses sun damage', 'treats melasma', 'replaces shade/clothing'],
  sourceIds: ['R7', 'R26', 'R33'],
  free: true,
  media: { illustration: 'FaceSunscreen' },
});

const pmCleanseUnwind = mk({
  activityId: 'pm-cleanse-unwind',
  title: 'Evening Cleanse & Unwind',
  category: 'skincare',
  goalIds: ['healthy-skin', 'consistency'],
  evidenceTier: 'A',
  durationSeconds: 90,
  frequency: 'daily PM',
  difficulty: 'Gentle',
  equipment: 'gentle makeup remover (if needed), mild cleanser',
  preparation: ['Wash your hands. If you wore makeup or heavy SPF, start with remover.'],
  steps: [
    'Press remover-soaked pad over closed eyes for 10 seconds — lift away, no rubbing.',
    'Cleanse the rest of your face gently with fingertips.',
    'Rinse lukewarm; pat dry.',
    'Follow with moisturizer while skin is slightly damp.',
  ],
  breathingCue: 'Let your shoulders drop on every exhale — the day is done.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ["Stinging that persists → simplify to water + moisturizer and see 'Barrier Reset'."],
  expectedOutcome:
    'Supports overnight comfort by removing the day gently. Dermatologist-recommended guidance.',
  prohibitedClaims: ['detox', 'prevents breakouts overnight'],
  sourceIds: ['R26', 'R39'],
  free: true,
  media: { illustration: 'FaceCleansePm' },
});

const barrierReset = mk({
  activityId: 'barrier-reset',
  title: 'Barrier Reset',
  category: 'skincare',
  goalIds: ['dryness-comfort'],
  evidenceTier: 'A',
  durationSeconds: 150,
  frequency: 'twice daily until skin settles (3–7 days)',
  difficulty: 'Gentle',
  equipment: 'simple cleanser, simple moisturizer, SPF',
  preparation: ['Pause all strong actives (retinoids, acids, benzoyl peroxide, vitamin C) and all tools.'],
  steps: [
    'AM: lukewarm rinse or minimal cleanser → moisturizer → SPF.',
    'PM: gentle cleanse → moisturizer.',
    'Introduce nothing new this week.',
    'When skin has felt calm for 48 hours, reintroduce actives one at a time, one per week.',
  ],
  breathingCue: 'Slow breath out — skin heals fastest when you do less.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['Symptoms that persist beyond a week, or worsen: please see a qualified professional. (See Help.)'],
  expectedOutcome:
    'Dermatologist-consistent guidance for calming overloaded skin: simplify, protect, wait.',
  prohibitedClaims: ['repairs damage in 3 days', 'cures sensitivity'],
  sourceIds: ['R26', 'R39', 'R40'],
  free: true,
  media: { illustration: 'FaceBarrierReset' },
});

const oneActiveIntro = mk({
  activityId: 'one-active-intro',
  title: 'One-Active Introduction',
  category: 'skincare',
  goalIds: ['fine-lines', 'blemishes', 'uneven-tone'],
  evidenceTier: 'A',
  durationSeconds: 120,
  frequency: 'weekly review',
  difficulty: 'Gentle',
  equipment: 'the single active being introduced',
  preparation: ['Choose ONE active. Patch-test on the jawline; wait 24 hours.'],
  steps: [
    'Week 1: apply 2 nights, buffered with moisturizer.',
    'Week 2: 3 nights if comfortable.',
    'Weeks 3–4: build toward label frequency.',
    'Any week with stinging → step back a level or pause to Barrier Reset.',
  ],
  breathingCue: 'Patience is the active ingredient.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-PREG-RET'],
  stopConditions: ['Burning, swelling, hives → stop the product; persistent symptoms → professional review.'],
  expectedOutcome:
    'Supports finding your personal tolerance while avoiding product stacking. Cautious introduction is dermatologist-recommended guidance — including special warnings for retinoids.',
  prohibitedClaims: ['guaranteed results in 2 weeks', 'more actives = faster results'],
  sourceIds: ['R18', 'R32', 'R33'],
  free: false,
  media: { illustration: 'FaceOneActive' },
});

/* ═══════════════════ Category 2 — Facial Massage & De-Puff (Sage) ══════ */

const gentleFacialMassage = mk({
  activityId: 'gentle-facial-massage',
  title: 'Gentle Facial Massage',
  category: 'massage',
  goalIds: ['puffiness', 'tension', 'healthy-skin'],
  evidenceTier: 'B',
  durationSeconds: 180,
  frequency: 'up to daily',
  difficulty: 'Gentle',
  equipment: 'clean hands, moisturizer or slip',
  preparation: ['Clean hands, clean skin, enough moisturizer for glide. No massage over broken, infected or inflamed skin.'],
  steps: [
    'Forehead: light strokes from center toward temples — 4 passes.',
    'Cheeks: light strokes from beside the nose toward the ears — 4 passes.',
    'Jaw: light strokes from chin center toward the jaw angle — 4 passes.',
    'Under-eye: feather-light along the orbital bone only — never press the eyeball.',
    'Neck: comfortable superficial strokes downward — never press the front of the throat.',
  ],
  breathingCue: 'In through the nose, long out through the mouth, strokes ride the exhale.',
  cameraRules: 'Centering + hand-position check (Preview: simulated).',
  contraindicationCodes: ['SAFE-PROC-01', 'SAFE-SKIN-01'],
  stopConditions: ['Pain, burning, bruising or redness that lingers — stop and let skin rest.'],
  expectedOutcome:
    'Can support relaxation and may temporarily change the appearance of puffiness or surface circulation. Appearance varies — any effect is temporary; no structural change is promised.',
  prohibitedClaims: ['lymphatic detox', 'fat loss', 'permanent lift', 'bone change'],
  sourceIds: ['R15', 'CONTENT-011'],
  free: false,
  media: { illustration: 'FaceMassageSequence' },
});

const morningDepuffGlide = mk({
  activityId: 'morning-depuff-glide',
  title: 'Morning De-Puff Glide',
  category: 'massage',
  goalIds: ['puffiness'],
  evidenceTier: 'B',
  durationSeconds: 120,
  frequency: 'as needed, AM',
  difficulty: 'Gentle',
  equipment: 'clean hands, light moisturizer',
  preparation: ['Cool hands help — rinse them in cool water first.'],
  steps: [
    'With ring fingers, start at the inner corner beneath the eye.',
    'Glide outward to the temple with the lightest touch — like moving water.',
    'Continue in front of the ear, then sweep gently down the side of the neck.',
    'Repeat the full path 8 times per side, slow.',
  ],
  breathingCue: 'Glide on the exhale — four counts out.',
  cameraRules: 'Centering only (Preview: simulated).',
  contraindicationCodes: ['SAFE-EYE-01', 'SAFE-SKIN-01'],
  stopConditions: ['Any eye discomfort — stop immediately.'],
  expectedOutcome:
    'May temporarily ease the appearance of morning puffiness. Appearance may vary by sleep, salt, and lighting.',
  prohibitedClaims: ['removes eye bags permanently', 'drains toxins'],
  sourceIds: ['R15', 'CONTENT-014'],
  free: false,
  media: { illustration: 'FaceDepuffGlide' },
});

const gentleGuaSha = mk({
  activityId: 'gentle-gua-sha',
  title: 'Gentle Gua Sha',
  category: 'massage',
  goalIds: ['puffiness', 'tension'],
  evidenceTier: 'B',
  durationSeconds: 180,
  frequency: '2–3×/week',
  difficulty: 'Gentle',
  equipment: 'gua sha tool (optional — fingers work), moisturizer slip',
  preparation: ['Clean tool, clean hands, generous slip. Hold the tool relatively flat against skin.'],
  steps: [
    'Jaw: a few light outward passes from chin toward the ear.',
    'Cheek: a few light passes from beside the nose toward the ear.',
    'Forehead: a few light passes from center to temples.',
    'Neck: a few light downward passes on the side of the neck. Few means 3–5, light means feather.',
  ],
  breathingCue: 'One pass per slow exhale.',
  cameraRules: 'Tool-angle hint (Preview: simulated).',
  contraindicationCodes: ['SAFE-PROC-01', 'SAFE-SKIN-01'],
  stopConditions: ['Pain, bruising, or marks appearing — stop. Marks are a sign of too much pressure, never of progress.'],
  expectedOutcome:
    'Can support relaxation and may temporarily alter the appearance of puffiness. Evidence for any contour effect is preliminary and not promised.',
  prohibitedClaims: ['contours the jaw permanently', "bruising means it's working", 'releases fascia to reshape'],
  sourceIds: ['R15', 'CONTENT-017'],
  free: false,
  media: { illustration: 'FaceGuaSha' },
});

/* ═══════════════════════ Category 3 — Face Movement (Dusty Rose) ═══════ */

const gentleCheekLift = mk({
  activityId: 'gentle-cheek-lift',
  title: 'Gentle Cheek Lift',
  category: 'movement',
  goalIds: ['healthy-skin', 'consistency'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: '3–5×/week',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Relax your shoulders and forehead. This is small — no squinting, no straining.'],
  steps: [
    'Form a small, easy smile — lips relaxed.',
    'Feel your cheek apples rise; rest fingertips lightly on them as awareness points — not to push.',
    'Hold 3 seconds, breathing.',
    'Release completely. Repeat 5 times, slower each time.',
  ],
  breathingCue: 'Lift on a soft inhale, melt on the exhale.',
  cameraRules: 'Detects squint/brow involvement and reminds you to soften (Preview: simulated).',
  contraindicationCodes: ['SAFE-FACE-01', 'SAFE-PROC-01'],
  stopConditions: ['Any pain, twitching that persists, or facial fatigue — rest today.'],
  expectedOutcome:
    'May build gentle muscle awareness. Evidence is limited and preliminary — no lift is guaranteed and no structural change is promised.',
  prohibitedClaims: ['lifts sagging cheeks', 'rebuilds volume', 'replaces fillers'],
  sourceIds: ['R6', 'R14', 'R16'],
  free: false,
  media: { illustration: 'FaceCheekLift' },
});

const controlledSmile = mk({
  activityId: 'controlled-smile',
  title: 'Controlled Smile',
  category: 'movement',
  goalIds: ['consistency', 'healthy-skin'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: '3–5×/week',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Forehead relaxed, jaw unclenched, shoulders down.'],
  steps: [
    'Smile slowly and evenly over 3 seconds — small range.',
    'Keep your forehead completely still; eyes soft.',
    'Hold 2 seconds.',
    'Return fully to neutral. Repeat 5 times.',
  ],
  breathingCue: 'Smile on the exhale — it stays kinder that way.',
  cameraRules: 'May coach symmetry of *movement* — never of attractiveness (Preview: simulated).',
  contraindicationCodes: ['SAFE-FACE-01', 'SAFE-PROC-01'],
  stopConditions: ["One-sided movement that is new to you → stop and see Help's professional-care guidance."],
  expectedOutcome:
    'May support gentle coordination and relaxation awareness. Evidence is limited — no wrinkle or symmetry change is promised.',
  prohibitedClaims: ['corrects your smile', 'fixes asymmetry', 'erases smile lines'],
  sourceIds: ['R6', 'R14'],
  free: false,
  media: { illustration: 'FaceControlledSmile' },
});

const cheekAirTransfer = mk({
  activityId: 'cheek-air-transfer',
  title: 'Cheek Air Transfer',
  category: 'movement',
  goalIds: ['consistency'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: '3–5×/week',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Take a small sip of air — a little, not a balloon.'],
  steps: [
    'Close your lips softly with a small amount of air inside.',
    'Move the air gently to one cheek — hold 5 seconds.',
    'Transfer slowly to the other cheek — hold 5 seconds.',
    'Release. Repeat twice.',
  ],
  breathingCue: 'Breathe through your nose throughout — the air stays put.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-PROC-01'],
  stopConditions: ['Light-headedness or jaw ache — release and rest.'],
  expectedOutcome:
    'A playful awareness exercise. Evidence is limited — no wrinkle-removal or volume change is claimed.',
  prohibitedClaims: ['fills nasolabial folds', 'plumps cheeks permanently'],
  sourceIds: ['R6', 'CONTENT-022'],
  free: false,
  media: { illustration: 'FaceAirTransfer' },
});

const controlledOoEe = mk({
  activityId: 'controlled-oo-ee',
  title: 'Controlled Oo–Ee',
  category: 'movement',
  goalIds: ['consistency'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: '3–5×/week',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Jaw loose, lips soft — small range only.'],
  steps: [
    "Shape a small, gentle 'oo' — lips rounded, no wrinkling.",
    "Transition slowly to a soft 'ee' — a hint of a smile.",
    'Move between the two over 4 slow seconds.',
    'Repeat 5 times, then relax the whole lower face.',
  ],
  breathingCue: 'Silent breath, slow shapes.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-JAW-01', 'SAFE-PROC-01'],
  stopConditions: ['Jaw fatigue or clicking — stop for today.'],
  expectedOutcome:
    'Gentle mobility practice. Evidence is limited — this is about movement comfort, not lip size or shape change.',
  prohibitedClaims: ['enlarges lips', 'defines lip border'],
  sourceIds: ['R6', 'CONTENT-023'],
  free: false,
  media: { illustration: 'FaceOoEe' },
});

const controlledJawOpening = mk({
  activityId: 'controlled-jaw-opening',
  title: 'Controlled Jaw Opening',
  category: 'movement',
  goalIds: ['tension'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: '3–5×/week',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Sit tall. Rest your tongue comfortably on the roof of your mouth.'],
  steps: [
    'Let your jaw lower slowly — a comfortable, small opening.',
    'Pause 2 seconds — no forcing wider.',
    'Close slowly until lips meet softly.',
    'Repeat 5 times, staying silent and slow.',
  ],
  breathingCue: 'Open on the exhale, close on the inhale.',
  cameraRules: 'Tempo check — flags fast or jerky movement (Preview: simulated).',
  contraindicationCodes: ['SAFE-JAW-01'],
  stopConditions: ['Pain, worsening click, or locking — stop and consult a dentist/doctor if it persists (see Help).'],
  expectedOutcome:
    'May support comfortable jaw mobility. Evidence is limited; this is mobility, not jaw reshaping.',
  prohibitedClaims: ['reshapes the jaw', 'fixes TMJ', 'slims the lower face'],
  sourceIds: ['CONTENT-024'],
  free: false,
  media: { illustration: 'FaceJawOpening' },
});

/* ═══════════════════════ Category 4 — Eye & Forehead (Powder Blue) ═════ */

const softEyeRelaxation = mk({
  activityId: 'soft-eye-relaxation',
  title: 'Soft-Eye Relaxation',
  category: 'eye-forehead',
  goalIds: ['tension', 'consistency'],
  evidenceTier: 'B',
  durationSeconds: 45,
  frequency: 'daily, as needed',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Sit or lie comfortably. Warm your palms by rubbing them together.'],
  steps: [
    'Close your eyes gently — no squeezing.',
    'Cup your palms softly over your eyes without touching them.',
    'Rest in the darkness for 3 slow breaths; let your jaw and brow go heavy.',
    'Lower your hands; open your eyes slowly.',
  ],
  breathingCue: 'Three breaths: in for 4, out for 6.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-EYE-01'],
  stopConditions: ['Any eye discomfort — stop.'],
  expectedOutcome:
    'Can support relaxation and a feeling of rest around tired eyes. Not a treatment for any eye condition.',
  prohibitedClaims: ['improves vision', 'removes dark circles', 'enlarges eyes'],
  sourceIds: ['CONTENT-031'],
  free: true,
  media: { illustration: 'FaceSoftEye' },
  expertReviewer: REVIEWER_BOTH,
  expertCredential: CRED_BOTH,
});

const browTensionAwareness = mk({
  activityId: 'brow-tension-awareness',
  title: 'Brow-Tension Awareness',
  category: 'eye-forehead',
  goalIds: ['tension', 'fine-lines'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: 'daily, as needed',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ["Let your face go completely neutral first — a 'blank page' face."],
  steps: [
    'Without a mirror, notice: are your brows lifted or knitted right now?',
    'Let them lower and soften — imagine the forehead widening.',
    'Open your eyes naturally without recruiting the forehead — hold 10 seconds.',
    'Repeat 3 times, checking in with your jaw between rounds.',
  ],
  breathingCue: 'Each exhale, the brow settles one more millimeter.',
  cameraRules: 'Detects unnecessary brow elevation and prompts release (Preview: simulated).',
  contraindicationCodes: ['SAFE-PROC-01'],
  stopConditions: ['Headache or eye strain — rest.'],
  expectedOutcome:
    'May build awareness of habitual forehead tension. Evidence is preliminary — no line-erasing is promised.',
  prohibitedClaims: ['erases the 11s', 'Botox alternative'],
  sourceIds: ['R6', 'CONTENT-032'],
  free: false,
  media: { illustration: 'FaceBrowAwareness' },
  expertReviewer: REVIEWER_BOTH,
  expertCredential: CRED_BOTH,
});

const templeRelaxation = mk({
  activityId: 'temple-relaxation',
  title: 'Temple Relaxation',
  category: 'eye-forehead',
  goalIds: ['tension'],
  evidenceTier: 'B',
  durationSeconds: 30,
  frequency: 'daily, as needed',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Elbows supported, fingertips at your temples.'],
  steps: [
    'Make very light, small circles at your temples — 15–20 seconds.',
    'Keep pressure feather-light; let your jaw hang slightly open.',
    'Finish with still fingertips and one long exhale.',
  ],
  breathingCue: 'Circles on the exhale, stillness on the inhale.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-EYE-01'],
  stopConditions: ['Tenderness or headache — stop.'],
  expectedOutcome:
    'Can support relaxation of a common tension spot. Temporary, subjective comfort — appearance may vary.',
  prohibitedClaims: ['relieves migraines', 'lifts the brow'],
  sourceIds: ['CONTENT-033'],
  free: false,
  media: { illustration: 'FaceTemple' },
  expertReviewer: REVIEWER_BOTH,
  expertCredential: CRED_BOTH,
});

const coolCompressDepuff = mk({
  activityId: 'cool-compress-depuff',
  title: 'Cool Compress De-Puff',
  category: 'eye-forehead',
  goalIds: ['puffiness'],
  evidenceTier: 'B',
  durationSeconds: 120,
  frequency: 'as needed, AM',
  difficulty: 'Gentle',
  equipment: 'clean soft washcloth, cool water',
  preparation: ['Soak a clean cloth in comfortably cool water — cool, never icy; wring it out.'],
  steps: [
    'Lie or recline; rest the cloth over closed eyes.',
    'Hold 60–90 seconds, breathing slowly.',
    'Remove, pat dry, follow with moisturizer.',
    'Wash the cloth after use.',
  ],
  breathingCue: 'In for 4, out for 6, for the whole compress.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-EYE-01'],
  stopConditions: ['Numbness, pain, or any eye discomfort — remove immediately.'],
  expectedOutcome:
    'May temporarily reduce the appearance of puffiness through cooling. Effects are short-lived and vary.',
  prohibitedClaims: ['shrinks fat pads', 'removes bags for good'],
  sourceIds: ['CONTENT-034'],
  free: false,
  media: { illustration: 'FaceCoolCompress' },
  expertReviewer: REVIEWER_BOTH,
  expertCredential: CRED_BOTH,
});

/* ═══════════════════════ Category 5 — Neck & Posture (Lavender Mauve) ══ */

const shoulderReset = mk({
  activityId: 'shoulder-reset',
  title: 'Shoulder Reset',
  category: 'neck-posture',
  goalIds: ['tension', 'consistency'],
  evidenceTier: 'B',
  durationSeconds: 60,
  frequency: 'daily, as needed',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Sit or stand tall, arms loose.'],
  steps: [
    'Lift both shoulders gently toward your ears.',
    'Roll them back and down — slow.',
    'Let them settle lower than where they started.',
    'Repeat 5 times, unhurried.',
  ],
  breathingCue: 'Lift on the inhale, drop on a long exhale.',
  cameraRules: 'Optional posture check — head tilt and forward-head hints (Preview: simulated).',
  contraindicationCodes: [],
  stopConditions: ['Pain, tingling, or dizziness — stop.'],
  expectedOutcome:
    'Can support relaxation of shoulder tension that travels up into the face. Comfort, not correction.',
  prohibitedClaims: ['fixes posture permanently', 'slims the neck'],
  sourceIds: ['CONTENT-041'],
  free: false,
  media: { illustration: 'FaceShoulderReset' },
});

const sideNeckStretch = mk({
  activityId: 'side-neck-stretch',
  title: 'Side-Neck Stretch',
  category: 'neck-posture',
  goalIds: ['tension'],
  evidenceTier: 'B',
  durationSeconds: 60,
  frequency: 'daily, as needed',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Shoulders down and level — pin them gently by sitting on your hands if helpful.'],
  steps: [
    'Tilt your right ear softly toward your right shoulder — no hand pulling.',
    'Hold 10–15 seconds, breathing.',
    'Return to center slowly.',
    'Repeat on the left. One round each side is enough.',
  ],
  breathingCue: 'The exhale lengthens; never force the range.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['Pain, tingling, or dizziness — return to center and stop.'],
  expectedOutcome:
    'Can support neck comfort after long screen hours. Temporary comfort; no appearance change is claimed.',
  prohibitedClaims: ['lengthens the neck visibly', 'erases neck lines'],
  sourceIds: ['CONTENT-042'],
  free: false,
  media: { illustration: 'FaceNeckStretch' },
});

const chinRetraction = mk({
  activityId: 'chin-retraction',
  title: 'Chin Retraction',
  category: 'neck-posture',
  goalIds: ['consistency', 'tension'],
  evidenceTier: 'C',
  durationSeconds: 60,
  frequency: 'daily',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Sit tall, gaze forward, chin level.'],
  steps: [
    "Glide your head straight backward — as if making a polite 'double chin' face, gently.",
    'Hold 3–5 seconds; keep looking forward, not down.',
    'Release to neutral.',
    'Repeat 5 times, small and smooth.',
  ],
  breathingCue: 'Glide back on the exhale.',
  cameraRules: 'Alignment check — flags looking-down (Preview: simulated).',
  contraindicationCodes: [],
  stopConditions: ['Pain or headache — stop.'],
  expectedOutcome:
    'May support head-alignment awareness. Evidence for appearance effects is preliminary — this improves comfort and alignment habits, not chin fat or jaw shape.',
  prohibitedClaims: ['removes double chin', 'burns chin fat', 'reshapes the jawline'],
  sourceIds: ['CONTENT-043'],
  free: false,
  media: { illustration: 'FaceChinRetraction' },
});

/* ═══════════════ Category 6 — Relaxation & Tension Release (Soft Teal) ═ */

const neutralJawRest = mk({
  activityId: 'neutral-jaw-rest',
  title: 'Neutral Jaw Rest',
  category: 'relaxation',
  goalIds: ['tension'],
  evidenceTier: 'B',
  durationSeconds: 30,
  frequency: 'daily, several times',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Teeth apart, lips softly together, tongue resting low and loose.'],
  steps: [
    'Let your jaw hang a few millimeters open — lips may stay touching.',
    'Soften your shoulders.',
    'Rest here for 30 seconds, noticing the difference from clenching.',
    "Remember this position — it's your jaw's home base.",
  ],
  breathingCue: 'Breathe through your nose; every exhale widens the space between your teeth.',
  cameraRules: 'none',
  contraindicationCodes: [],
  stopConditions: ['None beyond general comfort.'],
  expectedOutcome:
    'Can support relaxation and awareness of daytime clenching. Temporary, subjective — and genuinely useful.',
  prohibitedClaims: ['treats TMJ disorder', 'slims the jaw'],
  sourceIds: ['CONTENT-051'],
  free: true,
  media: { illustration: 'FaceJawRest' },
});

const smileRelease = mk({
  activityId: 'smile-release',
  title: 'Smile Release',
  category: 'relaxation',
  goalIds: ['tension', 'consistency'],
  evidenceTier: 'B',
  durationSeconds: 45,
  frequency: 'daily',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Neutral face, shoulders down.'],
  steps: [
    'Smile gently for 2 seconds — a real, small smile.',
    'Release completely: lips, cheeks, jaw, brow.',
    'Rest in neutral for 3 seconds — notice the contrast.',
    'Repeat 5 times.',
  ],
  breathingCue: 'Smile on the inhale, release on the exhale.',
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-FACE-01'],
  stopConditions: ['Facial fatigue — fewer reps tomorrow.'],
  expectedOutcome:
    'Can support relaxation by teaching the difference between held and released muscles. Emphasize the release, not the smile.',
  prohibitedClaims: ['trains a prettier smile', 'lifts mouth corners'],
  sourceIds: ['CONTENT-052'],
  free: true,
  media: { illustration: 'FaceSmileRelease' },
});

const lowerFaceRelease = mk({
  activityId: 'lower-face-release',
  title: 'Lower-Face Release',
  category: 'relaxation',
  goalIds: ['tension'],
  evidenceTier: 'B',
  durationSeconds: 60,
  frequency: 'daily',
  difficulty: 'Gentle',
  equipment: 'none',
  preparation: ['Sit comfortably, hands resting on your thighs.'],
  steps: [
    "Let your jaw drop open into a soft, silent 'ah'.",
    'Feel the corners of your mouth go heavy.',
    'Hold the release for one full breath.',
    'Close gently. Repeat 3–5 times — no stretching wide.',
  ],
  breathingCue: "The 'ah' rides the whole exhale.",
  cameraRules: 'none',
  contraindicationCodes: ['SAFE-JAW-01'],
  stopConditions: ['Jaw pain or clicking — return to Neutral Jaw Rest.'],
  expectedOutcome:
    'Can support relaxation of the lower face. No maximal stretching — comfort only.',
  prohibitedClaims: ['defines the jaw', 'releases wrinkles around the mouth'],
  sourceIds: ['CONTENT-053'],
  free: false,
  media: { illustration: 'FaceLowerFaceRelease' },
});

/** The full 24-activity catalog, in library order. */
export const ACTIVITIES: Activity[] = [
  // 1 — Skincare Foundation
  amGentleCleanse,
  amMoisturizer,
  dailySunscreen,
  pmCleanseUnwind,
  barrierReset,
  oneActiveIntro,
  // 2 — Facial Massage & De-Puff
  gentleFacialMassage,
  morningDepuffGlide,
  gentleGuaSha,
  // 3 — Face Movement
  gentleCheekLift,
  controlledSmile,
  cheekAirTransfer,
  controlledOoEe,
  controlledJawOpening,
  // 4 — Eye & Forehead
  softEyeRelaxation,
  browTensionAwareness,
  templeRelaxation,
  coolCompressDepuff,
  // 5 — Neck & Posture
  shoulderReset,
  sideNeckStretch,
  chinRetraction,
  // 6 — Relaxation & Tension Release
  neutralJawRest,
  smileRelease,
  lowerFaceRelease,
];

/** Fast lookup by activityId. */
export const ACTIVITY_BY_ID: ReadonlyMap<string, Activity> = new Map(
  ACTIVITIES.map((a) => [a.activityId, a]),
);

/** Get an activity by id (undefined when unknown). */
export function getActivity(activityId: string): Activity | undefined {
  return ACTIVITY_BY_ID.get(activityId);
}

/**
 * The free set — never paywalled, per design.md §8.1:
 * 4 AM/PM skincare basics + Barrier Reset (safety content) + 3 relaxation
 * activities (Neutral Jaw Rest, Soft-Eye Relaxation, Smile Release).
 */
export const FREE_ACTIVITY_IDS = [
  'am-gentle-cleanse',
  'am-moisturizer',
  'daily-sunscreen',
  'pm-cleanse-unwind',
  'barrier-reset',
  'soft-eye-relaxation',
  'neutral-jaw-rest',
  'smile-release',
] as const;

/** The 3 relaxation activities that form the safety substitution pool. */
export const RELAXATION_POOL_IDS = ['neutral-jaw-rest', 'soft-eye-relaxation', 'smile-release'] as const;

/** The 4 AM/PM skincare basics (Tier A). */
export const SKINCARE_BASICS_IDS = ['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen', 'pm-cleanse-unwind'] as const;
