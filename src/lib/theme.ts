/**
 * LumaFace theme constants — single source of truth for values that must be
 * used as inline styles (dynamic category/tier theming) and for framer-motion
 * easing tuples. Mirror of tailwind.config.js tokens (design.md §3–§6).
 */

/** Framer-motion easing tuples (design.md §6). */
export const EASE_SIGNATURE = [0.785, 0.135, 0.15, 0.86] as [number, number, number, number];
export const EASE_OUT_SOFT = [0.16, 1, 0.3, 1] as [number, number, number, number];

/** framer-motion spring presets (design.md §6). */
export const SPRING_SHEET = { type: 'spring', stiffness: 260, damping: 26 } as const;
export const SPRING_CHECK = { type: 'spring', stiffness: 300, damping: 20 } as const;
export const SPRING_DAY_DOT = { type: 'spring', stiffness: 320, damping: 24 } as const;

/** whileTap preset applied to every tappable card/button (§6 spring-tap). */
export const SPRING_TAP = { scale: 0.97 } as const;

/** Base palette (§3.1–§3.2). */
export const COLORS = {
  cream: '#FCFCF8',
  cream2: '#F7F2E9',
  creamBackdrop: '#F4EEE3',
  card: '#FFFFFF',
  ink: '#2A160D',
  ink2: '#6B584B',
  ink3: '#A08D7C',
  inkFrame: '#241309',
  hairline: '#ECE3D6',
  rose: '#A8465A',
  roseDeep: '#7E3145',
  roseTint: '#F7E7E6',
  plum: '#3E1D3A',
  violet: '#6A43C9',
  violetTint: '#F0EAFB',
  gold: '#C9A227',
  flame: '#E8862F',
  sage: '#5F8A5B',
  sageDeep: '#4A6B43',
} as const;

export type ActivityCategoryId =
  | 'skincare'
  | 'massage'
  | 'movement'
  | 'eye-forehead'
  | 'neck-posture'
  | 'relaxation';

/** Category signature sets (§3.3): tint = section bg, hue = illustration masks,
 *  deep = text/icons on tint (≥4.5:1 contrast on its tint). */
export const CATEGORY_THEME: Record<
  ActivityCategoryId,
  { name: string; tint: string; hue: string; deep: string; honestLine: string }
> = {
  skincare: {
    name: 'Skincare Foundation',
    tint: '#F7F0E2',
    hue: '#CBAC7A',
    deep: '#7A5A24',
    honestLine: 'Established guidance — the strongest evidence we have',
  },
  massage: {
    name: 'Facial Massage & De-Puff',
    tint: '#F0F5EC',
    hue: '#AAC6A2',
    deep: '#4A6B43',
    honestLine: 'Relaxation and possible temporary change in the look of puffiness',
  },
  movement: {
    name: 'Face Movement',
    tint: '#FBF0EB',
    hue: '#ECC1B4',
    deep: '#9C5844',
    honestLine: 'Preliminary evidence — enjoy as gentle practice, expect no reshaping',
  },
  'eye-forehead': {
    name: 'Eye & Forehead',
    tint: '#EDF4FB',
    hue: '#98C2E6',
    deep: '#2F6189',
    honestLine: 'Comfort first — the skin here is delicate, the claims modest',
  },
  'neck-posture': {
    name: 'Neck & Posture',
    tint: '#F4EFF8',
    hue: '#BFA8CE',
    deep: '#6B4E80',
    honestLine: 'For all the hours looking down — comfort, not correction',
  },
  relaxation: {
    name: 'Relaxation & Tension Release',
    tint: '#EBF5F2',
    hue: '#8FBFB5',
    deep: '#33675C',
    honestLine: 'Unclench, gently — awareness is the whole activity',
  },
};

export const CATEGORY_ORDER: ActivityCategoryId[] = [
  'skincare',
  'massage',
  'movement',
  'eye-forehead',
  'neck-posture',
  'relaxation',
];

/** Reserved category-adjacent tints (§3.3) — program/check-in theming. */
export const RESERVED_TINTS = {
  terracotta: { tint: '#F6E9E5', hue: '#C98B7B', deep: '#6E3A2E' },
  rosePetal: { tint: '#FBEFF1', hue: '#E3A6B2', deep: '#96455C' },
} as const;

/** Evidence tier badge colors (§3.4). */
export type EvidenceTierId = 'A' | 'B' | 'C';

export const TIER_THEME: Record<
  EvidenceTierId,
  { fg: string; bg: string; label: string; short: string }
> = {
  A: { fg: '#4A6B43', bg: '#F0F5EC', label: 'Tier A · Established guidance', short: 'A' },
  B: { fg: '#7A5A24', bg: '#F7F0E2', label: 'Tier B · Limited evidence', short: 'B' },
  C: { fg: '#6B4E80', bg: '#F4EFF8', label: 'Tier C · Preliminary evidence', short: 'C' },
};

/** Blush alpha used inside every Face* illustration (§11 style contract). */
export const ILLO_BLUSH = 'rgba(168,70,90,.18)';

/** Formats seconds as a compact minute label ("1 min", "3 min"). */
export function formatMinutes(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min`;
}
