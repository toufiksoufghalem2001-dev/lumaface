/**
 * DisclaimerBlock (design.md §7.9) — the canonical wellness disclaimer.
 * caption 12px ink-2 on cream-2 well, radius 16, 14px padding, Info icon.
 * Copy is reused VERBATIM wherever the full disclaimer appears.
 */

import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DISCLAIMER_FULL } from '@/data/content';

export default function DisclaimerBlock({ className, copy }: { className?: string; copy?: string }) {
  return (
    <div className={cn('bg-cream-2 rounded-tile p-[14px] flex items-start gap-2.5', className)} role="note">
      <Info size={15} className="shrink-0 mt-[2px] text-ink-2" aria-hidden="true" />
      <p className="text-caption text-ink-2">{copy ?? DISCLAIMER_FULL}</p>
    </div>
  );
}
