/**
 * LumaFace core UI primitives (design.md §7.3–§7.4):
 * Primary / Tinted / Secondary / Ghost buttons, Chip, CategoryChip, Card.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_TAP } from '@/lib/theme';

/* ── Buttons (§7.3) ────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'tinted' | 'secondary' | 'ghost' | 'destructive';

export interface LFButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  /** category `deep` color for the tinted variant (inline style — dynamic) */
  tintColor?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-rose text-white font-bold shadow-glow-rose active:bg-rose-deep disabled:bg-ink-3 disabled:shadow-none',
  tinted: 'text-white font-bold disabled:opacity-50',
  secondary: 'border-[1.5px] border-ink/20 text-ink bg-transparent font-bold disabled:opacity-50',
  ghost: 'text-ink-2 font-medium bg-transparent h-auto min-h-0 px-2 disabled:opacity-50',
  destructive: 'bg-rose-deep text-white font-bold disabled:opacity-50',
};

/** LumaFace button — one component, five design.md variants. */
export const LFButton = forwardRef<HTMLButtonElement, LFButtonProps>(function LFButton(
  { variant = 'primary', tintColor, fullWidth = true, className, children, style, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={rest.disabled ? undefined : SPRING_TAP}
      className={cn(
        'min-h-[52px] rounded-full px-6 text-label inline-flex items-center justify-center gap-2 select-none',
        fullWidth && variant !== 'ghost' && 'w-full',
        VARIANT_CLASSES[variant],
        className,
      )}
      style={{ ...(variant === 'tinted' && tintColor ? { backgroundColor: tintColor } : undefined), ...style }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});

/* ── Chips (§7.4) ──────────────────────────────────────────────────────── */

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** 8px category dot color (CategoryChip) */
  dotColor?: string;
  children: ReactNode;
}

/** 34px filter chip; selected = ink bg + cream text. */
export function Chip({ selected = false, dotColor, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'h-[34px] shrink-0 rounded-full px-4 text-[13px] font-medium inline-flex items-center gap-2 transition-colors duration-150',
        selected ? 'bg-ink text-cream' : 'border border-hairline text-ink-2 bg-transparent',
        className,
      )}
      {...rest}
    >
      {dotColor && <span className="size-2 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ── Card (§7.4) ───────────────────────────────────────────────────────── */

export interface CardProps extends HTMLMotionProps<'div'> {
  /** tappable cards get spring-tap + pop shadow */
  tappable?: boolean;
  children: ReactNode;
}

/** White card, radius 22, card shadow, 18px padding. */
export function Card({ tappable = false, className, children, ...rest }: CardProps) {
  return (
    <motion.div
      whileTap={tappable ? SPRING_TAP : undefined}
      className={cn('bg-card rounded-card shadow-card p-[18px]', tappable && 'cursor-pointer hover:shadow-pop transition-shadow', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ── Petal blob (§5 accent shape) ──────────────────────────────────────── */

/** Decorative organic petal-blob used behind icons. */
export function PetalBlob({ className, style, children }: { className?: string; style?: React.CSSProperties; children?: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center justify-center rounded-petal', className)} style={style} aria-hidden={!children}>
      {children}
    </span>
  );
}
