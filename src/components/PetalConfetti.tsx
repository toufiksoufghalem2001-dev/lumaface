/**
 * PetalConfetti (design.md §6.6) — 26 code-drawn petals (category hue +
 * rose + gold) falling with per-petal x-drift ±60px, rotation ±180°,
 * 1.8–2.6s ease-in, staggered spawn over 0.4s. One-shot, then removed
 * from the DOM. Reduced motion → single 0.2s fade of a few static petals.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Petal } from '@/components/illos';
import { COLORS } from '@/lib/theme';

export interface PetalConfettiProps {
  /** fire the one-shot confetti */
  active: boolean;
  /** called after the last petal lands (parent removes from DOM) */
  onDone?: () => void;
  /** extra accent color (e.g. category hue) */
  accentColor?: string;
  /** number of petals (default 26; check-in celebration uses 8) */
  count?: number;
}

interface PetalSpec {
  x: number; // vw-ish start offset (% of container width)
  drift: number; // px
  rotate: number;
  duration: number;
  delay: number;
  size: number;
  color: string;
}

/** Deterministic pseudo-random from a seed (render-pure). */
function seeded(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function PetalConfetti({ active, onDone, accentColor = '#ECC1B4', count = 26 }: PetalConfettiProps) {
  const reduceMotion = useReducedMotion();

  const petals = useMemo<PetalSpec[]>(() => {
    const colors = [accentColor, COLORS.rose, COLORS.gold];
    return Array.from({ length: count }, (_, i) => ({
      x: (i / count) * 100 + (seeded(i * 3 + 1) * 8 - 4),
      drift: seeded(i * 3 + 2) * 120 - 60,
      rotate: seeded(i * 5 + 3) * 360 - 180,
      duration: 1.8 + seeded(i * 7 + 4) * 0.8,
      delay: seeded(i * 11 + 5) * 0.4,
      size: 10 + seeded(i * 13 + 6) * 10,
      color: colors[i % colors.length],
    }));
  }, [count, accentColor]);

  // reset when re-fired (React "adjust state when props change" pattern)
  const [finished, setFinished] = useState(false);
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    setFinished(false);
  }

  useEffect(() => {
    if (!active || finished) return;
    const total = reduceMotion ? 400 : 2600 + 400;
    const t = window.setTimeout(() => {
      setFinished(true);
      onDone?.();
    }, total);
    return () => window.clearTimeout(t);
  }, [active, finished, onDone, reduceMotion]);

  const visible = active && !finished;
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden="true">
      {petals.map((p, i) =>
        reduceMotion ? (
          <motion.span
            key={i}
            className="absolute"
            style={{ insetInlineStart: `${p.x}%`, top: '30%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.4 }}
          >
            <Petal color={p.color} className="block" />
          </motion.span>
        ) : (
          <motion.span
            key={i}
            className="absolute"
            style={{ insetInlineStart: `${p.x}%`, top: -24 }}
            initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '110vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.9] }}
            transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          >
            <Petal color={p.color} className="block" />
          </motion.span>
        ),
      )}
    </div>
  );
}
