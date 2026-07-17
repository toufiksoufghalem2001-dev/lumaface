/**
 * TipTicker (design.md §7.6) — Lightbulb in gold petal blob + rotating tip
 * (2-line clamp) + "Tip" eyebrow. Crossfade 0.6s every 5.5s with 1px upward
 * drift; pauses on touch-hold and on reduced motion. Tap → Sheet with the
 * expanded tip + tier badge + honesty one-liner.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/theme';
import { TIPS, type Tip } from '@/data/content';
import Sheet from '@/components/Sheet';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import { PetalBlob } from '@/components/ui';

export interface TipTickerProps {
  className?: string;
  /** rotate tips automatically (default true) */
  autoRotate?: boolean;
}

export default function TipTicker({ className, autoRotate = true }: TipTickerProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(() => new Date().getDate() % TIPS.length);
  const [held, setHeld] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const rotating = autoRotate && !held && !reduceMotion;

  useEffect(() => {
    if (!rotating) return;
    timer.current = window.setInterval(() => setIndex((i) => (i + 1) % TIPS.length), 5500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [rotating]);

  const tip: Tip = TIPS[index];
  const openSheet = useCallback(() => setOpen(true), []);

  return (
    <>
      <motion.button
        type="button"
        onClick={openSheet}
        onPointerDown={() => setHeld(true)}
        onPointerUp={() => setHeld(false)}
        onPointerLeave={() => setHeld(false)}
        className={cn('w-full bg-card rounded-card shadow-card px-4 py-3.5 flex items-center gap-3 text-start min-h-[44px]', className)}
        aria-label={`Daily tip: ${tip.body} — tap to read more`}
      >
        <PetalBlob className="size-10 shrink-0" style={{ backgroundColor: 'rgba(201,162,39,.14)', color: COLORS.gold }}>
          <Lightbulb size={19} strokeWidth={1.75} />
        </PetalBlob>
        <span className="min-w-0 flex-1">
          <span className="block text-eyebrow uppercase text-ink-2">Tip</span>
          <span className="relative block h-[40px] overflow-hidden mt-0.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={tip.id}
                initial={{ opacity: 0, y: 1 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -1 }}
                transition={{ duration: 0.6 }}
                className="block text-[14px] leading-[20px] text-ink line-clamp-2"
              >
                {tip.body}
              </motion.span>
            </AnimatePresence>
          </span>
        </span>
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="Daily tip">
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Today's tip</p>
        <h3 className="font-display text-title text-ink mt-1 leading-[26px]">{tip.body.replace(/\s*\(Tier [ABC]\)$/, '')}</h3>
        {tip.tier && <EvidenceTierBadge tier={tip.tier} className="mt-3" />}
        <p className="text-body text-ink-2 mt-3.5">{tip.expanded}</p>
        <p className="text-caption text-ink-2 mt-4 border-t border-hairline pt-3.5">
          Why we're honest about this: trust is the whole product. Every tip passes the same evidence-tier
          language rules as the activity library — we'd rather under-promise.
        </p>
      </Sheet>
    </>
  );
}
