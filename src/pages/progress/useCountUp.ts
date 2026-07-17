/**
 * useCountUp — serif-stat number tick (design.md §6.9): counts 0 → target
 * over ~0.8s on first view. Under reduced motion the value is instant.
 */

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export function useCountUp(target: number, duration = 0.8, delay = 0.3, active = true): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || reduceMotion || duration <= 0) return;
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (t: number) => {
      const p = Math.min(Math.max((t - start) / (duration * 1000), 0), 1);
      // ease-out cubic
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay, reduceMotion, active]);

  // reduced motion → the final number, instantly (§12)
  return reduceMotion ? target : value;
}
