/**
 * ActivityRow (design.md §7.4) — 64px arch-masked SVG thumb (category hue
 * tile) + name + meta line (duration · tier mini-badge · difficulty) +
 * Lock (ink-3) when PRO-gated, else chevron.
 */

import { motion } from 'framer-motion';
import { ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_THEME, SPRING_TAP, formatMinutes } from '@/lib/theme';
import type { Activity } from '@/data/activities';
import { FaceIllo } from '@/components/illos';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';

export interface ActivityRowProps {
  activity: Activity;
  /** PRO-gated for this user */
  locked?: boolean;
  onClick?: () => void;
  /** compact 48px variant (Today AM mini-stack) */
  compact?: boolean;
  /** replace chevron/lock with custom trailing node */
  trailing?: React.ReactNode;
  className?: string;
}

export default function ActivityRow({ activity, locked = false, onClick, compact = false, trailing, className }: ActivityRowProps) {
  const theme = CATEGORY_THEME[activity.category];
  const thumb = compact ? 'size-9' : 'w-16 h-[72px]';

  return (
    <motion.button
      type="button"
      whileTap={SPRING_TAP}
      onClick={onClick}
      className={cn('w-full flex items-center gap-3 text-start min-h-[44px]', className)}
      aria-label={`${activity.title} — ${formatMinutes(activity.durationSeconds)}, evidence tier ${activity.evidenceTier}${locked ? ', locked with PRO' : ''}`}
    >
      <span
        className={cn('shrink-0 overflow-hidden rounded-arch flex items-end justify-center', thumb)}
        style={{ backgroundColor: theme.hue }}
        aria-hidden="true"
      >
        <FaceIllo name={activity.media.illustration} className={compact ? 'size-9' : 'w-16 h-[72px]'} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-display font-semibold text-ink truncate', compact ? 'text-[15px] leading-[20px]' : 'text-[17px] leading-[22px]')}>
          {activity.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-2 flex-wrap">
          <span>{formatMinutes(activity.durationSeconds)}</span>
          <span aria-hidden="true">·</span>
          <EvidenceTierBadge tier={activity.evidenceTier} mini interactive={false} />
          <span aria-hidden="true">·</span>
          <span>{activity.difficulty}</span>
        </span>
      </span>
      {trailing ?? (
        locked ? (
          <Lock size={16} className="shrink-0 text-ink-3" aria-hidden="true" />
        ) : (
          <ChevronRight size={18} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
        )
      )}
    </motion.button>
  );
}
