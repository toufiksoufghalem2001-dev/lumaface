/* eslint-disable react-refresh/only-export-components --
   Onboarding-internal helper module: the entrance-preset hook and the goal
   icon map intentionally live beside the shared step components so the whole
   flow imports from one place (same convention as lib/store.tsx). */
/**
 * Onboarding shared helpers — step shell, entrance presets, the column toast,
 * goal icon map, and the code-drawn camera-guidance illustration (Step 5).
 * Consumed only by src/pages/Onboarding.tsx + src/pages/onboarding/*.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarHeart,
  CircleDot,
  CloudSun,
  Droplets,
  Feather,
  Palette,
  Sparkles,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT_SOFT, COLORS } from '@/lib/theme';
import type { GoalDef } from '@/data/content';

/* ── Motion presets (design.md §6 + onboarding.md step animations) ─────── */

/** Simple rise-and-fade entrance used across every step. */
export function useRise() {
  const reduced = useReducedMotion();
  return (delay = 0, y = 20) =>
    ({
      initial: { opacity: 0, y: reduced ? 0 : y },
      animate: { opacity: 1, y: 0 },
      transition: { duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : delay, ease: EASE_OUT_SOFT },
    }) as const;
}

/** Standard step header: optional eyebrow, display-md headline, subline. */
export function StepHead({
  eyebrow,
  title,
  subline,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subline?: ReactNode;
  className?: string;
}) {
  const rise = useRise();
  return (
    <div className={cn('max-w-[34ch]', className)}>
      {eyebrow && (
        <motion.p {...rise(0)} className="text-eyebrow uppercase text-ink-2">
          {eyebrow}
        </motion.p>
      )}
      <motion.h1 {...rise(eyebrow ? 0.06 : 0)} className="font-display text-display-md text-ink mt-1">
        {title}
      </motion.h1>
      {subline && (
        <motion.p {...rise(0.12)} className="text-body text-ink-2 mt-2">
          {subline}
        </motion.p>
      )}
    </div>
  );
}

/* ── Goal icons (data/content.ts GOALS → lucide) ───────────────────────── */

export const GOAL_ICONS: Record<GoalDef['icon'], LucideIcon> = {
  Sparkles,
  Droplets,
  Sun,
  CircleDot,
  Palette,
  Feather,
  Waves,
  CloudSun,
  CalendarHeart,
};

/* ── Column toast (portals into the phone frame, like Sheet) ───────────── */

export function ColumnToast({ message, onDone }: { message: string | null; onDone: () => void }) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after first commit
    setFrame(document.getElementById('lf-phone-frame'));
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(t);
  }, [message, onDone]);

  if (!frame) return null;
  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          key="toast"
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
          className="absolute bottom-6 inset-x-0 z-40 flex justify-center px-8 pointer-events-none"
        >
          <span className="bg-ink text-cream text-caption px-4 py-2.5 rounded-full shadow-pop text-center">
            {message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>,
    frame,
  );
}

/* ── Camera guidance illustration (onboarding.md Step 5, code-drawn) ──────
 * Powder Blue arch tile, serene face, neutral rounded-corner guidance frame
 * + centering dots. No landmarks on skin, no red marks (design.md §11). */
export function CameraGuidanceIllo({ className }: { className?: string }) {
  const ink = COLORS.ink;
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Illustration: a serene face inside a soft neutral camera-guidance frame">
      {/* arch tile — Powder Blue hue */}
      <rect width="200" height="200" fill="#98C2E6" />
      {/* hair */}
      <path d="M100 44c-26 0-40 18-40 42v18c0 6 4 10 8 10 2 0 3-1 4-3-2-8-3-16-3-23 0-18 12-32 31-32s31 14 31 32c0 7-1 15-3 23 1 2 2 3 4 3 4 0 8-4 8-10v-18c0-24-14-42-40-42z" fill="#3D2B22" />
      {/* face */}
      <ellipse cx="100" cy="106" rx="30" ry="36" fill="#D89B74" />
      {/* serene closed eyes */}
      <path d="M84 100c3 3 8 3 11 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M105 100c3 3 8 3 11 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* nose line */}
      <path d="M100 104v10c0 2-1 3-3 3" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* gentle neutral mouth */}
      <path d="M92 126c4 3 12 3 16 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      {/* soft blush */}
      <circle cx="82" cy="116" r="6" fill="rgba(168,70,90,.18)" />
      <circle cx="118" cy="116" r="6" fill="rgba(168,70,90,.18)" />
      {/* shoulders hint */}
      <path d="M62 178c6-22 20-30 38-30s32 8 38 30" fill="#EFE7DA" />
      {/* neutral guidance frame — rounded corners only */}
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity="0.75">
        <path d="M48 78v-12c0-8 6-14 14-14h12" />
        <path d="M126 52h12c8 0 14 6 14 14v12" />
        <path d="M152 128v12c0 8-6 14-14 14h-12" />
        <path d="M74 154h-12c-8 0-14-6-14-14v-12" />
      </g>
      {/* centering dots */}
      <circle cx="100" cy="34" r="3" fill={ink} opacity="0.55" />
      <circle cx="100" cy="172" r="3" fill={ink} opacity="0.55" />
      <circle cx="34" cy="103" r="3" fill={ink} opacity="0.55" />
      <circle cx="166" cy="103" r="3" fill={ink} opacity="0.55" />
    </svg>
  );
}
