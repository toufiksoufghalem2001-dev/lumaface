/**
 * ComfortPrompt (design.md §7.16) — post-session + check-in comfort capture.
 * Three large tap targets: Sun "Comfortable" · Cloud "A little much" ·
 * CloudRain "Uncomfortable". Selecting 3 reveals a follow-up row:
 * "Any stinging, burning or redness?" Yes/No chips; Yes → barrier-reset
 * guidance. Copy never judges.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cloud, CloudRain, Sun, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING_CHECK } from '@/lib/theme';

export type ComfortLevel = 1 | 2 | 3;

export interface ComfortResult {
  comfortLevel: ComfortLevel;
  /** only collected when level 3 was chosen */
  irritationFlag: boolean;
}

const OPTIONS: { level: ComfortLevel; icon: typeof Sun; label: string; sub: string; response: string }[] = [
  { level: 1, icon: Sun, label: 'Comfortable', sub: 'Easy and pleasant', response: 'Lovely — gentle counts.' },
  { level: 2, icon: Cloud, label: 'A little much', sub: 'Felt like effort', response: "Noted — we'll keep it gentle." },
  { level: 3, icon: CloudRain, label: 'Uncomfortable', sub: 'Stung, pulled, or hurt', response: "Thank you for saying — we'll quiet things down." },
];

export interface ComfortPromptProps {
  /** category deep/tint for the selected state */
  deepColor?: string;
  tintColor?: string;
  onComplete: (result: ComfortResult) => void;
  className?: string;
}

export default function ComfortPrompt({ deepColor = '#33675C', tintColor = '#EBF5F2', onComplete, className }: ComfortPromptProps) {
  const [level, setLevel] = useState<ComfortLevel | null>(null);
  const [irritation, setIrritation] = useState<boolean | null>(null);

  const finish = (lvl: ComfortLevel, irr: boolean) => onComplete({ comfortLevel: lvl, irritationFlag: irr });

  return (
    <div className={cn('bg-card rounded-card shadow-card p-[18px]', className)}>
      <p className="font-display font-semibold text-[19px] leading-[25px] text-ink">How did that feel?</p>
      <div className="mt-3.5 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Comfort level">
        {OPTIONS.map(({ level: lvl, icon: Icon, label, sub }) => {
          const selected = level === lvl;
          return (
            <button
              key={lvl}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setLevel(lvl);
                if (lvl < 3) {
                  setIrritation(false);
                  window.setTimeout(() => finish(lvl, false), 450);
                }
              }}
              className={cn(
                'h-24 rounded-[18px] border flex flex-col items-center justify-center gap-1 px-1 relative transition-colors',
                selected ? 'border-[1.5px]' : 'border-hairline',
              )}
              style={selected ? { borderColor: deepColor, backgroundColor: tintColor } : undefined}
            >
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_CHECK}
                  className="absolute top-1.5 end-1.5 inline-flex size-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: deepColor, color: '#fff' }}
                  aria-hidden="true"
                >
                  <Check size={11} strokeWidth={3} />
                </motion.span>
              )}
              <Icon size={22} strokeWidth={1.75} style={{ color: selected ? deepColor : '#6B584B' }} aria-hidden="true" />
              <span className="text-[12.5px] leading-[16px] font-bold text-ink">{label}</span>
              <span className="text-[10.5px] leading-[13px] text-ink-2">{sub}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {level !== null && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-caption text-ink-2 overflow-hidden"
          >
            <span className="block pt-3">{OPTIONS[level - 1].response}</span>
          </motion.p>
        )}
        {level === 3 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3.5 border-t border-hairline mt-3">
              <p className="text-[13px] leading-[19px] text-ink">Any stinging, burning or redness?</p>
              <div className="mt-2.5 flex gap-2.5">
                {(['No', 'Yes'] as const).map((label) => {
                  const val = label === 'Yes';
                  const selected = irritation === val;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setIrritation(val);
                        window.setTimeout(() => finish(3, val), 350);
                      }}
                      className={cn(
                        'h-11 flex-1 rounded-full border text-label',
                        selected ? 'border-[1.5px]' : 'border-hairline text-ink-2',
                      )}
                      style={selected ? { borderColor: deepColor, backgroundColor: tintColor, color: deepColor } : undefined}
                      aria-pressed={selected}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-caption text-ink-2 pt-2.5">
                “Yes” routes your week to Barrier Reset guidance — skin first, always.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
