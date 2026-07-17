// @vitest-environment jsdom
/**
 * Retention engine tests — Program / Check-in / Progress (feature C).
 * Renders the real app tree with a seeded conservative plan, and covers the
 * pure helpers behind the heatmap + photo comparability.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { AppProvider, DEFAULT_PROFILE, todayKey, type Capture } from '@/lib/store';
import { buildPlan } from '@/lib/plan';
import { conservativeSafetyEvaluation, EMPTY_INVENTORY } from '@/lib/rules';
import { checkInDayFor, isCheckInDue, adjustmentForWeek } from '@/pages/program/checkInState';
import { capturesComparable } from '@/pages/progress/photo';
import { badgeProgress, comfortEcho, dayIntensity, longestStreak, monthCells } from '@/pages/progress/stats';

/* jsdom polyfills (same pattern as src/lib/app.smoke.test.tsx) */
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

function seedPlan(progress?: unknown) {
  localStorage.setItem('lf_onboarded', 'true');
  localStorage.setItem(
    'lf_safety',
    JSON.stringify({ answers: {}, contraindicationCodes: [], ruleVersion: '2026.07.1', reviewStatus: 'skipped' }),
  );
  localStorage.setItem('lf_plan', JSON.stringify(buildPlan(DEFAULT_PROFILE, conservativeSafetyEvaluation(), EMPTY_INVENTORY)));
  if (progress) localStorage.setItem('lf_progress', JSON.stringify(progress));
}

function renderApp(initialPath: string) {
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

/* ── Pure helpers ──────────────────────────────────────────────────────── */

describe('check-in scheduling helpers', () => {
  it('picks the first due unrecorded check-in day; falls back to day 7', () => {
    expect(checkInDayFor([], 1)).toBe(7);
    expect(checkInDayFor([], 10)).toBe(7);
    const rec = [{ day: 7 } as never];
    expect(checkInDayFor(rec, 10)).toBe(14);
    expect(isCheckInDue([], 7, 7)).toBe(true);
    expect(isCheckInDue([], 6, 7)).toBe(false);
    expect(adjustmentForWeek([{ day: 7 } as never], 2)?.day).toBe(7);
    expect(adjustmentForWeek([], 1)).toBeUndefined();
  });
});

describe('progress stats helpers', () => {
  it('monthCells builds a Monday-first grid with today flagged', () => {
    const cells = monthCells(2026, 6, '2026-07-12'); // July 2026
    expect(cells.filter(Boolean)).toHaveLength(31);
    const first = cells.find((c) => c?.day === 1);
    expect(first?.key).toBe('2026-07-01');
    expect(cells.find((c) => c?.today)?.day).toBe(12);
    expect(cells.find((c) => c?.day === 31)?.future).toBe(true);
  });

  it('longestStreak counts consecutive active days', () => {
    expect(
      longestStreak({ '2026-07-01': ['a'], '2026-07-02': ['a'], '2026-07-03': ['a'], '2026-07-05': ['a'], '2026-07-06': [] }),
    ).toBe(3);
    expect(longestStreak({})).toBe(0);
  });

  it('dayIntensity + comfortEcho follow the honest-progress rules', () => {
    expect(dayIntensity(0)).toBe('none');
    expect(dayIntensity(2)).toBe('partial');
    expect(dayIntensity(4)).toBe('full');
    const echo = comfortEcho(
      [
        { date: '2026-07-03T10:00:00', activityId: 'x', comfortLevel: 1, irritationFlag: false, seconds: 30 },
        { date: '2026-07-04T10:00:00', activityId: 'x', comfortLevel: 1, irritationFlag: false, seconds: 30 },
        { date: '2026-07-05T10:00:00', activityId: 'x', comfortLevel: 2, irritationFlag: false, seconds: 30 },
        { date: '2026-06-05T10:00:00', activityId: 'x', comfortLevel: 3, irritationFlag: true, seconds: 30 },
      ],
      2026,
      6,
    );
    expect(echo).toEqual({ label: 'comfortable', pct: 67 });
    expect(comfortEcho([], 2026, 6)).toBeNull();
  });

  it('badgeProgress reports habits-only targets', () => {
    const p = {
      completedDays: Array.from({ length: 10 }, (_, i) => i + 1),
      sessions: 12,
      minutes: 60,
      streak: 5,
      lastDone: null,
      badges: {},
      comfortLog: [],
      dailyLog: {},
      earlySessions: 2,
    };
    expect(badgeProgress('diamond-week', p)).toMatchObject({ current: 5, target: 7 });
    expect(badgeProgress('full-circle', p)).toMatchObject({ current: 10, target: 28 });
    expect(badgeProgress('first-light', p)).toMatchObject({ current: 1, target: 1 });
  });
});

describe('photo comparability (spec §5.3)', () => {
  const cap = (lighting: number, blur = 0.1): Capture => ({
    captureId: 'c',
    localOnly: true,
    dataUrl: 'data:',
    qualityMetrics: { lighting, blur, pose: 0.9 },
    consentVersion: '2026.07.1',
    createdAt: '2026-07-01T00:00:00',
  });
  it('compares only when light and focus match', () => {
    expect(capturesComparable(cap(0.7), cap(0.75))).toBe(true);
    expect(capturesComparable(cap(0.3), cap(0.9))).toBe(false);
    expect(capturesComparable(cap(0.7, 0.9), cap(0.7))).toBe(false);
  });
});

/* ── Program page ─────────────────────────────────────────────────────── */

describe('Program page', () => {
  it('renders weeks, free-tier locks on days 4–28, honesty card and disclaimer', async () => {
    seedPlan();
    renderApp('/program');
    expect(await screen.findAllByText(/Four weeks of/)).not.toHaveLength(0);
    for (const name of ['Reset', 'Consistency', 'Target', 'Review']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    // free tier: day 3 open, day 4 locked
    expect(screen.getAllByLabelText(/^Day 3/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Day 4 — locked, unlock with PRO').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unlock your full 28-day plan/).length).toBeGreaterThan(0);
    // check-in entry rows (always free) + honesty + disclaimer
    expect(screen.getAllByText(/Week 1 check-in/).length).toBeGreaterThan(0);
    expect(screen.getByText('An honest four weeks.')).toBeTruthy();
    expect(screen.getAllByText(/not medical advice/i).length).toBeGreaterThan(0);
  });

  it('opens the day sheet with activities and a start CTA', async () => {
    seedPlan();
    renderApp('/program');
    const cell = (await screen.findAllByLabelText(/^Day 1/))[0];
    fireEvent.click(cell);
    expect(await screen.findByText(/Day 1 · Week 1/i)).toBeTruthy();
    expect(screen.getByText('Morning basics')).toBeTruthy();
    expect(screen.getByText(/Start Day 1/)).toBeTruthy();
  });
});

/* ── Check-in flow ────────────────────────────────────────────────────── */

describe('Check-in flow', () => {
  async function runToSummary(irritation: boolean) {
    renderApp('/checkin');
    fireEvent.click(await screen.findByText(irritation ? 'Uncomfortable' : 'Comfortable'));
    fireEvent.click(await screen.findByText(irritation ? 'Yes, something' : 'No, all good'));
    if (irritation) {
      expect(await screen.findByText('Your skin is asking for a quieter week.')).toBeTruthy();
      fireEvent.click(screen.getByText('Adjust my plan'));
    }
    fireEvent.click(await screen.findByText(irritation ? 'Some days' : 'Every day'));
    fireEvent.click(await screen.findByText('Continue'));
    fireEvent.click(await screen.findByText('Skip — habits are enough'));
  }

  it('comfortable + adherent → graceful "no changes needed" summary', async () => {
    seedPlan();
    await runToSummary(false);
    expect(await screen.findByText(/Check-in complete · Week 1/i)).toBeTruthy();
    expect(await screen.findByText('No changes needed.')).toBeTruthy();
    expect(screen.getByText(/never from appearance analysis/i)).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('lf_checkins') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].day).toBe(7);
    expect(stored[0].irritationFlag).toBe(false);
  });

  it('irritation → barrier-reset branch pauses items in the visible diff', async () => {
    seedPlan();
    await runToSummary(true);
    expect(await screen.findByText(/Check-in complete · Week 1/i)).toBeTruthy();
    // the reward: paused rows + Barrier Reset added
    expect(await screen.findByText('Barrier Reset')).toBeTruthy();
    expect(screen.getAllByText(/Paused —/).length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem('lf_checkins') ?? '[]');
    expect(stored[0].irritationFlag).toBe(true);
    expect(stored[0].planDiff.added.some((e: { activityId: string }) => e.activityId === 'barrier-reset')).toBe(true);
    // plan itself was adjusted for next week
    const plan = JSON.parse(localStorage.getItem('lf_plan') ?? '{}');
    expect(plan.days[7].items.some((i: { activityId: string }) => i.activityId === 'barrier-reset')).toBe(true);
  });
});

/* ── Progress page ────────────────────────────────────────────────────── */

describe('Progress page', () => {
  it('renders stats, heatmap, badges, photo invitation and milestones', async () => {
    const today = todayKey();
    seedPlan({
      completedDays: [1, 2],
      sessions: 5,
      minutes: 24,
      streak: 2,
      lastDone: today,
      badges: { 'first-light': today },
      comfortLog: [{ date: new Date().toISOString(), activityId: 'neutral-jaw-rest', comfortLevel: 1, irritationFlag: false, seconds: 30 }],
      dailyLog: { [today]: ['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen', 'neutral-jaw-rest'] },
      earlySessions: 0,
    });
    renderApp('/progress');
    expect(await screen.findByText('Your progress')).toBeTruthy();
    expect(screen.getByText('Consistency')).toBeTruthy();
    expect(screen.getByText('Badges')).toBeTruthy();
    expect(screen.getByText('Same light, same you')).toBeTruthy();
    // photo diary consent invitation + privacy-first copy
    expect(screen.getByText('A private photo diary, if you want one')).toBeTruthy();
    expect(screen.getByText(/Your photos never leave this device/i)).toBeTruthy();
    // milestones from habit events
    expect(screen.getByText(/First Light earned/)).toBeTruthy();
    expect(screen.getAllByText(/not medical advice/i).length).toBeGreaterThan(0);
  });

  it('brand-new user sees the poetic empty state instead of the heatmap', async () => {
    seedPlan();
    renderApp('/progress');
    expect(await screen.findByText(/Every ritual begins with a single quiet minute/)).toBeTruthy();
    expect(screen.queryByText('Consistency')).toBeNull();
    expect(screen.getByText('Start Day 1')).toBeTruthy();
  });

  it('"focus on habits" hides the diary and persists to the profile', async () => {
    seedPlan();
    renderApp('/progress');
    fireEvent.click(await screen.findByText('Not interested — hide this'));
    expect(await screen.findByText(/Photos hidden/)).toBeTruthy();
    await waitFor(() => {
      const profile = JSON.parse(localStorage.getItem('lf_profile') ?? '{}');
      expect(profile.hideComparison).toBe(true);
    });
  });
});
