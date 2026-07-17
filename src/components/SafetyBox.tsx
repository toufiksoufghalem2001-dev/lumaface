/**
 * SafetyBox (design.md §7.12) — calm, kind safety card. Never red, never
 * alarming. Used on activity detail, check-in, onboarding safety, help.
 *
 * <SafetyBox title="Skip this if…" items={[…]} stopItems={[…]} />
 * <SafetyBox.Urgent items={[…]} /> — §2.2 referral conditions only: ink icon,
 * title "Please pause and see a professional", plus a Help link row.
 *
 * Icon mapping note (lucide-react@0.562): LifeBuoy ✓, HeartHandshake ✓.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { HeartHandshake, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/theme';

export interface SafetyBoxProps {
  title: string;
  /** "Skip this if…" rows */
  items: string[];
  /** optional second group "Stop and rest if…" */
  stopItems?: string[];
  className?: string;
  children?: ReactNode;
}

function ItemRows({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="size-[6px] rounded-full bg-ink-3 mt-[6px] shrink-0" aria-hidden="true" />
          <span className="text-[13px] leading-[19px] text-ink-2">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SafetyBox({ title, items, stopItems, className, children }: SafetyBoxProps) {
  return (
    <div className={cn('bg-card rounded-[20px] border border-hairline p-[18px]', className)}>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-petal"
          style={{ backgroundColor: COLORS.cream2, color: COLORS.ink2 }}
          aria-hidden="true"
        >
          <HeartHandshake size={20} strokeWidth={1.75} />
        </span>
        <p className="text-body font-bold text-ink">{title}</p>
      </div>
      <div className="mt-3.5">
        <ItemRows items={items} />
      </div>
      {stopItems && stopItems.length > 0 && (
        <div className="mt-3.5 pt-3.5 border-t border-hairline">
          <p className="text-body font-bold text-ink mb-2.5">Stop and rest if…</p>
          <ItemRows items={stopItems} />
        </div>
      )}
      {children}
    </div>
  );
}

/** Urgent variant — §2.2 referral conditions only. Same calm layout, ink
 *  icon, fixed title, plus a LifeBuoy link row → /help. */
function SafetyBoxUrgent({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn('bg-card rounded-[20px] border border-hairline p-[18px]', className)} role="alert">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-petal"
          style={{ backgroundColor: COLORS.cream2, color: COLORS.ink }}
          aria-hidden="true"
        >
          <HeartHandshake size={20} strokeWidth={1.75} />
        </span>
        <p className="text-body font-bold text-ink">Please pause and see a professional</p>
      </div>
      <div className="mt-3.5">
        <ItemRows items={items} />
      </div>
      <Link
        to="/help"
        className="mt-3.5 flex items-center gap-2.5 rounded-tile bg-cream-2 px-3.5 py-3 text-[13px] font-medium text-ink min-h-[44px]"
      >
        <LifeBuoy size={16} className="shrink-0 text-ink-2" aria-hidden="true" />
        When to pause and see a professional — always in Help
      </Link>
    </div>
  );
}

SafetyBox.Urgent = SafetyBoxUrgent;
