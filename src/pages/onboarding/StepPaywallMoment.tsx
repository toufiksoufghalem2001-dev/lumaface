/**
 * Onboarding Step 8 — Soft paywall moment (onboarding.md). Not a hard gate:
 * a gentle bridge rendered inside the shared bottom Sheet over the plan
 * reveal. Single inline CTA → /paywall (the real subscription screen), plus
 * a clear "start free" path. Onboarding is already complete at this point —
 * PRO is never required to keep the plan.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { CalendarDays, Camera, LayoutGrid, X, type LucideIcon } from 'lucide-react';
import { EASE_OUT_SOFT } from '@/lib/theme';
import { LFButton } from '@/components/ui';

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: CalendarDays,
    title: 'This plan, adjusted every week',
    body: 'Weekly check-ins tune your 28 days to your comfort — paused, kept, or gently added.',
  },
  {
    icon: LayoutGrid,
    title: 'The full library of 24 activities',
    body: 'Massage, de-puff, movement, eye & forehead, posture and relaxation care — all labeled by evidence.',
  },
  {
    icon: Camera,
    title: 'Camera guidance & photo diary',
    body: 'On-device only, always optional, always yours to delete.',
  },
];

export default function StepPaywallMoment({
  onSeePlans,
  onStartFree,
}: {
  onSeePlans: () => void;
  onStartFree: () => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onStartFree}
          aria-label="Close and continue with the free tier"
          className="inline-flex size-[44px] -ms-2 items-center justify-center rounded-full text-ink-2"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <motion.p
        initial={{ opacity: 0, y: reduced ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.2 : 0.4, delay: reduced ? 0 : 0.05, ease: EASE_OUT_SOFT }}
        className="text-eyebrow uppercase text-rose"
      >
        Your first week is free
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: reduced ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.1, ease: EASE_OUT_SOFT }}
        className="font-display text-display-md text-ink mt-1"
      >
        Your plan grows <em className="italic">with</em> you.
      </motion.h2>

      <ul className="mt-4 flex flex-col gap-3">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <motion.li
            key={title}
            initial={{ opacity: 0, y: reduced ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.15 + i * 0.07, ease: EASE_OUT_SOFT }}
            className="flex items-start gap-3"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
              <Icon size={19} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-body font-bold text-ink">{title}</span>
              <span className="block text-caption text-ink-2 mt-0.5">{body}</span>
            </span>
          </motion.li>
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.4, ease: EASE_OUT_SOFT }}
        className="mt-5"
      >
        <LFButton onClick={onSeePlans}>See plans &amp; pricing</LFButton>
        <LFButton variant="ghost" onClick={onStartFree} className="mt-1 w-full min-h-[44px] underline underline-offset-2">
          Continue with the free tier
        </LFButton>
        <p className="mt-2 text-center text-caption text-ink-2">
          Free tier forever · Yearly &amp; monthly options inside · Demo build — no real charge is made
        </p>
      </motion.div>
    </div>
  );
}
