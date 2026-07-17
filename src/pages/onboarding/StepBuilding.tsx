/**
 * Onboarding Step 6 — Building your plan (interstitial, ~1.8s auto-advance).
 * Petal + rotating conic shimmer ring, crossfading ticker lines, and a tint
 * pre-morph toward Warm Ochre so the plan reveal (Step 7) arrives already
 * tinted. The parent runs the rules engine + plan build (completeOnboarding)
 * when this step's timer fires — the "engineering note" of onboarding.md §6.
 * Reduced motion: static ring/petal, single ticker line, instant tint.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CATEGORY_THEME, COLORS, EASE_SIGNATURE } from '@/lib/theme';
import { MarkPetal } from '@/components/illos';

const TICKER_LINES = [
  'Reading your goals',
  'Checking every activity against your safety answers',
  'Pacing your first week',
  'Adding honest expectations',
];

/** Auto-advance after ~1.8s. */
const HOLD_MS = 1800;
const TICK_MS = 700;

export default function StepBuilding({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [line, setLine] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduced) return; // no auto-rotating ticker under reduced motion
    const tick = window.setInterval(() => setLine((l) => (l + 1) % TICKER_LINES.length), TICK_MS);
    return () => window.clearInterval(tick);
  }, [reduced]);

  const tint = CATEGORY_THEME.skincare.tint;

  return (
    <motion.div
      initial={{ backgroundColor: COLORS.cream }}
      animate={{ backgroundColor: reduced ? COLORS.cream : tint }}
      transition={{ duration: 0.7, delay: HOLD_MS / 1000 - 0.7, ease: EASE_SIGNATURE }}
      className="-mx-5 px-5 min-h-[70vh] flex flex-col items-center justify-center text-center"
    >
      <div className="relative size-24">
        {/* rotating conic shimmer ring */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full p-[3px]"
          style={{
            background: `conic-gradient(from 0deg, rgba(168,70,90,0) 0deg, rgba(168,70,90,.55) 120deg, rgba(168,70,90,0) 240deg)`,
          }}
          animate={reduced ? {} : { rotate: 360 }}
          transition={reduced ? undefined : { duration: 2, ease: 'linear', repeat: Infinity }}
        >
          <span className="block size-full rounded-full" style={{ backgroundColor: tint }} />
        </motion.div>
        {/* breathing petal */}
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          animate={reduced ? {} : { scale: [1, 1.04, 1] }}
          transition={reduced ? undefined : { duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
          aria-hidden="true"
        >
          <MarkPetal className="size-16" />
        </motion.span>
      </div>

      <p className="font-display italic text-quote text-ink mt-6">“Composing your ritual…”</p>

      <div className="mt-2 h-[17px] flex items-center justify-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={reduced ? 'static' : line}
            initial={{ opacity: 0, y: reduced ? 0 : 1 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.3 }}
            className="text-caption text-ink-2"
          >
            {TICKER_LINES[reduced ? 0 : line]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
