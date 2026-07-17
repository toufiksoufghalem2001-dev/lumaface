// @vitest-environment jsdom
/**
 * Runtime smoke tests — render the real app tree (AppProvider + Router +
 * Layout + pages) the way main.tsx does, and exercise the store contract.
 * Catches runtime issues (portals, icons, context) without a dev server.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { AppProvider, useApp, DEFAULT_PROFILE, type AppContextValue } from '@/lib/store';
import { buildPlan } from '@/lib/plan';
import { conservativeSafetyEvaluation, EMPTY_INVENTORY } from '@/lib/rules';
import { ACTIVITIES } from '@/data/activities';
import { FaceIllo } from '@/components/illos';

/* jsdom polyfills for framer-motion (browser APIs that exist on all targets) */
class NoopIO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as Record<string, unknown>).IntersectionObserver = NoopIO;
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderApp(initialPath = '/') {
  return render(
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </AppProvider>
    </MotionConfig>,
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('app smoke', () => {
  it('boots Today with the no-plan CTA when onboarding never ran', async () => {
    renderApp('/');
    expect((await screen.findAllByText('Build your ritual')).length).toBeGreaterThan(0);
    // brand bar + all 5 tabs render
    expect(screen.getAllByText('LumaFace').length).toBeGreaterThan(0);
    for (const tab of ['Today', 'Library', 'Program', 'Coach', 'Profile']) {
      expect(screen.getAllByLabelText(tab).length).toBeGreaterThan(0);
    }
  });

  it('boots Today with the ritual stack when a conservative plan exists', async () => {
    localStorage.setItem('lf_onboarded', 'true');
    localStorage.setItem(
      'lf_safety',
      JSON.stringify({ answers: {}, contraindicationCodes: [], ruleVersion: '2026.07.1', reviewStatus: 'skipped' }),
    );
    localStorage.setItem(
      'lf_plan',
      JSON.stringify(buildPlan(DEFAULT_PROFILE, conservativeSafetyEvaluation(), EMPTY_INVENTORY)),
    );
    renderApp('/');
    expect((await screen.findAllByText(/Today's ritual · Day 1/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Morning basics/i)).toBeTruthy();
    expect(screen.getByText('Neutral Jaw Rest')).toBeTruthy();
    // disclaimer footer present
    expect(screen.getAllByText(/not medical advice/i).length).toBeGreaterThan(0);
    // safety-skipped banner
    expect(screen.getByText(/7 quick safety questions/i)).toBeTruthy();
  });

  it('renders stub routes so feature engineers can locate them', async () => {
    renderApp('/library');
    expect((await screen.findAllByText('Library')).length).toBeGreaterThan(0);
  });

  it('hides bars on immersive routes (paywall stub)', async () => {
    renderApp('/paywall');
    expect(await screen.findByText('LumaFace PRO')).toBeTruthy();
    expect(screen.queryByLabelText('Main navigation')).toBeNull();
  });

  it('every activity illustration name resolves through FaceIllo', () => {
    for (const a of ACTIVITIES) {
      const { container, unmount } = render(<FaceIllo name={a.media.illustration} />);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
    const { container } = render(<FaceIllo name="Nope" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('store contract: skipOnboarding builds a conservative 28-day plan; logSession tracks streaks/badges', async () => {
    let api: AppContextValue | null = null;
    function Probe() {
      const app = useApp();
      useEffect(() => {
        api = app;
      });
      return null;
    }
    render(
      <AppProvider>
        <Probe />
      </AppProvider>,
    );
    await act(async () => {
      api!.skipOnboarding();
    });
    expect(api!.onboarded).toBe(true);
    expect(api!.plan).not.toBeNull();
    expect(api!.plan!.days).toHaveLength(28);
    const ids = new Set(api!.plan!.days.flatMap((d) => d.items.map((i) => i.activityId)));
    for (const id of ids) {
      expect(ACTIVITIES.find((x) => x.activityId === id)!.free).toBe(true);
    }
    // W1 has no massage or movement
    for (const d of api!.plan!.days.filter((x) => x.week === 1)) {
      for (const i of d.items) {
        const a = ACTIVITIES.find((x) => x.activityId === i.activityId)!;
        expect(['massage', 'movement']).not.toContain(a.category);
      }
    }
    // check-in days flagged
    expect(api!.plan!.days.filter((d) => d.isCheckInDay).map((d) => d.day)).toEqual([7, 14, 21, 28]);

    await act(async () => {
      api!.logSession('neutral-jaw-rest', 1, 30);
    });
    expect(api!.progress.sessions).toBe(1);
    expect(api!.progress.streak).toBe(1);
    expect(api!.progress.badges['first-light']).toBeTruthy();

    // saveCheckIn with irritation → barrier-reset branch in the diff
    await act(async () => {
      api!.saveCheckIn({ day: 7, comfortRating: 3, irritationFlag: true, adherenceSelfReport: 'most' });
    });
    const last = api!.checkIns[api!.checkIns.length - 1];
    expect(last.planDiff.added.some((e) => e.activityId === 'barrier-reset')).toBe(true);
    expect(api!.plan!.days[7].items.some((i) => i.activityId === 'barrier-reset')).toBe(true);
  });
});
