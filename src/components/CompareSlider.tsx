/**
 * CompareSlider (design.md §7.17) — before/after photo compare, consent-
 * gated. Draggable vertical handle, 44px hit area, ink line with chevron
 * knobs, spring return to 50% on release. Photos object-fit cover, radius 22.
 * Only ever compares the user with themselves, only when capture conditions
 * matched — otherwise the "No reliable comparison" state renders instead.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronsLeftRight, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  /** false → honest abstention state (progress.md) */
  comparable?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  comparable = true,
  beforeLabel = 'Day 1',
  afterLabel = 'Today',
  className,
}: CompareSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const [trackW, setTrackW] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTrackW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.min(Math.max((clientX - rect.left) / rect.width, 0.05), 0.95));
  }, []);

  if (!comparable) {
    return (
      <div className={cn('rounded-card bg-cream-2 p-6 flex flex-col items-center text-center gap-2', className)}>
        <ImageOff size={22} className="text-ink-3" aria-hidden="true" />
        <p className="text-body font-bold text-ink">No reliable comparison</p>
        <p className="text-caption text-ink-2 max-w-[34ch]">
          These captures were taken under different light or distance, so we won't place them side by
          side. Habits still count — they count the most, honestly.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      className={cn('relative overflow-hidden rounded-card select-none touch-none', className)}
      style={{ aspectRatio: '4 / 5' }}
      onPointerDown={(e) => {
        setDragging(true);
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateFromClientX(e.clientX);
      }}
      onPointerMove={(e) => dragging && updateFromClientX(e.clientX)}
      onPointerUp={() => {
        setDragging(false);
        setPos(0.5); // spring return to 50% on release (§7.17)
      }}
      role="slider"
      aria-label="Compare your two captures"
      aria-valuenow={Math.round(pos * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setPos((p) => Math.max(p - 0.05, 0.05));
        if (e.key === 'ArrowRight') setPos((p) => Math.min(p + 0.05, 0.95));
      }}
    >
      <img src={afterSrc} alt={`Your capture — ${afterLabel}`} className="absolute inset-0 size-full object-cover" draggable={false} />
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{ width: `${pos * 100}%` }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
      >
        <img
          src={beforeSrc}
          alt={`Your capture — ${beforeLabel}`}
          className="absolute inset-0 h-full object-cover"
          style={{ width: trackW > 0 ? trackW : '100%' }}
          draggable={false}
        />
      </motion.div>

      {/* handle */}
      <motion.div
        className="absolute inset-y-0 z-10"
        animate={{ insetInlineStart: `calc(${pos * 100}% - 1px)` }}
        transition={dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="absolute inset-y-0 w-[2px] bg-ink" aria-hidden="true" />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 inline-flex size-11 items-center justify-center rounded-full bg-ink text-cream rtl:-scale-x-100"
          aria-hidden="true"
        >
          <ChevronsLeftRight size={20} strokeWidth={1.75} />
        </div>
      </motion.div>

      {/* labels */}
      <span className="absolute bottom-3 start-3 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] text-cream">{beforeLabel}</span>
      <span className="absolute bottom-3 end-3 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] text-cream">{afterLabel}</span>
    </div>
  );
}
