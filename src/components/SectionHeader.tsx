/**
 * SectionHeader (design.md §7.10) — eyebrow + title + optional right action.
 * 32px above, 14px below.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  eyebrow: string;
  title?: ReactNode;
  /** right action label (label style, rose) */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function SectionHeader({ eyebrow, title, actionLabel, onAction, className }: SectionHeaderProps) {
  return (
    <div className={cn('mt-8 mb-[14px] flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <p className="text-eyebrow uppercase text-ink-2">{eyebrow}</p>
        {title && <h2 className="font-display text-title text-ink mt-1">{title}</h2>}
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-label text-rose shrink-0 pb-[2px] min-h-[44px] inline-flex items-center"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
