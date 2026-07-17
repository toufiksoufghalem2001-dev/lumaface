/**
 * QualityChips — the simulated capture-condition check (checkin.md §3,
 * progress.md §4). Chips describe LIGHT / FOCUS / FRAMING conditions only —
 * never anything about the face. A gentle retry hint appears when a capture
 * is too dark or too soft to be fairly compared later.
 */

import { motion } from 'framer-motion';
import { Check, CloudSun, Focus, Frame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/theme';
import type { CaptureQuality } from '@/lib/store';

interface QualityHint {
  id: 'lighting' | 'focus' | 'framing';
  label: string;
  ok: boolean;
  hint?: string;
}

/** Evaluate simulated quality metrics into chip states. */
function qualityHints(q: CaptureQuality): QualityHint[] {
  return [
    {
      id: 'lighting',
      label: 'Lighting',
      ok: q.lighting >= 0.35,
      hint: q.lighting >= 0.35 ? undefined : 'A little dark — try facing the window',
    },
    {
      id: 'focus',
      label: 'Focus',
      ok: q.blur <= 0.6,
      hint: q.blur <= 0.6 ? undefined : 'A little soft — hold the phone steady',
    },
    { id: 'framing', label: 'Framing', ok: q.pose >= 0.7 },
  ];
}

const ICONS = { lighting: CloudSun, focus: Focus, framing: Frame } as const;

export default function QualityChips({ quality, className }: { quality: CaptureQuality; className?: string }) {
  const hints = qualityHints(quality);
  const retry = hints.find((h) => !h.ok);
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {hints.map((h, i) => {
          const Icon = ICONS[h.id];
          return (
            <motion.span
              key={h.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24, delay: i * 0.05 }}
              className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold')}
              style={
                h.ok
                  ? { backgroundColor: COLORS.sage + '1E', color: COLORS.sageDeep }
                  : { backgroundColor: COLORS.cream2, color: COLORS.ink2 }
              }
            >
              <Icon size={12} strokeWidth={2} aria-hidden="true" />
              {h.label}
              {h.ok && <Check size={12} strokeWidth={2.5} aria-hidden="true" />}
            </motion.span>
          );
        })}
      </div>
      {retry?.hint && <p className="text-caption text-ink-2 mt-2">{retry.hint}</p>}
    </div>
  );
}
