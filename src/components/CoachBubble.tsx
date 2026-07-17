/**
 * CoachBubble (design.md §7.14) — chat bubble for /coach.
 * User: right-aligned ink bg, cream text, radius 20 (4px bottom-end).
 * Coach: left-aligned white card, hairline border, radius 20 (4px
 * bottom-start), MarkPetal 18px avatar. Renders the structured §4.3 answer:
 * summary → "Try these" rows → warnings → confidence + source chips.
 * Includes the three-dot typing indicator.
 */

import { motion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS, EASE_OUT_SOFT } from '@/lib/theme';
import type { CoachAnswer } from '@/lib/store';
import { ACTIVITY_BY_ID } from '@/data/activities';
import { SOURCES } from '@/data/content';
import { CoachMark } from '@/components/illos';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';

const CONFIDENCE_STYLE: Record<CoachAnswer['confidence'], { label: string; fg: string; bg: string }> = {
  high: { label: 'Confident', fg: COLORS.sageDeep, bg: '#F0F5EC' },
  medium: { label: 'Fairly sure', fg: '#7A5A24', bg: '#F7F0E2' },
  low: { label: "Not certain — here's why", fg: '#6B4E80', bg: '#F4EFF8' },
};

/* ── User bubble ───────────────────────────────────────────────────────── */

export function UserBubble({ text, className }: { text: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT_SOFT }}
      className={cn('flex justify-end', className)}
    >
      <div className="max-w-[82%] rounded-[20px] rounded-ee-[4px] bg-ink px-4 py-3 text-body text-cream">{text}</div>
    </motion.div>
  );
}

/* ── Coach bubble (plain or structured) ────────────────────────────────── */

export interface CoachBubbleProps {
  /** plain text (used when no structured answer) */
  text?: string;
  /** structured §4.3 answer */
  answer?: CoachAnswer;
  /** navigate handler for recommended activity rows */
  onActivityPress?: (activityId: string) => void;
  className?: string;
}

export function CoachBubble({ text, answer, onActivityPress, className }: CoachBubbleProps) {
  const conf = answer ? CONFIDENCE_STYLE[answer.confidence] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT_SOFT }}
      className={cn('flex items-start gap-2', className)}
    >
      <CoachMark className="size-[26px] shrink-0 mt-1" />
      <div className="max-w-[86%] rounded-[20px] rounded-es-[4px] border border-hairline bg-card px-4 py-3">
        <p className="text-body text-ink">{answer ? answer.summary : text}</p>

        {answer && answer.recommended_actions.length > 0 && (
          <div className="mt-3">
            <p className="text-eyebrow uppercase text-ink-2 mb-2">Try these</p>
            <div className="flex flex-col gap-2">
              {answer.recommended_actions.map((ra) => {
                const a = ACTIVITY_BY_ID.get(ra.activity_id);
                if (!a) return null;
                return (
                  <button
                    key={ra.activity_id}
                    type="button"
                    onClick={() => onActivityPress?.(ra.activity_id)}
                    className="flex items-center gap-2.5 rounded-tile border border-hairline px-3 py-2 text-start min-h-[44px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-bold text-ink truncate">{a.title}</span>
                      <span className="block text-caption text-ink-2 line-clamp-2">{ra.reason}</span>
                    </span>
                    <EvidenceTierBadge tier={a.evidenceTier} mini interactive={false} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {answer && answer.warnings.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            {answer.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-tile bg-cream-2 px-3 py-2.5">
                <HeartHandshake size={15} className="shrink-0 mt-[2px] text-ink-2" aria-hidden="true" />
                <p className="text-caption text-ink-2">{w.message}</p>
              </div>
            ))}
          </div>
        )}

        {answer && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-hairline pt-2.5">
            {conf && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: conf.fg, backgroundColor: conf.bg }}>
                {conf.label}
              </span>
            )}
            {answer.source_ids.length > 0 && <span className="text-[11px] text-ink-3">Based on:</span>}
            {answer.source_ids.map((id) => (
              <span key={id} className="rounded-full bg-cream-2 px-2 py-0.5 text-[11px] text-ink-2">
                {SOURCES[id]?.publisher ?? 'LumaFace library'}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Typing indicator (three pulsing dots in a coach shell) ────────────── */

export function CoachTyping({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-2', className)} aria-label="Coach is typing" role="status">
      <CoachMark className="size-[26px] shrink-0 mt-1" />
      <div className="rounded-[20px] rounded-es-[4px] border border-hairline bg-card px-4 py-3.5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-[7px] rounded-full bg-ink-3 animate-dot-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default CoachBubble;
