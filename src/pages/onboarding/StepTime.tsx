/**
 * Onboarding Step 4 — Routine time & environment (onboarding.md): 3/5/10-minute
 * hero cards (5 min "Most loved"), then optional environment chip rows
 * (climate / time outdoors / budget). Writes profile fields; everything has a
 * gentle default so nothing here is required.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT_SOFT, SPRING_CHECK } from '@/lib/theme';
import { Chip, LFButton } from '@/components/ui';
import { StepHead, useRise } from './shared';

export interface TimeEnvValues {
  routineTime: 3 | 5 | 10;
  climate: 'dry' | 'temperate' | 'humid';
  outdoorTime: 'indoors' | 'some' | 'lots';
  budgetMode: 'none' | 'affordable' | 'standard' | 'premium';
}

const TIME_OPTIONS: { value: 3 | 5 | 10; descriptor: string; badge?: string }[] = [
  { value: 3, descriptor: 'The essentials — cleanse, protect, breathe' },
  { value: 5, descriptor: 'Essentials + one guided activity', badge: 'Most loved' },
  { value: 10, descriptor: 'The full quiet ritual' },
];

const ENV_GROUPS: {
  key: 'climate' | 'outdoorTime' | 'budgetMode';
  label: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'climate',
    label: 'Climate',
    options: [
      { value: 'dry', label: 'Dry' },
      { value: 'temperate', label: 'Temperate' },
      { value: 'humid', label: 'Humid' },
    ],
  },
  {
    key: 'outdoorTime',
    label: 'Time outdoors',
    options: [
      { value: 'indoors', label: 'Mostly indoors' },
      { value: 'some', label: 'An hour or two' },
      { value: 'lots', label: 'Lots of sun' },
    ],
  },
  {
    key: 'budgetMode',
    label: 'Budget for products',
    options: [
      { value: 'none', label: 'No products' },
      { value: 'affordable', label: 'Affordable' },
      { value: 'standard', label: 'Standard' },
      { value: 'premium', label: 'Premium' },
    ],
  },
];

export default function StepTime({
  values,
  onChange,
  onContinue,
}: {
  values: TimeEnvValues;
  onChange: (patch: Partial<TimeEnvValues>) => void;
  onContinue: () => void;
}) {
  const rise = useRise();
  const reduced = useReducedMotion();

  return (
    <div>
      <StepHead
        title={
          <>
            How much time feels <em className="italic">kind</em> each day?
          </>
        }
        subline="Start small. A ritual you keep beats a routine you quit."
      />

      {/* Time selector — the hero element */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        {TIME_OPTIONS.map((opt, i) => {
          const selected = values.routineTime === opt.value;
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => onChange({ routineTime: opt.value })}
              aria-pressed={selected}
              initial={{ opacity: 0, y: reduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.15 + i * 0.07, ease: EASE_OUT_SOFT }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative rounded-[20px] border-[1.5px] p-3 pt-4 text-center min-h-[44px] transition-colors duration-200',
                selected ? 'border-rose bg-rose-tint' : 'border-hairline bg-card',
              )}
            >
              {opt.badge && (
                <span className="absolute -top-2 inset-x-0 flex justify-center">
                  <span className="rounded-full bg-rose-tint border border-rose/30 px-2 py-[1px] text-[10px] font-bold text-rose">
                    {opt.badge}
                  </span>
                </span>
              )}
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_CHECK}
                  className="absolute top-2 end-2 inline-flex size-4 items-center justify-center rounded-full bg-rose text-white"
                  aria-hidden="true"
                >
                  <Check size={10} strokeWidth={3.5} />
                </motion.span>
              )}
              <span className="block font-display font-semibold text-[28px] leading-[32px] text-ink">
                {opt.value}
                <span className="text-[15px]"> min</span>
              </span>
              <span className="block text-caption text-ink-2 mt-1.5">{opt.descriptor}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Environment */}
      <motion.div {...rise(0.2, 14)}>
        <div className="mt-7 pt-5 border-t border-hairline">
          <p className="text-eyebrow uppercase text-ink-2">Your world</p>
          <div className="mt-4 flex flex-col gap-4">
            {ENV_GROUPS.map((group, gi) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.2 + gi * 0.06, ease: EASE_OUT_SOFT }}
              >
                <p className="text-label text-ink mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((opt) => (
                    <Chip
                      key={opt.value}
                      selected={values[group.key] === opt.value}
                      onClick={() => onChange({ [group.key]: opt.value } as Partial<TimeEnvValues>)}
                      className="min-h-[36px]"
                    >
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 16 }}
        animate={
          reduced
            ? { opacity: 1, y: 0 }
            : { opacity: 1, y: 0, scale: [1, 1.02, 1] }
        }
        transition={{
          opacity: { duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.4, ease: EASE_OUT_SOFT },
          y: { duration: reduced ? 0.2 : 0.5, delay: reduced ? 0 : 0.4, ease: EASE_OUT_SOFT },
          scale: { duration: 0.5, delay: 0.6 },
        }}
        className="mt-6"
      >
        <LFButton onClick={onContinue}>Continue</LFButton>
      </motion.div>
    </div>
  );
}
