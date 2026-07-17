/**
 * TopBrandBar (design.md §7.1) — sticky on all tab screens.
 * Left: MarkPetal + "LumaFace" wordmark (Playfair 600 19px).
 * Right: StreakChip (flame + count, "Start" when 0 → /progress) + ProChip
 * (free: violet Sparkles "PRO" → /paywall · PRO: gold chip → /profile).
 * Condenses 62→54px + gains backdrop-blur + hairline after 24px scroll (§6.8).
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { MarkPetal } from '@/components/illos';

export default function TopBrandBar() {
  const { progress, pro } = useApp();
  const [condensed, setCondensed] = useState(false);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scroller = barRef.current?.closest('[data-lf-scroll]');
    if (!scroller) return;
    const onScroll = () => setCondensed(scroller.scrollTop > 24);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      ref={barRef}
      className={cn(
        'sticky top-0 z-40 px-5 flex items-center justify-between transition-all duration-250',
        condensed ? 'h-[54px] bg-cream/85 backdrop-blur-[14px] border-b border-hairline' : 'h-[62px] bg-transparent border-b border-transparent',
      )}
    >
      <Link to="/" className="flex items-center gap-2 min-h-[44px]" aria-label="LumaFace — Today">
        <MarkPetal className="size-[22px]" />
        <span className="font-display font-semibold text-[19px] leading-none text-ink">LumaFace</span>
      </Link>

      <div className="flex items-center gap-2">
        {/* StreakChip */}
        <Link
          to="/progress"
          className="h-9 rounded-full bg-cream-2 pl-2.5 pr-3 flex items-center gap-1.5 min-w-[44px]"
          aria-label={progress.streak > 0 ? `${progress.streak}-day streak — see progress` : 'Start your streak — see progress'}
        >
          <motion.span
            key={progress.streak}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 0.5 }}
            className="inline-flex"
            aria-hidden="true"
          >
            <Flame size={16} className="text-flame" fill="currentColor" strokeWidth={1.75} />
          </motion.span>
          <span className="text-label text-ink">{progress.streak > 0 ? progress.streak : 'Start'}</span>
        </Link>

        {/* ProChip */}
        {pro.active ? (
          <Link
            to="/profile"
            className="h-9 rounded-full px-3 flex items-center gap-1.5 bg-gold/15 text-[12px] font-bold tracking-[0.06em] text-[#8A6D12]"
            aria-label="PRO member — open profile"
          >
            PRO
          </Link>
        ) : (
          <Link
            to="/paywall"
            className="h-9 rounded-full px-3 flex items-center gap-1.5 bg-violet-tint text-violet text-[12px] font-bold tracking-[0.06em]"
            aria-label="Upgrade to PRO"
          >
            <Sparkles size={13} strokeWidth={1.75} aria-hidden="true" />
            PRO
          </Link>
        )}
      </div>
    </header>
  );
}
