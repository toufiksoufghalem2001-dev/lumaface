/**
 * BadgeCard (design.md §7.7) — 64px disc: earned = gold ring + ink icon +
 * soft gold glow; locked = cream-2 fill, ink-3 icon, 45% opacity + "locked"
 * aria. Name caption 11px beneath. Badges reward habits & care, never
 * appearance change.
 */

import { Sunrise, Flame, Gem, Flower2, Award, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/theme';
import type { BadgeDef } from '@/data/content';

const BADGE_ICONS = { Sunrise, Flame, Gem, Flower2, Award, Sun } as const;

export interface BadgeCardProps {
  badge: BadgeDef;
  /** ISO earned date when earned, undefined when locked */
  earnedAt?: string;
  /** gold shimmer sweep once (newly earned) */
  shimmer?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function BadgeCard({ badge, earnedAt, shimmer = false, onClick, className }: BadgeCardProps) {
  const earned = earnedAt !== undefined;
  const Icon = BADGE_ICONS[badge.icon];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex flex-col items-center gap-1.5 w-[72px] shrink-0 min-h-[44px]', className)}
      aria-label={`${badge.name} badge — ${earned ? `earned ${earnedAt}` : `locked. ${badge.criteria}`}`}
    >
      <span
        className={cn(
          'relative inline-flex size-16 items-center justify-center rounded-full overflow-hidden transition-opacity',
          earned ? 'shadow-glow-gold' : 'opacity-45',
        )}
        style={
          earned
            ? { backgroundColor: COLORS.card, border: `2px solid ${COLORS.gold}`, color: COLORS.ink }
            : { backgroundColor: COLORS.cream2, color: COLORS.ink3 }
        }
        aria-hidden="true"
      >
        <Icon size={24} strokeWidth={1.75} />
        {earned && shimmer && (
          <span
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(100deg, transparent 30%, rgba(201,162,39,.35) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
            }}
          />
        )}
      </span>
      <span className="text-[11px] leading-[14px] text-ink-2 text-center">{badge.name}</span>
    </button>
  );
}
