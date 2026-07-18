// @vitest-environment jsdom
/**
 * Feature tests — Library / Activity detail / Session / Done / Routine.
 * Exercises the activity-flow contract: phase timeline math, catalog
 * rendering, PRO lock + safety-excluded states (safety beats everything),
 * the guided player guard rails, and ComfortPrompt → logSession wiring.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MotionConfig } from 'framer-motion';
import { MemoryRouter } from 'react-router';
import App from '@/App';
import { AppProvider } from '@/lib/store';
import { ACTIVITY_BY_ID } from '@/data/activities';
import { buildSessionPlan, deriveRepCount, phaseAt, INTRO_SECONDS, OUTRO_SECONDS } from '@/pages/activity/sessionPlan';

/* jsdom polyfills for framer-motion (same as lib/app.smoke.test.tsx) */
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

function renderApp(entries: Parameters<typeof MemoryRouter>[0]['initialEntries']) {
  return render(
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <MemoryRouter initialEntries={entries}>
          <App />
        </MemoryRouter>
      </AppProvider>
    </MotionConfig>,
  );
}

/** seed a completed safety screening with eye symptoms (excludes SAFE-EYE-01 activities) */
function seedEyeSymptoms() {
  localStorage.setItem('lf_onboarded', 'true');
  localStorage.setItem(
    'lf_safety',
    JSON.stringify({
      answers: { eyeSymptoms: true },
      contraindicationCodes: ['SAFE-EYE-01'],
      ruleVersion: '2026.07.1',
      reviewStatus: 'complete',
    }),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

/* ── sessionPlan (pure timeline math) ──────────────────────────────────── */

describe('sessionPlan', () => {
  it('builds intro → reps → outro timelines that total the record duration', () => {
    for (const a of ACTIVITY_BY_ID.values()) {
      const plan = buildSessionPlan(a);
      expect(plan.totalSeconds).toBeCloseTo(a.durationSeconds, 5);
      expect(plan.phases[0].kind).toBe('intro');
      expect(plan.phases[0].duration).toBe(INTRO_SECONDS);
      expect(plan.phases[plan.phases.length - 1].kind).toBe('outro');
      expect(plan.phases[plan.phases.length - 1].duration).toBe(OUTRO_SECONDS);
    }
  });

  it('derives reps from "Repeat N times" copy and keeps holds humane', () => {
    const smile = ACTIVITY_BY_ID.get('smile-release')!;
    expect(deriveRepCount(smile)).toBe(5);
    const plan = buildSessionPlan(smile);
    expect(plan.reps).toBe(5);
    expect(plan.holdSeconds).toBeGreaterThanOrEqual(3);
    // 3 + 5×(3.2+4) + 6 = 45
    expect(plan.totalSeconds).toBe(45);
  });

  it('massage phases are labeled GLIDE; steps map one-per-rep', () => {
    const plan = buildSessionPlan(ACTIVITY_BY_ID.get('gentle-facial-massage')!);
    expect(plan.reps).toBe(5);
    const works = plan.phases.filter((p) => p.kind === 'work');
    expect(works.every((p) => p.label === 'GLIDE')).toBe(true);
    expect(works.map((p) => p.stepIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.phases.filter((p) => p.kind === 'release')).toHaveLength(5);
  });

  it('skincare slots run a single continuous timer (no rep counter)', () => {
    const plan = buildSessionPlan(ACTIVITY_BY_ID.get('daily-sunscreen')!);
    expect(plan.continuous).toBe(true);
    expect(plan.phases.filter((p) => p.kind === 'work')).toHaveLength(1);
    // work window slices into step windows
    const last = phaseAt(plan, INTRO_SECONDS + (plan.phases[1].duration - 0.1));
    expect(last.stepIndex).toBe(plan.stepCount - 1);
  });

  it('never lets a hold drop below the unhurried minimum', () => {
    // 30s record with no repeat copy → capped reps, hold ≥ 3s
    const plan = buildSessionPlan(ACTIVITY_BY_ID.get('neutral-jaw-rest')!);
    expect(plan.continuous).toBe(false);
    expect(plan.holdSeconds).toBeGreaterThanOrEqual(3);
  });

  it('phaseAt clamps and reports countdown/progress', () => {
    const plan = buildSessionPlan(ACTIVITY_BY_ID.get('smile-release')!);
    const at0 = phaseAt(plan, 0);
    expect(at0.phase.kind).toBe('intro');
    expect(at0.countdown).toBe(3);
    const mid = phaseAt(plan, plan.totalSeconds / 2);
    expect(mid.progress).toBeGreaterThan(0);
    expect(mid.progress).toBeLessThanOrEqual(1);
  });
});

/* ── Library ───────────────────────────────────────────────────────────── */

describe('Library page', () => {
  it('renders the catalog: all 6 category sections, honest lines, activity cards', async () => {
    renderApp(['/library']);
    expect((await screen.findAllByText('Library')).length).toBeGreaterThan(0);
    expect(screen.getByText(/every one labeled by evidence/)).toBeTruthy();
    expect(screen.getByText('Good first weeks')).toBeTruthy();
    for (const name of [
      'Skincare Foundation',
      'Facial Massage & De-Puff',
      'Face Movement',
      'Eye & Forehead',
      'Neck & Posture',
      'Relaxation & Tension Release',
    ]) {
      // name appears both as a filter chip and as a section header
      expect(screen.getAllByText(name).length).toBeGreaterThanOrEqual(1);
    }
    expect(screen.getByText('Morning Gentle Cleanse')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search an activity or goal…')).toBeTruthy();
  });

  it('filters live by search text and shows the empty state for no matches', async () => {
    renderApp(['/library']);
    const input = await screen.findByPlaceholderText('Search an activity or goal…');
    fireEvent.change(input, { target: { value: 'zzzz nothing' } });
    expect(await screen.findByText('Nothing matches', {}, { timeout: 1000 })).toBeTruthy();
    fireEvent.change(input, { target: { value: 'puffiness' } });
    await vi.waitFor(() => {
      expect(screen.getByText('Morning De-Puff Glide')).toBeTruthy();
    });
  });
});

/* ── Activity detail ───────────────────────────────────────────────────── */

describe('Activity detail', () => {
  it('free activity: full education + tinted Begin CTA', async () => {
    renderApp(['/activity/neutral-jaw-rest']);
    expect((await screen.findAllByText('Neutral Jaw Rest')).length).toBeGreaterThan(0);
    // CTA bar renders via FramePortal — one commit after the page itself
    expect(await screen.findByText(/Start guided session/)).toBeTruthy();
    expect(screen.getByText('Nothing to skip for')).toBeTruthy();
    expect(screen.getByText(/not medical advice/i)).toBeTruthy();
  });

  it('PRO activity for a free user shows the lock state + paywall CTA', async () => {
    renderApp(['/activity/gentle-facial-massage']);
    expect((await screen.findAllByText('Gentle Facial Massage')).length).toBeGreaterThan(0);
    expect(screen.getByText('Unlock with PRO')).toBeTruthy();
    expect(screen.queryByText(/Start guided session/)).toBeNull();
  });

  it('safety-excluded activity: kind resting state, never startable (safety beats everything)', async () => {
    seedEyeSymptoms();
    renderApp(['/activity/soft-eye-relaxation']);
    expect(await screen.findByText('Resting this one for now')).toBeTruthy();
    expect(screen.queryByText(/Start guided session/)).toBeNull();
    expect(screen.queryByText('Unlock with PRO')).toBeNull();
    // referral link to professional-care guidance is present
    expect(screen.getByText(/When to pause and see a professional/)).toBeTruthy();
  });

  it('skincare slot gets Mark as done + Guide me anyway', async () => {
    renderApp(['/activity/daily-sunscreen']);
    expect(await screen.findByText('Mark as done')).toBeTruthy();
    expect(screen.getByText('Guide me anyway')).toBeTruthy();
  });
});

/* ── Session player ────────────────────────────────────────────────────── */

describe('Activity session', () => {
  it('renders the guided player: phase label, step cue, controls', async () => {
    renderApp(['/activity/smile-release/session']);
    expect((await screen.findAllByText('SETTLE IN')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Eyes closed is fine/)).toBeTruthy();
    expect(screen.getByLabelText('Pause session')).toBeTruthy();
    expect(screen.getByLabelText('End session')).toBeTruthy();
    expect(screen.getByLabelText('Back 10 seconds')).toBeTruthy();
    expect(screen.getByLabelText('Skip ahead 10 seconds')).toBeTruthy();
  });

  it('excluded activity redirects away from the player (deep-link safe)', async () => {
    seedEyeSymptoms();
    renderApp(['/activity/soft-eye-relaxation/session']);
    expect(await screen.findByText('Resting this one for now')).toBeTruthy();
    expect(screen.queryByLabelText('Pause session')).toBeNull();
  });

  it('locked PRO activity redirects away from the player for free users', async () => {
    renderApp(['/activity/gentle-gua-sha/session']);
    expect((await screen.findAllByText('Gentle Gua Sha')).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Pause session')).toBeNull();
  });
});

/* ── Done screen ───────────────────────────────────────────────────────── */

describe('Activity done', () => {
  it('completion hero + stats + comfort logging wired to the store', async () => {
    renderApp([{ pathname: '/activity/smile-release/done', state: { seconds: 45, reps: 5, origin: '/' } }]);
    expect(await screen.findByText('Gently done.')).toBeTruthy();
    expect(screen.getByText(/honest summary/i)).toBeTruthy();
    expect(screen.getByText('How did that feel?')).toBeTruthy();
    // free user → upsell visible
    expect(screen.getByText('See PRO plans')).toBeTruthy();

    fireEvent.click(screen.getByText('Comfortable'));
    await vi.waitFor(
      () => {
        const raw = localStorage.getItem('lf_progress');
        expect(raw).toBeTruthy();
        const p = JSON.parse(raw!) as { sessions: number; streak: number; comfortLog: { activityId: string; comfortLevel: number }[] };
        expect(p.sessions).toBe(1);
        expect(p.streak).toBe(1);
        expect(p.comfortLog[0].activityId).toBe('smile-release');
        expect(p.comfortLog[0].comfortLevel).toBe(1);
      },
      { timeout: 2000 },
    );
  }, 10000);

  it('uncomfortable + irritation shows the barrier-reset guidance', async () => {
    renderApp([{ pathname: '/activity/smile-release/done', state: { seconds: 45, reps: 5 } }]);
    fireEvent.click(await screen.findByText('Uncomfortable'));
    fireEvent.click(await screen.findByText('Yes'));
    expect(await screen.findByText('Your skin is asking for a pause')).toBeTruthy();
    expect(screen.getByText(/Open Barrier Reset/)).toBeTruthy();
  });
});

/* ── Routine ───────────────────────────────────────────────────────────── */

describe('Routine page', () => {
  it('renders AM/PM ritual slots, order education and disclaimer', async () => {
    renderApp(['/routine']);
    expect(await screen.findByText('Morning ritual')).toBeTruthy();
    expect(screen.getByText('Evening ritual')).toBeTruthy();
    expect(screen.getByText('Broad-spectrum SPF 30 or higher')).toBeTruthy();
    expect(screen.getByText('Strong ingredients, paced kindly.')).toBeTruthy();
    expect(screen.getByText('Why this order works.')).toBeTruthy();
    expect(screen.getByText(/not medical advice/i)).toBeTruthy();
  });

  it('check-off persists to today items (mirrors Home)', async () => {
    renderApp(['/routine']);
    const boxes = await screen.findAllByRole('checkbox', { name: /Mark Sunscreen done/i });
    fireEvent.click(boxes[0]);
    await vi.waitFor(() => {
      const p = JSON.parse(localStorage.getItem('lf_progress')!) as { dailyLog: Record<string, string[]> };
      const today = Object.keys(p.dailyLog)[0];
      expect(p.dailyLog[today]).toContain('daily-sunscreen');
    });
  });

  it('shows the retinoid-pregnancy caution when the rule fires', async () => {
    localStorage.setItem('lf_onboarded', 'true');
    localStorage.setItem(
      'lf_safety',
      JSON.stringify({
        answers: { pregnantOrTrying: true },
        contraindicationCodes: ['SAFE-PREG-RET'],
        ruleVersion: '2026.07.1',
        reviewStatus: 'complete',
      }),
    );
    localStorage.setItem('lf_inventory', JSON.stringify({ products: ['retinoid'], reactsToNew: null }));
    renderApp(['/routine']);
    expect(await screen.findByText('A pause worth taking')).toBeTruthy();
    expect(screen.getByText(/Retinoids aren't recommended while pregnant or trying/)).toBeTruthy();
  });
});
