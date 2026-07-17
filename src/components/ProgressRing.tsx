/**
 * ProgressRing (design.md §7.5) — SVG ring with rounded caps.
 * Default session size 260×260 (r=118, stroke 10); scales via `size`.
 * Track rgba(42,22,13,.08); progress in `color` (category deep / rose).
 * Optional breathing halo (§6.1) — pauses when `breathing` is false or
 * reduced motion is preferred.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProgressRingProps {
  /** 0..1 */
  value: number;
  /** px box size (default 260 session / 64 habit / 56 mini) */
  size?: number;
  /** progress stroke color */
  color?: string;
  strokeWidth?: number;
  /** animated breathing halo (session timer) */
  breathing?: boolean;
  /** center content (numeral, %, phase label) */
  children?: React.ReactNode;
  className?: string;
  /** animate fill on mount (default true) */
  animateFill?: boolean;
}

export default function ProgressRing({
  value,
  size = 260,
  color = '#A8465A',
  strokeWidth,
  breathing = false,
  children,
  className,
  animateFill = true,
}: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const sw = strokeWidth ?? (size >= 200 ? 10 : size >= 60 ? 6 : 5);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(value, 0), 1);
  const offset = c * (1 - clamped);
  const showHalo = breathing && !reduceMotion;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      {showHalo && (
        <motion.span
          className="absolute rounded-full"
          style={{ width: size - sw * 2, height: size - sw * 2, border: `2px solid ${color}` }}
          animate={{ scale: [1, 1.14], opacity: [0.35, 0] }}
          transition={{ duration: 1.9, ease: 'easeInOut', repeat: Infinity }}
          aria-hidden="true"
        />
      )}
      <motion.span
        className="absolute rounded-full"
        style={{ width: size, height: size }}
        animate={showHalo ? { scale: [1, 1.025, 1] } : undefined}
        transition={showHalo ? { duration: 1.9, ease: 'easeInOut', repeat: Infinity } : undefined}
        aria-hidden="true"
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(42,22,13,.08)" strokeWidth={sw} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={animateFill && !reduceMotion ? { strokeDashoffset: c } : { strokeDashoffset: offset }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.785, 0.135, 0.15, 0.86] }}
          />
        </svg>
      </motion.span>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  );
}
