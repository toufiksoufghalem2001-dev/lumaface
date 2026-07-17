/**
 * Sheet — LumaFace bottom sheet (design.md §7.8).
 * Spring per spring-sheet (260/26), drag-to-dismiss, 28px top radius,
 * 36×4 hairline grabber, scrim rgba(42,22,13,.32) fading 0.25s.
 * Constrained to the 430px phone column.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING_SHEET } from '@/lib/theme';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** accessible title id (screen readers) */
  ariaLabel?: string;
  /** max height ratio of the phone column, default 0.86 */
  maxHeightRatio?: number;
  children: ReactNode;
  className?: string;
}

export default function Sheet({ open, onClose, ariaLabel, maxHeightRatio = 0.86, children, className }: SheetProps) {
  // Portal into the phone frame so the sheet covers the column (not the
  // scroll content) regardless of scroll position.
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after first commit
    setFrame(document.getElementById('lf-phone-frame'));
  }, []);

  // lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector<HTMLElement>('[data-lf-scroll]');
    const prev = root?.style.overflow;
    if (root) root.style.overflow = 'hidden';
    return () => {
      if (root) root.style.overflow = prev ?? '';
    };
  }, [open]);

  // escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!frame) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-50 bg-[rgba(42,22,13,.32)]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SPRING_SHEET}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            className={cn(
              'absolute inset-x-0 bottom-0 z-50 bg-card rounded-t-sheet shadow-pop flex flex-col',
              className,
            )}
            style={{ maxHeight: `${maxHeightRatio * 100}%` }}
          >
            <div className="pt-3 pb-1 flex justify-center shrink-0" aria-hidden="true">
              <div className="w-9 h-1 rounded-full bg-hairline" />
            </div>
            <div className="overflow-y-auto lf-scroll px-5 pb-8 pt-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    frame,
  );
}
