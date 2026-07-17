/**
 * Layout — the 430px phone-frame contract (design.md §2).
 * Mobile (<520px): edge-to-edge column. Desktop (≥520px): framed device
 * (radius 44, 10px ink-frame border, device shadow) on a cream-linen
 * backdrop with a faint Playfair "LumaFace" watermark + two soft blooms.
 * Renders <Outlet/> (nested routes). TopBrandBar + BottomTabBar are hidden
 * on immersive routes: /onboarding, /activity/:id/session,
 * /activity/:id/done, /checkin, /paywall.
 */

import { Outlet, matchPath, useLocation } from 'react-router';
import TopBrandBar from '@/components/TopBrandBar';
import BottomTabBar from '@/components/BottomTabBar';

/** Immersive flows — no brand bar, no tab bar (§2). */
const IMMERSIVE_ROUTES = ['/onboarding', '/activity/:id/session', '/activity/:id/done', '/checkin', '/paywall'];

export default function Layout() {
  const { pathname } = useLocation();
  const immersive = IMMERSIVE_ROUTES.some((p) => matchPath({ path: p, end: true }, pathname));

  return (
    <div className="relative min-h-[100dvh] w-full bg-cream-backdrop flex justify-center sm:items-center overflow-hidden">
      {/* Desktop backdrop: watermark + blooms (static, ≥520px only) */}
      <div aria-hidden="true" className="hidden sm:block pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute inset-0 flex items-center justify-center font-display italic font-semibold text-[8vw] leading-none select-none text-[rgba(42,22,13,.045)]">
          LumaFace
        </span>
        <span className="absolute -top-24 -left-24 size-[34rem] rounded-full bg-[#ECC1B4] opacity-[.12] blur-3xl" />
        <span className="absolute -bottom-24 -right-24 size-[30rem] rounded-full bg-[#CBAC7A] opacity-[.10] blur-3xl" />
      </div>

      {/* Phone column — Sheets portal into this frame */}
      <div id="lf-phone-frame" className="relative w-full max-w-[430px] bg-cream min-h-[100dvh] sm:min-h-0 sm:h-[min(900px,calc(100dvh-64px))] sm:rounded-[44px] sm:border-[10px] sm:border-ink-frame sm:shadow-device flex flex-col overflow-hidden">
        <div data-lf-scroll className="lf-scroll relative flex-1 overflow-y-auto overflow-x-hidden">
          {!immersive && <TopBrandBar />}
          <Outlet />
        </div>
        {!immersive && <BottomTabBar />}
      </div>
    </div>
  );
}
