/**
 * LumaFace coach — M1 local answer engine (design/coach.md engineering notes).
 *
 * A small retrieval module: a safety classifier (regex intercept list) runs
 * BEFORE normal coaching, then keyword/goal matching over a curated
 * COACH_ANSWERS set (+ ACTIVITIES for goal-matched fallbacks) returns the
 * exact structured contract from design.md §8.5 / spec §4.3:
 *
 *   { intent, summary, recommended_actions, warnings, confidence,
 *     source_ids, requires_professional_review }
 *
 * The UI renders whatever this returns with no shape changes when the real
 * safety-filtered gateway ships. Analytics note (spec §12.2): only reason
 * codes may ever be logged — never message content.
 */

import type { CoachAnswer } from '@/lib/store';
import { ACTIVITIES, type Activity } from '@/data/activities';
import { GOALS } from '@/data/content';

/* ═══════════════════════ Safety classifier (runs first) ═══════════════ */

export type SafetyIntercept =
  | { kind: 'urgent'; variant: 'face' | 'eye' | 'breathing' | 'general'; code: string }
  | { kind: 'body_harm' }
  | { kind: 'diagnosis' }
  | { kind: 'body_image' }
  | { kind: 'off_scope' };

/** Urgent-symptom patterns — safety never waits (SAFE-FACE-01 / SAFE-EYE-01 …). */
const URGENT_FACE = [
  /half (of )?my face/i,
  /face\b.{0,40}\b(droop|weak|numb|paraly|slack|lopsided)/i,
  /(droop|weak|numb|paraly)\w*\b.{0,40}\bface/i,
  /sudden(ly)?\b.{0,40}\b(facial|face)\b.{0,40}\b(weak|droop|numb|paraly)/i,
  /one[- ]sided\b.{0,30}\b(weakness|droop|numbness|paralysis)/i,
  /(can'?t|cannot|unable to) move\b.{0,25}\b(face|mouth|smile)/i,
  /slurred speech/i,
  /bell'?s palsy/i,
  /\bstroke\b/i,
];
const URGENT_EYE = [
  /\bvision\b.{0,25}\b(change|loss|lost|blur|double|gone)/i,
  /(sudden(ly)?|lost)\b.{0,15}\b(sight|vision)/i,
  /can'?t see\b/i,
  /\beye\b.{0,25}\b(injur|knock|trauma|poke|stab)/i,
  /(injur|knock|hit|hurt)\w*\b.{0,20}\beye\b/i,
];
const URGENT_BREATHING = [
  /\b(lips?|tongue|throat)\b.{0,25}\bswell/i,
  /swell\w*\b.{0,25}\b(lips?|tongue|throat)/i,
  /(can'?t|cannot|trouble|difficulty) breath/i,
  /anaphylax/i,
  /\bhives\b.{0,30}\b(face|lip|throat|all over|spreading)/i,
];
const URGENT_GENERAL = [
  /\b(severe|unbearable|worst|extreme|intense)\b.{0,30}\bpain\b/i,
  /\bpain\b.{0,20}\b(severe|unbearable|getting worse|worsening)/i,
  /\bpus\b/i,
  /spreading redness/i,
  /\bfever\b.{0,30}\b(rash|face|skin|swell)/i,
  /won'?t stop bleeding/i,
];

/** SAFE-BODY-01 — starvation/dehydration requests: refuse + redirect. */
const BODY_HARM = [
  /(starv|stop eating|not eat|skip( ping)? meals?|dehydrat|no water|cut water)\w*\b.{0,60}\b(face|facial|cheek|jawline|slim|skinny|snatched|thin|puff)/i,
  /\b(face|cheek|jawline|puffiness)\b.{0,60}\b(starv|stop eating|not eat|dehydrat|no water)/i,
  /(how (do|can|to)|ways? to)\b.{0,30}\b(starv|dehydrat)\w*\b/i,
];

/** Diagnosis requests — graceful refusal + professional pointer. */
const DIAGNOSIS = [
  /\bdiagnos/i,
  /what (is|could be) this\b.{0,20}\b(rash|bump|spot|mole|lump|patch|growth)/i,
  /\b(is|could) this\b.{0,15}\b(cancer|melanoma|rosacea|eczema|psoriasis|shingles|impetigo|herpes)/i,
  /\bdo i have\b.{0,25}\b(rosacea|eczema|psoriasis|melanoma|cancer|dermatitis|shingles|acne)\b/i,
  /\b(biopsy|tumou?r|carcinoma)\b/i,
];

/** Body-image distress — kind redirect, never judgment. */
const BODY_IMAGE = [
  /\bi hate\b.{0,15}\b(my )?(face|skin|nose|jaw|looks?|appearance|reflection)/i,
  /\b(i'?m|i am|i feel|i look)\b.{0,15}\b(ugly|hideous|disgusting|gross|repulsive)/i,
  /\b(my )?(face|skin|nose)\b.{0,20}\b(is|looks?)\b.{0,10}\b(ugly|hideous|disgusting|gross|deformed|wrong)/i,
  /\bfix(ing)?\b.{0,15}\b(my )?(ugly|hideous|asymmetrical|crooked)\b/i,
];

/** Off-scope: attractiveness ratings, other people, comparisons. */
const OFF_SCOPE = [
  /\b(am i|how)\b.{0,10}\b(pretty|beautiful|attractive|hot|ugly)\b/i,
  /\brate\b.{0,20}\b(my|her|his|their|our)\b.{0,15}\b(face|looks?|appearance|body)/i,
  /\b(score|rank|grade)\b.{0,20}\b(my|her|his|their)\b.{0,15}\b(face|looks?|appearance)/i,
  /beauty (score|rating|meter)/i,
  /\bis\b.{0,20}\b(she|he|her|him|my (girl|boy)friend|my (wife|husband|partner|mom|mother|sister|friend))\b.{0,25}\b(pretty|ugly|attractive|hot|beautiful)/i,
  /\b(which|who) of (us|them)\b.{0,30}\b(prettier|better looking|more attractive|uglier)/i,
  /\bcompare\b.{0,20}\b(my|her|his)\b.{0,15}\bface\b.{0,20}\b(to|with|and)\b/i,
  /\b(her|his|their)\b.{0,15}\b(wrinkles|sagging|acne)\b/i, // coaching about someone else's face
  /celebrity\b.{0,30}\b(face|skin|look)/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/** Classify before any coaching happens. Null = safe to answer normally. */
export function classifySafety(text: string): SafetyIntercept | null {
  const t = text.trim();
  if (!t) return null;
  if (matchesAny(t, URGENT_FACE)) return { kind: 'urgent', variant: 'face', code: 'SAFE-FACE-01' };
  if (matchesAny(t, URGENT_BREATHING)) return { kind: 'urgent', variant: 'breathing', code: 'SAFE-BODY-01' };
  if (matchesAny(t, URGENT_EYE)) return { kind: 'urgent', variant: 'eye', code: 'SAFE-EYE-01' };
  if (matchesAny(t, URGENT_GENERAL)) return { kind: 'urgent', variant: 'general', code: 'REFERRAL' };
  if (matchesAny(t, BODY_HARM)) return { kind: 'body_harm' };
  if (matchesAny(t, DIAGNOSIS)) return { kind: 'diagnosis' };
  if (matchesAny(t, BODY_IMAGE)) return { kind: 'body_image' };
  if (matchesAny(t, OFF_SCOPE)) return { kind: 'off_scope' };
  return null;
}

/* ═══════════════════════ Safety / refusal replies ══════════════════════ */

const URGENT_COPY: Record<'face' | 'eye' | 'breathing' | 'general', { title: string; body: string }> = {
  face: {
    title: 'Please see a professional now.',
    body: 'Sudden one-sided facial weakness needs urgent medical attention — not an app. Please contact emergency services or go to urgent care now.',
  },
  eye: {
    title: 'Please see a professional now.',
    body: 'Sudden vision changes or an eye injury need urgent medical attention — not an app. Please contact emergency services or urgent eye care now.',
  },
  breathing: {
    title: 'Please see a professional now.',
    body: 'Swelling of the lips, tongue or throat, hives that spread, or any trouble breathing is an emergency. Please call emergency services now — an app can wait.',
  },
  general: {
    title: 'Please see a professional now.',
    body: 'What you describe sounds urgent and deserves a clinician now — not an app. Please contact urgent care or emergency services.',
  },
};

export function urgentCopy(variant: 'face' | 'eye' | 'breathing' | 'general') {
  return URGENT_COPY[variant];
}

/** Structured safety_redirect answer (logged with requires_professional_review). */
export function safetyRedirectAnswer(variant: 'face' | 'eye' | 'breathing' | 'general', code: string): CoachAnswer {
  const copy = URGENT_COPY[variant];
  return {
    intent: 'safety_redirect',
    summary: copy.body,
    recommended_actions: [],
    warnings: [{ code, message: 'Coaching paused for this conversation — the professional-care guidance in Help stays available.' }],
    confidence: 'high',
    source_ids: [],
    requires_professional_review: true,
  };
}

/** Warm one-liner refusals — no scolding, no walls of policy. */
export function refusalText(kind: 'body_harm' | 'diagnosis' | 'body_image' | 'off_scope'): string {
  switch (kind) {
    case 'body_harm':
      return "I can't help with that — starving or dehydrating yourself harms your skin, your face, and you, and LumaFace will never go there. If eating feels hard or fraught, a doctor or a registered dietitian is the kind move. I'm glad to build you a gentle care routine instead, whenever you like.";
    case 'diagnosis':
      return "That's outside what I can help with — I'm a care coach, not a clinician, and naming conditions is firmly their job. If something on your skin worries you, a dermatologist is the right call (Help lists the pause-and-call moments). Try me on routines, ingredients, or evidence.";
    case 'body_image':
      return "I'm really glad you said it out loud — and I want you to know LumaFace will never rate or judge your face. If these feelings are heavy or keep coming back, talking with a mental-health professional can genuinely help. When you're ready, I can offer something tiny and kind: a two-minute routine that asks nothing of your reflection.";
    case 'off_scope':
      return "That's outside what I can help with — I'm a care coach, not a mirror or a clinician. Try me on routines, ingredients, or evidence.";
  }
}

/* ═══════════════════════ Curated approved answers ══════════════════════ */

interface CuratedAnswer {
  id: string;
  patterns: RegExp[];
  answer: CoachAnswer;
}

/**
 * The approved-answer library. Every summary passes the §9 language rules:
 * Tier A "supports/helps protect" · Tier B "may temporarily" ·
 * Tier C "evidence is limited" · no Tier-D claims anywhere.
 */
export const COACH_ANSWERS: CuratedAnswer[] = [
  {
    id: 'face-yoga-proven',
    patterns: [/face yoga/i, /facial (exercise|gym|workout)/i, /\b(proven|evidence|science|research|studies)\b.{0,40}\b(work|real|true|effective)/i, /does\b.{0,25}\b(face yoga|facial exercise|it|this)\b.{0,25}\b(work|actually work)/i],
    answer: {
      intent: 'education',
      summary:
        "Honestly? Not in any strong way. Reviews of the research say evidence is still limited — small studies, mixed methods. That's why LumaFace treats face movement as gentle, optional practice (Tier C), and builds your core routine on skincare basics, which have established guidance (Tier A). Massage sits in between: limited evidence, temporary effects (Tier B).",
      recommended_actions: [
        { activity_id: 'neutral-jaw-rest', reason: 'Pure relaxation, our gentlest start' },
        { activity_id: 'daily-sunscreen', reason: 'The strongest evidence in the app' },
      ],
      warnings: [],
      confidence: 'high',
      source_ids: ['R6', 'R14', 'R16'],
      requires_professional_review: false,
    },
  },
  {
    id: 'massage-slim-face',
    patterns: [
      /\b(slim|slimming|thin|thinner|sculpt|chisel|snatch)\w*\b.{0,30}\b(face|cheek|jaw|chin)/i,
      /\b(face|cheek|jaw|double chin)\b.{0,30}\b(slim|slimming|thin|sculpt|fat)/i,
      /\b(lose|burn|melt|reduce)\b.{0,20}\b(face|facial|cheek|jowl)\b.{0,15}\bfat/i,
      /\bface fat\b/i,
      /\bjawline\b.{0,30}\b(sharper|defined|snatched|sculpted)/i,
    ],
    answer: {
      intent: 'education',
      summary:
        "I want to be straight with you: no. Massage may temporarily change the appearance of puffiness for some people — that's the honest ceiling of the evidence. It doesn't reduce facial fat or change bone structure, and any app promising that is overclaiming. What it can be is relaxing — which is worth something on its own.",
      recommended_actions: [{ activity_id: 'gentle-facial-massage', reason: "If you'd enjoy it as relaxation" }],
      warnings: [
        {
          code: 'CLAIMS-POLICY',
          message: "Please be wary of 'face-slimming' programs — especially any involving restrictive eating. Your face is not a problem to solve.",
        },
      ],
      confidence: 'medium',
      source_ids: ['R15', 'CLAIMS-POLICY'],
      requires_professional_review: false,
    },
  },
  {
    id: 'sunscreen-why',
    patterns: [/\bsunscreen|spf|sun protection|sunblock/i, /why\b.{0,20}\b(spf|sunscreen|sun cream)/i],
    answer: {
      intent: 'education',
      summary:
        "Because UV is the most consistent external driver of visible skin aging — and daily broad-spectrum SPF 30+ is the best-supported habit in dermatology guidance (Tier A). It helps protect; it doesn't reverse anything. Clouds and window light count too, which is why 'every morning' is the honest advice rather than the dramatic one.",
      recommended_actions: [{ activity_id: 'daily-sunscreen', reason: 'Two finger-lengths — face, neck, ears' }],
      warnings: [],
      confidence: 'high',
      source_ids: ['R26', 'R39', 'R7'],
      requires_professional_review: false,
    },
  },
  {
    id: 'retinol-vitamin-c',
    patterns: [/\bretinol|retinoid|retinal\b/i, /\bvitamin c\b/i, /\b(layer|combine|mix|together)\b.{0,40}\b(retinol|vitamin c|actives?|serums?)/i, /\bahas?\b|\bbhas?\b|exfoliating acids?/i],
    answer: {
      intent: 'education',
      summary:
        "You can — just not necessarily at the same moment. A calm, dermatologist-consistent pattern: vitamin C in the morning under sunscreen, retinoid at night, introduced slowly. One active at a time, patch-tested on the jawline for 24 hours, so any reaction has exactly one suspect. If your skin stings or flakes, scale back before adding anything new.",
      recommended_actions: [{ activity_id: 'one-active-intro', reason: 'How to add any active without the guesswork' }],
      warnings: [
        { code: 'SAFE-PREG-RET', message: 'Pregnant or trying? Pause retinoids and confirm your whole shelf with a qualified professional.' },
      ],
      confidence: 'high',
      source_ids: ['R18', 'R26'],
      requires_professional_review: false,
    },
  },
  {
    id: 'sting-new-serum',
    patterns: [/\b(sting|stung|burn|burning|tingle|itch|itchy|red|flaky|peeling|react|reaction|rash)\b.{0,45}\b(serum|cream|product|active|retinoid|acid|moisturizer|cleanser|skin|face)/i, /\b(serum|cream|product|active)\b.{0,30}\b(sting|stung|burn|itch|hurt)/i, /my skin\b.{0,25}\b(sting|burn|hurt|red|angry|irritat)/i],
    answer: {
      intent: 'education',
      summary:
        "Stop that one product — not the habit. Burning isn't 'working'; it's a signal. Go back to basics for a few days (gentle cleanse, simple moisturizer, SPF), then reintroduce later one at a time, patch-tested on the jawline. If the stinging continues after you've stopped, or you notice hives or swelling, that's a job for a professional — and that's a win, not a worry.",
      recommended_actions: [{ activity_id: 'barrier-reset', reason: 'A quiet week for your skin barrier' }],
      warnings: [
        { code: 'SAFE-IRR-01', message: "Persistent burning, hives, or swelling after stopping products deserves a clinician — Help has the full 'pause and call' list." },
      ],
      confidence: 'high',
      source_ids: ['R26', 'R39'],
      requires_professional_review: false,
    },
  },
  {
    id: 'depuff-morning',
    patterns: [/\bde-?puff|puffy|puffiness|swollen (eyes|face)|bloated face|morning face|eye bags?|bags under/i],
    answer: {
      intent: 'education',
      summary:
        "A few honest options. A cool compress and a gentle outward glide may temporarily ease the look of morning puffiness for some people — that's Tier B: limited evidence, temporary effects. Sleep, salt, and allergies usually play a bigger role than any stroke. And if puffiness ever arrives suddenly, one-sided, or with other symptoms, that deserves a professional's eyes instead.",
      recommended_actions: [
        { activity_id: 'morning-depuff-glide', reason: 'Ring fingers only, outward and down' },
        { activity_id: 'cool-compress-depuff', reason: 'The calmest two minutes in the app' },
      ],
      warnings: [
        { code: 'REFERRAL', message: 'Sudden or one-sided swelling is a pause-and-call moment — see Help for the full list.' },
      ],
      confidence: 'medium',
      source_ids: ['CONTENT-014', 'CONTENT-034', 'R15'],
      requires_professional_review: false,
    },
  },
  {
    id: 'pregnant-avoid',
    patterns: [/\bpregnan|trying to (conceive|get pregnant)|expecting|\bttc\b/i],
    answer: {
      intent: 'education',
      summary:
        "The short answer: pause retinoids, keep everything gentle, and let your clinician confirm the rest. Tell LumaFace in your safety answers and your plan pauses retinoid education automatically. Skincare basics — gentle cleanse, moisturizer, SPF — remain the calm core. Skip massage and movement over anything healing, and check each active on your shelf with your professional.",
      recommended_actions: [
        { activity_id: 'am-gentle-cleanse', reason: 'The gentle core, always pregnancy-considerate' },
        { activity_id: 'daily-sunscreen', reason: 'Daily protection your clinician would sign' },
      ],
      warnings: [{ code: 'SAFE-PREG-RET', message: 'Retinoids and pregnancy do not mix — pause them and confirm with your clinician.' }],
      confidence: 'high',
      source_ids: ['R18', 'R26'],
      requires_professional_review: false,
    },
  },
  {
    id: 'keep-missing-days',
    patterns: [/\b(miss|missing|missed|skip|skipping|skipped|forgot|forget|fell off|gave up|quit)\b.{0,30}\b(day|days|ritual|routine|habit|streak|session)/i, /\b(can'?t|cannot|hard to)\b.{0,25}\b(stick|keep up|stay consistent|be consistent)/i, /\bunmotivated|streak broke|lost my streak|keep\b.{0,15}\bhabit/i],
    answer: {
      intent: 'routine_adjustment',
      summary:
        "That makes you entirely normal — habits wobble. Two gentle ideas: shrink the goal (your 3-minute essentials still count as a full day), and anchor the ritual to something you already do, like morning coffee. Want me to switch this week to 3-minute days?",
      recommended_actions: [{ activity_id: 'am-gentle-cleanse', reason: 'Two unhurried minutes still count' }],
      warnings: [],
      confidence: 'medium',
      source_ids: ['HABIT-NOTES'],
      requires_professional_review: false,
    },
  },
  {
    id: 'what-cant-you-do',
    patterns: [/what can you (not|n'?t)\b/i, /\b(what|which)\b.{0,25}\b(can'?t|cannot|won'?t|can not)\b.{0,25}\b(help|do|answer)/i, /\byour (limits?|limitations?|boundaries)\b/i],
    answer: {
      intent: 'education',
      summary:
        "Happy to be clear about it. I can't diagnose or interpret symptoms, rate or compare anyone's appearance, or advise about someone other than you — and for anything urgent I'll always point to a professional. What I'm good at: routines, ingredients, evidence, massage and movement guidance, and keeping the habit kind.",
      recommended_actions: [],
      warnings: [],
      confidence: 'high',
      source_ids: ['CLAIMS-POLICY', 'AI-DISCLOSURE'],
      requires_professional_review: false,
    },
  },
  {
    id: 'fine-lines',
    patterns: [/\bfine lines?\b|\bwrinkles?\b|crow'?s feet|frown lines?|forehead lines?|smile lines?|\baging\b|\bageing\b|anti-?aging/i],
    answer: {
      intent: 'education',
      summary:
        "Kind, realistic talk: daily sunscreen is the best-supported step for the look of fine lines over time (Tier A) — it helps protect; it doesn't reverse. Massage and movement are Tier B and C: relaxing, maybe a temporary freshness, no structural promises. Lines from expression and time are normal; we care for skin, we don't erase stories.",
      recommended_actions: [
        { activity_id: 'daily-sunscreen', reason: 'The unglamorous hero of line care' },
        { activity_id: 'brow-tension-awareness', reason: 'Release the furrow habit, gently' },
      ],
      warnings: [],
      confidence: 'medium',
      source_ids: ['R33', 'R6'],
      requires_professional_review: false,
    },
  },
  {
    id: 'acne-blemishes',
    patterns: [/\bacne\b|\blemish|blemishes|breakout|breaking out|\bpimples?\b|\bzits?\b|blackheads?|cystic/i],
    answer: {
      intent: 'education',
      summary:
        "Gentle is the whole game: a mild cleanse, no picking, no stripping — and one proven active at a time if you use them. What I can't do is treat acne. If it's severe, scarring, or suddenly much worse, a dermatologist can genuinely help — that's treatment, not cosmetic care, and it works.",
      recommended_actions: [{ activity_id: 'pm-cleanse-unwind', reason: 'Mild, thorough, never scrubbing' }],
      warnings: [{ code: 'REFERRAL', message: 'Severe or scarring acne deserves a dermatologist — Help explains when to pause and call.' }],
      confidence: 'medium',
      source_ids: ['R32', 'R40'],
      requires_professional_review: false,
    },
  },
  {
    id: 'dry-skin',
    patterns: [/\b(dry|dryness|tight|tightness|flaky|flaking|dehydrated skin|rough patches?)\b/i],
    answer: {
      intent: 'education',
      summary:
        "Tight, flaky skin usually asks for less, not more: lukewarm (never hot) water, a gentle cleanse, and moisturizer pressed onto slightly damp skin to seal water in. If dryness comes with persistent redness or itching, a professional can check whether it's more than dryness.",
      recommended_actions: [{ activity_id: 'am-moisturizer', reason: "Press, don't rub — damp skin drinks better" }],
      warnings: [],
      confidence: 'high',
      source_ids: ['R26', 'R39'],
      requires_professional_review: false,
    },
  },
  {
    id: 'jaw-tension',
    patterns: [/\b(jaw|tmj|clench|clenching|grind|grinding|bruxism)\b/i, /\b(tension|stress)\b.{0,25}\b(jaw|face|forehead|temple)/i],
    answer: {
      intent: 'education',
      summary:
        "Jaw tension responds beautifully to awareness: teeth apart, lips softly together, tongue resting on the palate. A few slow releases beat forceful stretches every time. One honest limit: a painful click, locking, or pain that keeps worsening belongs with a dentist or clinician — not an app.",
      recommended_actions: [
        { activity_id: 'neutral-jaw-rest', reason: 'Teeth apart, shoulders down — the reset' },
        { activity_id: 'lower-face-release', reason: 'Let the jaw hang heavy for a minute' },
      ],
      warnings: [{ code: 'SAFE-JAW-01', message: 'Painful clicking or locking? Pause jaw work and see a professional.' }],
      confidence: 'medium',
      source_ids: ['CONTENT-051', 'CONTENT-053'],
      requires_professional_review: false,
    },
  },
  {
    id: 'massage-gua-sha-how',
    patterns: [/\b(gua ?sha|face roller|jade roller|facial massage|massage)\b/i],
    answer: {
      intent: 'education',
      summary:
        "Light pressure, always — the stone glides, it never scrapes. Work outward and then down toward the neck, on skin with slip (a little moisturizer), a few unhurried passes per zone. The honest framing is Tier B: relaxation, and maybe a temporary change in the look of puffiness. Skip it entirely over healing skin or after a recent procedure until your practitioner agrees.",
      recommended_actions: [
        { activity_id: 'gentle-facial-massage', reason: 'The foundational sequence' },
        { activity_id: 'gentle-gua-sha', reason: 'Three passes per zone, feather pressure' },
      ],
      warnings: [],
      confidence: 'medium',
      source_ids: ['CONTENT-011', 'CONTENT-017', 'R15'],
      requires_professional_review: false,
    },
  },
  {
    id: 'neck-posture',
    patterns: [/\b(neck|posture|tech neck|text neck|shoulders?|slouch|hunch|desk)\b/i],
    answer: {
      intent: 'education',
      summary:
        "All those looking-down hours add up — gently. Short, frequent resets beat long stretches: shoulders up-back-down, the chin gliding straight back with gaze level, a slow side-neck stretch. Comfort, not correction, is the goal.",
      recommended_actions: [
        { activity_id: 'chin-retraction', reason: 'Glide straight back, chin level' },
        { activity_id: 'shoulder-reset', reason: 'Three slow rolls, any time' },
      ],
      warnings: [],
      confidence: 'medium',
      source_ids: ['CONTENT-041', 'CONTENT-043'],
      requires_professional_review: false,
    },
  },
  {
    id: 'eyes-dark-circles',
    patterns: [/\b(dark circles?|under[- ]eye|tired eyes?|eye strain|screen eyes?)\b/i],
    answer: {
      intent: 'education',
      summary:
        "Honest answer first: dark circles are mostly genetics, sleep and anatomy — no stroke or cream erases them, and anyone promising that is overclaiming. What can help the look of a tired eye area: rest, a cool compress, and soft-eye relaxation to unclench. Eye pain, vision changes, or a recent knock to the eye? Professional territory, immediately.",
      recommended_actions: [
        { activity_id: 'soft-eye-relaxation', reason: 'Palming — darkness and warmth, zero pressure' },
        { activity_id: 'cool-compress-depuff', reason: 'Cool, quiet, two minutes' },
      ],
      warnings: [{ code: 'SAFE-EYE-01', message: 'Vision changes or an eye injury — pause eye-area care and see a professional.' }],
      confidence: 'medium',
      source_ids: ['CONTENT-031', 'CONTENT-034'],
      requires_professional_review: false,
    },
  },
  {
    id: 'routine-order',
    patterns: [/\b(order|sequence|which first|what order|steps?)\b.{0,35}\b(routine|skincare|skin care|products?|apply)/i, /\bbasic routine|starting a routine|where (do i|to) start\b/i],
    answer: {
      intent: 'education',
      summary:
        "The simple order dermatology guidance supports: cleanse, then treat (one active, if you use one), then moisturizer — and SPF last, every morning. Evenings: cleanse away the day, then your active or just moisturizer. When in doubt, fewer steps done consistently beat a perfect shelf done rarely.",
      recommended_actions: [
        { activity_id: 'am-gentle-cleanse', reason: 'Step one — lukewarm and brief' },
        { activity_id: 'daily-sunscreen', reason: 'Always last, always daily' },
      ],
      warnings: [],
      confidence: 'high',
      source_ids: ['R26', 'R39', 'R7'],
      requires_professional_review: false,
    },
  },
  {
    id: 'results-timing',
    patterns: [/\b(how long|when will|how soon|results?|see (a )?(difference|change)|is it working)\b/i],
    answer: {
      intent: 'motivation',
      summary:
        "Comfort and habit come first — often within two weeks. Temporary de-puffing can be same-day. Anything structural, if it happens at all, is slow and personal — which is why we track your habits and how your skin feels, not your reflection. You're measuring the right things.",
      recommended_actions: [],
      warnings: [],
      confidence: 'medium',
      source_ids: ['R6', 'R15'],
      requires_professional_review: false,
    },
  },
  {
    id: 'procedure-fillers',
    patterns: [/\b(filler|fillers|botox|injectable|injectables|peel|chemical peel|microneedl|laser|facelift|surgery|procedure)\b/i],
    answer: {
      intent: 'education',
      summary:
        "Pause massage and movement until your practitioner clears you — tell LumaFace in your safety answers and your plan does this automatically. Skincare basics usually continue, but your clinician confirms the specifics, especially near injection sites and healing skin. Anything unusual after a procedure goes to your practitioner first.",
      recommended_actions: [],
      warnings: [{ code: 'SAFE-PROC-01', message: 'Recent procedure or injectables → massage and movement wait for practitioner clearance.' }],
      confidence: 'high',
      source_ids: ['CLAIMS-POLICY'],
      requires_professional_review: false,
    },
  },
];

/* ═══════════════════════ Retrieval + fallback ══════════════════════════ */

/** Goal-matched "Try these" rows for the honest fallback answer. */
function goalMatchedActions(goals: string[]): { activity_id: string; reason: string }[] {
  const picked: { activity_id: string; reason: string }[] = [];
  const seen = new Set<string>();
  const consider = (a: Activity, goalId: string) => {
    if (seen.has(a.activityId) || picked.length >= 2) return;
    seen.add(a.activityId);
    const goal = GOALS.find((g) => g.id === goalId);
    picked.push({ activity_id: a.activityId, reason: goal ? `A gentle fit for “${goal.name}”` : 'A gentle place to start' });
  };
  // free activities first, then the rest
  for (const goalId of goals) {
    for (const a of ACTIVITIES.filter((x) => x.free)) if (a.goalIds.includes(goalId)) consider(a, goalId);
  }
  for (const goalId of goals) {
    for (const a of ACTIVITIES) if (a.goalIds.includes(goalId)) consider(a, goalId);
  }
  if (picked.length === 0) {
    picked.push({ activity_id: 'neutral-jaw-rest', reason: 'Our gentlest start, always free' });
  }
  return picked;
}

export interface CoachContext {
  goals: string[];
}

/**
 * Answer a question from the approved library. Curated keyword matching
 * first; otherwise an honest low-confidence fallback with goal-matched
 * suggestions. Safety classification happens separately (classifySafety)
 * and always runs first in the page.
 */
export function answerQuestion(text: string, ctx: CoachContext): CoachAnswer {
  const t = text.trim();
  for (const curated of COACH_ANSWERS) {
    if (curated.patterns.some((p) => p.test(t))) return curated.answer;
  }
  return {
    intent: 'education',
    summary:
      "I don't have an approved answer for that yet — I'd rather say so than guess. I'm at my best on routines, ingredients, evidence, massage and movement, and staying motivated. Maybe one of these is a kind place to land:",
    recommended_actions: goalMatchedActions(ctx.goals),
    warnings: [],
    confidence: 'low',
    source_ids: ['APPROVED-LIBRARY'],
    requires_professional_review: false,
  };
}

/** The 8 suggested prompt chips (design/coach.md §2). */
export const SUGGESTED_PROMPTS = [
  'Is face yoga proven?',
  'Why sunscreen every day?',
  'Can I use retinol and vitamin C?',
  'My skin stung after a new serum',
  'How do I de-puff in the morning?',
  "I'm pregnant — what should I avoid?",
  'I keep missing days',
  'What can you not help with?',
] as const;

/** Free-tier daily question allowance (PRO = unlimited). */
export const FREE_DAILY_QUESTIONS = 3;
