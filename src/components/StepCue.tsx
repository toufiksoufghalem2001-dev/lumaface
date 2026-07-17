/**
 * StepCue (design.md §7.18) — guided player cue card above the ring.
 * Current step (title 19px, max 26ch, crossfade 0.4s) + next-step preview +
 * optional breathing cue chip (Wind icon + "breathe in… out…").
 * This card IS the session's caption track (§12).
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT_SOFT } from '@/lib/theme';

export interface StepCueProps {
  /** current step text (cued one at a time) */
  step: string;
  /** index used as the crossfade key */
  stepIndex: number;
  /** next step preview (caption ink-2) */
  nextStep?: string;
  /** breathing cue line from the activity record */
  breathingCue?: string;
  /** category deep color for the breathing chip */
  deepColor?: string;
  className?: string;
}

export default function StepCue({ step, stepIndex, nextStep, breathingCue, deepColor = '#7A5A24', className }: StepCueProps) {
  return (
    <div className={cn('flex flex-col items-center text-center gap-2', className)} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT_SOFT }}
          className="font-display font-semibold text-[19px] leading-[25px] text-ink max-w-[26ch]"
        >
          {step}
        </motion.p>
      </AnimatePresence>
      {nextStep && (
        <p className="text-caption text-ink-2 max-w-[30ch]">
          Next · {nextStep}
        </p>
      )}
      {breathingCue && (
        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption"
          style={{ color: deepColor, backgroundColor: 'rgba(255,255,255,.55)' }}
        >
          <Wind size={13} strokeWidth={1.75} aria-hidden="true" />
          {breathingCue}
        </span>
      )}
    </div>
  );
}
