/**
 * PlanDiffCard (design.md §7.15) — the weekly-adjustment summary card
 * (check-in reward). Eyebrow "YOUR WEEK, ADJUSTED"; three labeled groups:
 * Paused (45% + strike-through + reason), Kept (sage check), Added (sage
 * left-border + "new" chip). Animation per §6.10 (three-stage morph).
 * Graceful "No changes needed." state when the diff is empty.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS, EASE_OUT_SOFT } from '@/lib/theme';
import { ACTIVITY_BY_ID } from '@/data/activities';
import type { PlanDiff } from '@/lib/plan';
import { FaceIllo } from '@/components/illos';

export interface PlanDiffCardProps {
  diff: PlanDiff;
  className?: string;
}

function MiniRow({ activityId, dim, strike, added }: { activityId: string; dim?: boolean; strike?: boolean; added?: boolean }) {
  const a = ACTIVITY_BY_ID.get(activityId);
  if (!a) return null;
  return (
    <span className={cn('flex items-center gap-2.5 min-h-[36px]', dim && 'opacity-45')}>
      <span className="size-9 shrink-0 overflow-hidden rounded-arch" aria-hidden="true">
        <FaceIllo name={a.media.illustration} className="size-9" />
      </span>
      <span className={cn('text-[13.5px] leading-[18px] font-medium text-ink min-w-0 flex-1', strike && 'line-through')}>
        {a.title}
      </span>
      {added && (
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] rounded-full px-2 py-0.5" style={{ color: COLORS.sageDeep, backgroundColor: COLORS.sage + '22' }}>
          new
        </span>
      )}
    </span>
  );
}

export default function PlanDiffCard({ diff, className }: PlanDiffCardProps) {
  const reduceMotion = useReducedMotion();
  const empty = diff.paused.length === 0 && diff.added.length === 0;

  if (empty) {
    return (
      <div className={cn('bg-card rounded-card shadow-card p-[18px] text-center', className)}>
        <span className="mx-auto inline-flex size-11 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.sage + '22', color: COLORS.sageDeep }} aria-hidden="true">
          <Check size={22} strokeWidth={2} />
        </span>
        <p className="font-display text-title text-ink mt-3">No changes needed.</p>
        <p className="text-body text-ink-2 mt-1">Your plan and your skin agree this week. Same gentle rhythm ahead.</p>
      </div>
    );
  }

  const rows: { kind: 'paused' | 'kept' | 'added'; activityId: string; reason?: string }[] = [
    ...diff.paused.map((e) => ({ kind: 'paused' as const, ...e })),
    ...diff.kept.map((e) => ({ kind: 'kept' as const, ...e })),
    ...diff.added.map((e) => ({ kind: 'added' as const, ...e })),
  ];

  return (
    <div className={cn('bg-card rounded-card shadow-card p-[18px]', className)}>
      <p className="text-eyebrow uppercase text-ink-2">Your week, adjusted</p>
      <div className="mt-3 flex flex-col gap-1">
        {rows.map((row, i) => (
          <motion.div
            key={`${row.kind}-${row.activityId}`}
            initial={reduceMotion ? { opacity: 0 } : row.kind === 'added' ? { opacity: 0, x: 24 } : row.kind === 'paused' ? { opacity: 1 } : { opacity: 0, y: 4 }}
            animate={reduceMotion ? { opacity: 1 } : row.kind === 'added' ? { opacity: 1, x: 0 } : row.kind === 'paused' ? { opacity: 0.45 } : { opacity: 1, y: 0 }}
            transition={{ duration: row.kind === 'paused' ? 0.4 : 0.45, delay: i * 0.1, ease: EASE_OUT_SOFT }}
            className={cn(row.kind === 'added' && 'ps-2.5')}
            style={row.kind === 'added' ? { borderInlineStart: `3px solid ${COLORS.sage}` } : undefined}
          >
            <MiniRow activityId={row.activityId} dim={row.kind === 'paused'} strike={row.kind === 'paused'} added={row.kind === 'added'} />
            {row.kind === 'paused' && row.reason && <p className="text-caption text-ink-2 -mt-0.5 ms-[46px]">{row.reason}</p>}
            {row.kind === 'added' && row.reason && <p className="text-caption text-ink-2 -mt-0.5 ms-[46px]">{row.reason}</p>}
            {row.kind === 'kept' && (
              <span className="sr-only">kept</span>
            )}
          </motion.div>
        ))}
      </div>
      {diff.kept.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-caption" style={{ color: COLORS.sageDeep }}>
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          {diff.kept.length} {diff.kept.length === 1 ? 'moment' : 'moments'} kept steady
        </div>
      )}
      <p className="text-caption text-ink-2 mt-3 pt-3 border-t border-hairline">
        Changes follow your safety profile — your plan never adds anything you've flagged.
      </p>
    </div>
  );
}
