/**
 * Copy + small pure helpers shared by the activity flow pages
 * (detail / session / done). All strings follow design.md §9 voice rules:
 * Tier A "supports / helps protect" · Tier B "may temporarily" ·
 * Tier C "evidence is limited" — never "will erase / lifts permanently".
 */

import type { EvidenceTierId } from '@/lib/theme';

/* ── Contraindication plain language (activity.md §A4) ─────────────────── */

/**
 * Maps an activity's declared SAFE-* codes to kind, plain-language rows for
 * the SafetyBox "Skip this if…" group. The rules engine stays the only gate;
 * this is purely display copy.
 */
export const CONTRAINDICATION_COPY: Record<string, string> = {
  'SAFE-PREG-RET':
    "You're pregnant or trying — retinoid education pauses for now; pregnancy-safe guidance applies instead.",
  'SAFE-EYE-01':
    'Eye pain, vision changes, or a recent eye injury — skip eye-area work and see the guidance in Help.',
  'SAFE-FACE-01':
    'Any sudden facial weakness — stop the program here and see Help for urgent professional-care guidance.',
  'SAFE-PROC-01':
    "You've had a recent procedure or injectables — wait for your practitioner's green light.",
  'SAFE-SKIN-01':
    'An open wound, infection, or inflamed area — nothing touches broken or healing skin.',
  'SAFE-IRR-01':
    'Skin that is currently burning or escalating — this waits for calmer days (see Barrier Reset).',
  'SAFE-JAW-01':
    'Jaw pain or a painful click — this one rests; Neutral Jaw Rest is your home base instead.',
  'SAFE-BODY-01':
    'LumaFace never trades food or water for facial change — this activity stays gentle care only.',
};

/** Rows for SafetyBox, from an activity's contraindication codes. */
export function contraindicationRows(codes: string[]): string[] {
  return codes.map((c) => CONTRAINDICATION_COPY[c]).filter((x): x is string => Boolean(x));
}

/* ── Tier framing (activity.md §A4 / §C5) ──────────────────────────────── */

/** "What to expect, honestly" card — per-tier framing caption. */
export const TIER_FRAMING: Record<EvidenceTierId, string> = {
  A: 'This follows established dermatologist guidance.',
  B: 'Evidence here is limited; effects are temporary and vary from person to person.',
  C: 'This is experimental wellness practice. Research is preliminary; no structural change is guaranteed — enjoy it as gentle movement.',
};

/** Done screen "THE HONEST SUMMARY" — per-tier reminder caption. */
export const TIER_DONE_REMINDER: Record<EvidenceTierId, string> = {
  A: 'Established guidance — the most useful minutes in skincare.',
  B: "Temporary effects — today counts as relaxation, and that's enough.",
  C: "Preliminary evidence — you practiced gently, and that's the point.",
};

/** Compress an expectedOutcome record line to its honest first sentence. */
export function honestOneLiner(expectedOutcome: string): string {
  const first = expectedOutcome.split('. ')[0].trim();
  return first.endsWith('.') ? first : `${first}.`;
}

/* ── Color helpers ─────────────────────────────────────────────────────── */

/** Mix two hex colors (#rrggbb) — amount 0..1 toward `b`. */
export function mixHex(a: string, b: string, amount: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const mix = pa.map((va, i) => Math.round(va + (pb[i] - va) * amount));
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Category tint slightly deepened — the Session background (activity.md). */
export function deepenedTint(tint: string, deep: string): string {
  return mixHex(tint, deep, 0.07);
}
