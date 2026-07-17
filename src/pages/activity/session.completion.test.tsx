// @vitest-environment jsdom
/**
 * Integration: a full guided session runs its timeline and lands on Done.
 * The phase math itself is unit-tested in activity.flow.test.tsx; here the
 * timeline is mocked short (1.6s) so the player's real clock drives the
 * completion transition end-to-end.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { MemoryRouter } from 'react-router';
import App from '@/App';
import { AppProvider } from '@/lib/store';
import type { SessionPlan } from '@/pages/activity/sessionPlan';

const SHORT_PLAN: SessionPlan = {
  phases: [
    { kind: 'intro', label: 'SETTLE IN', duration: 0.5, stepIndex: 0, rep: null, totalReps: 1, start: 0, end: 0.5 },
    { kind: 'work', label: 'HOLD · BREATHE', duration: 0.6, stepIndex: 0, rep: 1, totalReps: 1, start: 0.5, end: 1.1 },
    { kind: 'outro', label: 'REST', duration: 0.5, stepIndex: 0, rep: null, totalReps: 1, start: 1.1, end: 1.6 },
  ],
  totalSeconds: 1.6,
  reps: 1,
  continuous: false,
  stepCount: 4,
  holdSeconds: 0.6,
};

vi.mock('@/pages/activity/sessionPlan', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/pages/activity/sessionPlan')>();
  return { ...mod, buildSessionPlan: () => SHORT_PLAN };
});

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

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('guided session completion', () => {
  it('runs the timeline and navigates to Done with session state', async () => {
    render(
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <MemoryRouter initialEntries={['/activity/smile-release/session']}>
            <App />
          </MemoryRouter>
        </AppProvider>
      </MotionConfig>,
    );

    // player mounts with the intro phase
    expect((await screen.findAllByText('SETTLE IN')).length).toBeGreaterThan(0);

    // the 1.6s mocked timeline completes on the real clock → Done screen
    expect(await screen.findByText('Gently done.', {}, { timeout: 6000 })).toBeTruthy();
    expect(screen.getByText(/rep held/)).toBeTruthy();

    // comfort answer logs the session into the store
    fireEvent.click(screen.getByText('Comfortable'));
    await vi.waitFor(
      () => {
        const p = JSON.parse(localStorage.getItem('lf_progress')!) as { sessions: number };
        expect(p.sessions).toBe(1);
      },
      { timeout: 2000 },
    );
  }, 15000);

  it('graceful exit: confirm sheet, no partial credit', async () => {
    render(
      <MotionConfig reducedMotion="user">
        <AppProvider>
          <MemoryRouter initialEntries={[{ pathname: '/activity/smile-release/session', state: { origin: '/library' } }]}>
            <App />
          </MemoryRouter>
        </AppProvider>
      </MotionConfig>,
    );
    fireEvent.click(await screen.findByLabelText('End session'));
    expect(await screen.findByText('End your session early?')).toBeTruthy();
    expect(screen.getByText(/Sessions count when they complete/)).toBeTruthy();
    fireEvent.click(screen.getByText('End session'));
    // lands back on the library; nothing logged (no partial credit)
    expect((await screen.findAllByText('Library')).length).toBeGreaterThan(0);
    const p = JSON.parse(localStorage.getItem('lf_progress')!) as { sessions: number; comfortLog: unknown[] };
    expect(p.sessions).toBe(0);
    expect(p.comfortLog).toHaveLength(0);
  });
});
