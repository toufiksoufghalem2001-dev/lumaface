/**
 * Onboarding Step 2 — Safety screening (onboarding.md): 7 optional toggle
 * rows, kind live inline notes, and a calm referral card when a referral-class
 * answer is on. The rules engine (evaluateSafety) is called LIVE here so the
 * notes are engine-driven, never hand-rolled; the final authoritative
 * evaluation happens in completeOnboarding. Never red, never scary.
 */

import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { evaluateSafety, type Inventory, type SafetyAnswers } from '@/lib/rules';
import { SAFETY_QUESTIONS, type SafetyQuestionDef } from '@/data/content';
import { EASE_OUT_SOFT } from '@/lib/theme';
import SafetyBox from '@/components/SafetyBox';
import { LFButton } from '@/components/ui';
import { StepHead, useRise } from './shared';

/** Calm referral copy (onboarding.md Step 2 — "One honest note"). */
const REFERRAL_NOTE =
  'If you ever notice sudden facial weakness, one-sided swelling, severe pain, vision changes, or signs of infection, please pause the app and see a qualified professional — those deserve a person, not an app. You’ll always find this list under Help.';

export default function StepSafety({
  answers,
  inventory,
  onToggle,
  onContinue,
}: {
  answers: SafetyAnswers;
  inventory: Inventory;
  onToggle: (key: SafetyQuestionDef['key']) => void;
  onContinue: () => void;
}) {
  const rise = useRise();
  const reduced = useReducedMotion();

  // Live rules-engine evaluation — drives the kind notes + referral card.
  const liveEval = useMemo(() => evaluateSafety(answers, inventory), [answers, inventory]);
  const showReferral =
    liveEval.referrals.length > 0 || answers.openWoundOrInfection;

  return (
    <div>
      <StepHead
        title={
          <>
            A few <em className="italic">gentle</em> questions, for your safety.
          </>
        }
        subline="Some answers simply help us choose quieter activities for you. Nothing here is a diagnosis, and your answers stay on your device."
      />

      <motion.div {...rise(0.16, 14)} className="mt-4 flex items-start gap-2.5 rounded-tile bg-cream-2 p-3.5">
        <HeartHandshake size={16} className="shrink-0 mt-[2px] text-ink-2" aria-hidden="true" />
        <p className="text-caption text-ink-2">
          If any of these apply, we won't lock you out — we'll adapt. Some activities may pause, and we'll always show you why.
        </p>
      </motion.div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {SAFETY_QUESTIONS.map((q, i) => {
          const on = answers[q.key] === true;
          return (
            <motion.li
              key={q.key}
              initial={{ opacity: 0, y: reduced ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.2 + i * 0.05, ease: EASE_OUT_SOFT }}
              className="bg-card rounded-[18px] border border-hairline px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold text-ink">{q.title}</span>
                  <span className="block text-caption text-ink-2 mt-0.5">{q.helper}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={q.title}
                  onClick={() => onToggle(q.key)}
                  className={cn(
                    'relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200',
                    // "yes" is not a success state — rose-tint track + rose thumb, never sage
                    on ? 'bg-rose-tint' : 'bg-cream-2',
                  )}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className={cn(
                      'absolute top-[3px] size-[22px] rounded-full',
                      on ? 'end-[3px] bg-rose' : 'start-[3px] bg-white shadow-card',
                    )}
                  />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {on && q.onNote && (
                  <motion.div
                    key="note"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduced ? 0.15 : 0.3, ease: EASE_OUT_SOFT }}
                    className="overflow-hidden"
                  >
                    <p className="text-caption text-ink-2 pt-2">{q.onNote}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>

      {/* Calm referral card — appears when a §2.2-class answer is on */}
      <AnimatePresence initial={false}>
        {showReferral && (
          <motion.div
            key="referral"
            initial={{ opacity: 0, y: reduced ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.4, ease: EASE_OUT_SOFT }}
            className="mt-4"
          >
            <SafetyBox title="One honest note" items={[REFERRAL_NOTE]} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div {...rise(0.4, 16)} className="mt-5">
        <LFButton onClick={onContinue}>Continue</LFButton>
      </motion.div>
    </div>
  );
}
