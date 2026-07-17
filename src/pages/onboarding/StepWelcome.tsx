/**
 * Onboarding Step 0 — Welcome (onboarding.md): hero still-life in arch mask,
 * brand lockup, tagline, promise card, explicit 18+ adult confirmation, Begin
 * CTA + "Take a look around first" ghost. The Begin tap IS the 18+ confirmation
 * (lf_profile.adultConfirmed=true is recorded by the flow) — you cannot proceed
 * without it.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { FolderLock, ShieldCheck, Sparkles, UserRoundCheck, type LucideIcon } from 'lucide-react';
import { LFButton } from '@/components/ui';
import { MarkPetal } from '@/components/illos';
import { EASE_OUT_SOFT } from '@/lib/theme';
import { useRise } from './shared';

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Sparkles, title: 'A plan made for you', body: '3, 5 or 10 minutes a day, built from your goals.' },
  { icon: ShieldCheck, title: 'Honest about evidence', body: 'Every activity is labeled with how strong the science is.' },
  // ImageLock does not exist in lucide-react@0.562 — FolderLock is the documented substitution.
  { icon: FolderLock, title: 'Private by design', body: 'Live camera analysis stays on your device. Your photos never leave it.' },
];

export default function StepWelcome({ onBegin, onLookAround }: { onBegin: () => void; onLookAround: () => void }) {
  const rise = useRise();
  const reduced = useReducedMotion();

  return (
    <div>
      {/* Hero — full-bleed to column edges, arch mask, gentle Ken Burns */}
      <motion.div
        initial={{ opacity: 0, scale: reduced ? 1 : 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0.2 : 0.9, ease: EASE_OUT_SOFT }}
        className="-mx-5 h-[62vw] max-h-[400px] overflow-hidden rounded-arch-lg"
      >
        <motion.img
          src="/hero-still-life.png"
          alt="A jade roller and gua sha stone resting on cream linen beside moisturizer, sunscreen and rose petals"
          className="w-full h-full object-cover"
          initial={{ scale: 1 }}
          animate={reduced ? { scale: 1 } : { scale: 1.06 }}
          transition={{ duration: 14, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Brand lockup — overlaps the hero bottom by 28px */}
      <motion.div {...rise(0.3)} className="-mt-7 flex items-center gap-2.5">
        <motion.span
          initial={{ opacity: 0, scale: reduced ? 1 : 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0.2 : 0.8, delay: reduced ? 0 : 0.3, ease: EASE_OUT_SOFT }}
          className="inline-flex"
          aria-hidden="true"
        >
          <MarkPetal className="size-7" />
        </motion.span>
        <span className="font-display text-display-lg text-ink">LumaFace</span>
      </motion.div>

      <motion.p {...rise(0.42)} className="font-display italic text-quote text-ink mt-2 max-w-[30ch]">
        “A few quiet minutes a day, guided by evidence — never by judgment.”
      </motion.p>

      {/* Promise card */}
      <motion.div {...rise(0.45, 16)} className="mt-5 bg-card rounded-[20px] shadow-card p-4">
        <ul className="flex flex-col gap-3.5">
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              initial={{ opacity: 0, y: reduced ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.45 + i * 0.08, ease: EASE_OUT_SOFT }}
              className="flex items-center gap-3"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-body font-bold text-ink">{title}</span>
                <span className="block text-caption text-ink-2 mt-0.5">{body}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Explicit 18+ adult confirmation — continuing is impossible without the tap */}
      <motion.p {...rise(0.7, 10)} className="mt-5 flex items-start justify-center gap-1.5 text-caption text-ink-2 text-center px-2">
        <UserRoundCheck size={15} className="shrink-0 mt-[1px]" aria-hidden="true" />
        <span>LumaFace is designed for adults. By continuing you confirm you're 18 or older.</span>
      </motion.p>

      <motion.div {...rise(0.8, 16)} className="mt-4">
        <LFButton onClick={onBegin}>Begin</LFButton>
        <LFButton variant="ghost" onClick={onLookAround} className="mt-1 w-full min-h-[44px]">
          Take a look around first
        </LFButton>
      </motion.div>
    </div>
  );
}
