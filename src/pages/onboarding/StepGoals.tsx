/**
 * Onboarding Step 1 — Goals (onboarding.md): 9 goal cards, multi-select up to
 * 3 (enforced with a gentle refuse-wiggle + toast), counter chip, Continue
 * disabled until ≥1 selection.
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GOALS } from '@/data/content';
import { EASE_OUT_SOFT, SPRING_CHECK } from '@/lib/theme';
import { LFButton } from '@/components/ui';
import { ColumnToast, GOAL_ICONS, StepHead, useRise } from './shared';

const MAX_GOALS = 3;

export default function StepGoals({
  goals,
  onChange,
  onContinue,
}: {
  goals: string[];
  onChange: (goals: string[]) => void;
  onContinue: () => void;
}) {
  const rise = useRise();
  const reduced = useReducedMotion();
  const [wiggleId, setWiggleId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toggle = (id: string) => {
    if (goals.includes(id)) {
      onChange(goals.filter((g) => g !== id));
      return;
    }
    if (goals.length >= MAX_GOALS) {
      // gentle refusal — never a scolding
      setWiggleId(id);
      setToast('Three is plenty — deselect one to change.');
      return;
    }
    onChange([...goals, id]);
  };

  return (
    <div>
      <StepHead
        title={
          <>
            What would you like to <em className="italic">care for</em>?
          </>
        }
        subline="Choose up to three. These shape your plan — and you can change them anytime."
      />

      <motion.div {...rise(0.14, 12)} className="mt-4 flex justify-end">
        <span className="inline-flex h-[26px] items-center rounded-full bg-cream-2 px-3 text-label text-ink-2" aria-live="polite">
          {goals.length} of {MAX_GOALS} selected
        </span>
      </motion.div>

      <ul className="mt-3 flex flex-col gap-2.5">
        {GOALS.map((goal, i) => {
          const selected = goals.includes(goal.id);
          const Icon = GOAL_ICONS[goal.icon];
          return (
            <motion.li
              key={goal.id}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.15 + i * 0.05, ease: EASE_OUT_SOFT }}
            >
              <motion.button
                type="button"
                onClick={() => toggle(goal.id)}
                aria-pressed={selected}
                animate={wiggleId === goal.id && !reduced ? { x: [0, -4, 4, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
                onAnimationComplete={() => setWiggleId(null)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-[18px] border-[1.5px] p-3.5 text-start min-h-[44px] transition-colors duration-200',
                  selected ? 'border-rose bg-rose-tint' : 'border-hairline bg-card',
                )}
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-arch bg-cream-2 text-ink" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-bold text-ink">{goal.name}</span>
                  <span className="block text-caption text-ink-2 mt-0.5">{goal.descriptor}</span>
                </span>
                {selected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={SPRING_CHECK}
                    className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-rose text-white"
                    aria-hidden="true"
                  >
                    <Check size={12} strokeWidth={3} />
                  </motion.span>
                )}
              </motion.button>
            </motion.li>
          );
        })}
      </ul>

      <motion.div {...rise(0.5, 16)} className="mt-5">
        <LFButton disabled={goals.length === 0} onClick={onContinue}>
          Continue
        </LFButton>
      </motion.div>

      <ColumnToast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
