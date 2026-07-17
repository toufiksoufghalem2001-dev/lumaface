/**
 * EvidenceTierBadge (design.md §7.11) — honest evidence labels, app-wide.
 * - Full: 26px pill, tier icon + "Tier A · Established guidance" (colors §3.4)
 * - Mini: 20px circle with tier letter (Playfair 600 11px) for list rows
 * - Tap (either) → "How we read the evidence" explainer Sheet.
 *
 * Icon mapping (lucide-react@0.562): tier A = ShieldCheck · tier B = Waves ·
 * tier C = FlaskConical.
 */

import { useState } from 'react';
import { ShieldCheck, Waves, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIER_THEME, type EvidenceTierId } from '@/lib/theme';
import Sheet from '@/components/Sheet';
import DisclaimerBlock from '@/components/DisclaimerBlock';

const TIER_ICONS = { A: ShieldCheck, B: Waves, C: FlaskConical } as const;

const TIER_EXPLAINERS: { tier: EvidenceTierId; body: string }[] = [
  { tier: 'A', body: 'Established guidance — the strongest evidence we have, like daily sun protection and gentle cleansing. Dermatologist-recommended guidance.' },
  { tier: 'B', body: 'Limited evidence — may help temporarily, like massage easing the look of morning puffiness. Effects vary and fade.' },
  { tier: 'C', body: 'Preliminary evidence — early research only, like face movement. Enjoy as gentle practice; no structural change is promised.' },
];

export interface EvidenceTierBadgeProps {
  tier: EvidenceTierId;
  mini?: boolean;
  /** show the explainer sheet on tap (default true) */
  interactive?: boolean;
  className?: string;
}

export default function EvidenceTierBadge({ tier, mini = false, interactive = true, className }: EvidenceTierBadgeProps) {
  const [open, setOpen] = useState(false);
  const theme = TIER_THEME[tier];
  const Icon = TIER_ICONS[tier];

  const badge = mini ? (
    <span
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-semibold',
        interactive && 'cursor-pointer',
        className,
      )}
      style={{ color: theme.fg, backgroundColor: theme.bg }}
      role={interactive ? 'button' : undefined}
      aria-label={`Evidence ${theme.label} — tap to learn how we read the evidence`}
      onClick={interactive ? (e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); } : undefined}
    >
      {tier}
    </span>
  ) : (
    <span
      className={cn(
        'inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium',
        interactive && 'cursor-pointer',
        className,
      )}
      style={{ color: theme.fg, backgroundColor: theme.bg }}
      role={interactive ? 'button' : undefined}
      aria-label={`Evidence ${theme.label} — tap to learn how we read the evidence`}
      onClick={interactive ? (e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); } : undefined}
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {theme.label}
    </span>
  );

  return (
    <>
      {badge}
      {interactive && (
        <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="How we read the evidence">
          <p className="text-eyebrow uppercase text-ink-2 mt-1">Honest labels</p>
          <h3 className="font-display text-display-md text-ink mt-1">How we read the evidence</h3>
          <div className="mt-4 flex flex-col gap-3">
            {TIER_EXPLAINERS.map(({ tier: t, body }) => {
              const RowIcon = TIER_ICONS[t];
              const rowTheme = TIER_THEME[t];
              return (
                <div key={t} className="flex items-start gap-3 rounded-tile border border-hairline p-3.5">
                  <span
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full"
                    style={{ color: rowTheme.fg, backgroundColor: rowTheme.bg }}
                  >
                    <RowIcon size={17} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-body font-bold text-ink">{rowTheme.label}</p>
                    <p className="text-caption text-ink-2 mt-0.5">{body}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-body text-ink mt-4 italic font-display text-[17px] leading-[24px]">
            “Some ideas are popular long before science catches up. We'd rather under-promise.”
          </p>
          <p className="text-caption text-ink-2 mt-2">
            We never make Tier-D claims: no beauty scores, no reshaping promises.
          </p>
          <DisclaimerBlock className="mt-4" />
        </Sheet>
      )}
    </>
  );
}
