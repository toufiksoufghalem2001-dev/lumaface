/**
 * BottomTabBar (design.md §7.2) — fixed within the phone column.
 * 5 tabs: Today / (Flower2) · Library /library (LayoutGrid) · Program
 * /program (CalendarDays) · Coach /coach (MessageCircleHeart) · Profile
 * /profile (UserRound). Height 76px + safe-area. Active tab: ink icon+label
 * with a 46×28px cream-2 pill (framer-motion layoutId, 0.25s); inactive
 * ink-3. Top hairline; card bg at 92% + backdrop-blur 14px.
 */

import { NavLink } from 'react-router';
import { motion } from 'framer-motion';
import { Flower2, LayoutGrid, CalendarDays, MessageCircleHeart, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/', label: 'Today', icon: Flower2, end: true },
  { to: '/library', label: 'Library', icon: LayoutGrid, end: false },
  { to: '/program', label: 'Program', icon: CalendarDays, end: false },
  { to: '/coach', label: 'Coach', icon: MessageCircleHeart, end: false },
  { to: '/profile', label: 'Profile', icon: UserRound, end: false },
] as const;

export default function BottomTabBar() {
  return (
    <nav
      className="shrink-0 border-t border-hairline bg-card/90 backdrop-blur-[14px] pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="h-[76px] grid grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-col items-center justify-center gap-1 min-h-[44px]"
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                <span className="relative flex items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="lf-tab-pill"
                      transition={{ duration: 0.25 }}
                      className="absolute w-[46px] h-7 rounded-full bg-cream-2"
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    size={21}
                    strokeWidth={1.75}
                    className={cn('relative', isActive ? 'text-ink' : 'text-ink-3')}
                    aria-hidden="true"
                  />
                </span>
                <span className={cn('text-[10px] font-bold uppercase tracking-[0.14em]', isActive ? 'text-ink' : 'text-ink-3')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
