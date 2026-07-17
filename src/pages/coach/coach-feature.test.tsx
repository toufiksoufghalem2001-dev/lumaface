// @vitest-environment jsdom
/**
 * Feature D runtime checks — coach engine contract + the four trust &
 * monetization pages (Coach, Paywall, Profile, Help) rendered through the
 * real App tree (AppProvider + Router + Layout), the way main.tsx does.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MotionConfig } from 'framer-motion';
import App from '@/App';
import { AppProvider, todayKey } from '@/lib/store';
import { ACTIVITY_BY_ID } from '@/data/activities';
import { answerQuestion, classifySafety, COACH_ANSWERS, FREE_DAILY_QUESTIONS, SUGGESTED_PROMPTS } from '@/pages/coach/engine';

/* jsdom polyfills for framer-motion */
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
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/* ═══════════════════════ Engine contract ══════════════════════════════ */

describe('coach engine', () => {
  it('every suggested prompt matches a curated answer with the §8.5 shape', () => {
    for (const prompt of SUGGESTED_PROMPTS) {
      const a = answerQuestion(prompt, { goals: [] });
      expect(['education', 'routine_adjustment', 'motivation', 'safety_redirect']).toContain(a.intent);
      expect(a.summary.length).toBeGreaterThan(40);
      expect(['high', 'medium', 'low']).toContain(a.confidence);
      expect(a.requires_professional_review).toBe(false);
      expect(a.source_ids.length).toBeGreaterThan(0); // sources always shown
      for (const ra of a.recommended_actions) {
        expect(ACTIVITY_BY_ID.has(ra.activity_id)).toBe(true);
      }
      // curated, not the low-confidence fallback
      expect(a.confidence).not.toBe('low');
    }
  });

  it('canonical answers carry the exact curated copy', () => {
    const yoga = answerQuestion('Is face yoga proven?', { goals: [] });
    expect(yoga.summary).toContain('Not in any strong way');
    expect(yoga.recommended_actions.map((r) => r.activity_id)).toEqual(['neutral-jaw-rest', 'daily-sunscreen']);
    const slim = answerQuestion('Will massage slim my face?', { goals: [] });
    expect(slim.summary).toContain('honest ceiling of the evidence');
    expect(slim.warnings[0].message).toContain('not a problem to solve');
  });

  it('urgent-symptom patterns intercept before coaching', () => {
    for (const phrase of [
      'Half my face suddenly feels weak and droopy',
      'one side of my face went numb an hour ago',
      "I can't move the left side of my face",
      'my vision suddenly went blurry',
      'my lips are swelling up and it is hard to breathe',
      'severe pain in my jaw since morning',
    ]) {
      const hit = classifySafety(phrase);
      expect(hit?.kind, phrase).toBe('urgent');
    }
    expect(classifySafety('a little puffiness around my eyes')).toBeNull();
    expect(classifySafety('my skin stung after a new serum')).toBeNull();
  });

  it('off-scope requests get graceful refusals', () => {
    expect(classifySafety('Am I pretty? Be honest.')?.kind).toBe('off_scope');
    expect(classifySafety('rate my face out of 10')?.kind).toBe('off_scope');
    expect(classifySafety('is my girlfriend attractive?')?.kind).toBe('off_scope');
    expect(classifySafety('do I have rosacea?')?.kind).toBe('diagnosis');
    expect(classifySafety('what is this bump on my cheek — is it cancer?')?.kind).toBe('diagnosis');
    expect(classifySafety('how do I dehydrate myself to look snatched')?.kind).toBe('body_harm');
    expect(classifySafety('I hate my face so much')?.kind).toBe('body_image');
  });

  it('fallback is honest: low confidence + goal-matched free-first actions', () => {
    const a = answerQuestion('what is the weather like on my skin?', { goals: ['puffiness'] });
    expect(a.confidence).toBe('low');
    expect(a.summary).toContain("I'd rather say so than guess");
    expect(a.recommended_actions.length).toBeGreaterThan(0);
    for (const ra of a.recommended_actions) expect(ACTIVITY_BY_ID.has(ra.activity_id)).toBe(true);
  });

  it('no Tier-D language anywhere in the approved library', () => {
    const banned = /erase your wrinkles|lifts permanently|melts fat|slims your nose|sculpt your face|perfect skin|anti-aging cure|beauty score/i;
    for (const c of COACH_ANSWERS) {
      expect(banned.test(c.answer.summary), c.id).toBe(false);
      for (const w of c.answer.warnings) expect(banned.test(w.message), c.id).toBe(false);
    }
  });
});

/* ═══════════════════════ Coach page ═══════════════════════════════════ */

describe('Coach page', () => {
  it('renders header, preview banner, suggestions and disclaimer; empty state shows', async () => {
    renderApp('/coach');
    expect(await screen.findByText(/answers come from our approved library, not a live AI/)).toBeTruthy();
    expect(screen.getByText(/3 free questions/)).toBeTruthy();
    expect(screen.getByText('Ask me about routines, ingredients, evidence, or how to keep going.')).toBeTruthy();
    expect(screen.getByText(/wellness coach, not a clinician/)).toBeTruthy();
    expect(screen.getByText('Is face yoga proven?')).toBeTruthy();
  });

  it('sends a question and receives a structured answer with sources', async () => {
    renderApp('/coach');
    const chip = await screen.findByText('Why sunscreen every day?');
    fireEvent.click(chip);
    expect(await screen.findByText(/best-supported habit in dermatology guidance/, {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText('Based on:')).toBeTruthy();
    expect(screen.getAllByText('American Academy of Dermatology').length).toBeGreaterThan(0);
    // persisted via saveCoachThread
    const threads = JSON.parse(localStorage.getItem('lf_coach_threads') ?? '[]') as { messages: { role: string }[] }[];
    expect(threads[0].messages.map((m) => m.role)).toEqual(['user', 'coach']);
  }, 10000);

  it('urgent input renders the interrupt card immediately and pauses coaching', async () => {
    renderApp('/coach');
    const input = await screen.findByLabelText('Ask the coach a question');
    fireEvent.change(input, { target: { value: 'Half my face suddenly feels weak and droopy' } });
    fireEvent.click(screen.getByLabelText('Send question'));
    // no typing delay — the card is present right away
    expect(await screen.findByText('Please see a professional now.', {}, { timeout: 500 })).toBeTruthy();
    expect(screen.getByText(/urgent medical attention — not an app/)).toBeTruthy();
    expect(screen.getByText('Coaching is paused for this conversation.')).toBeTruthy();
    // logged with requires_professional_review
    const threads = JSON.parse(localStorage.getItem('lf_coach_threads') ?? '[]') as { messages: { answer?: { requires_professional_review?: boolean; intent?: string } }[] }[];
    const coachMsg = threads[0].messages.find((m) => m.answer);
    expect(coachMsg?.answer?.requires_professional_review).toBe(true);
    expect(coachMsg?.answer?.intent).toBe('safety_redirect');
  });

  it('off-scope request gets a warm refusal, not an answer', async () => {
    renderApp('/coach');
    const input = await screen.findByLabelText('Ask the coach a question');
    fireEvent.change(input, { target: { value: 'Am I pretty? Rate my face.' } });
    fireEvent.click(screen.getByLabelText('Send question'));
    expect(await screen.findByText(/not a mirror or a clinician/, {}, { timeout: 4000 })).toBeTruthy();
  }, 10000);

  it('free tier exhausts after 3 questions today and offers PRO', async () => {
    const mk = (i: number) => ({ id: `u${i}`, role: 'user', text: `q${i}`, createdAt: `${todayKey()}T0${i}:00:00.000Z` });
    localStorage.setItem(
      'lf_coach_threads',
      JSON.stringify([{ id: 't1', createdAt: `${todayKey()}T00:00:00.000Z`, messages: [mk(1), mk(2), mk(3)] }]),
    );
    renderApp('/coach');
    expect(await screen.findByText("That's today's free coaching — PRO keeps the conversation open.")).toBeTruthy();
    expect(screen.getByText('See PRO')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${FREE_DAILY_QUESTIONS} of ${FREE_DAILY_QUESTIONS} free questions`))).toBeTruthy();
    // PRO users are unlimited
    cleanup();
    localStorage.setItem('lf_pro', JSON.stringify({ active: true, planLabel: 'Annual $49.99/yr' }));
    renderApp('/coach');
    expect(await screen.findByText('Today · Unlimited')).toBeTruthy();
  });
});

/* ═══════════════════════ Paywall page ═════════════════════════════════ */

describe('Paywall page', () => {
  it('shows compliant billing: annual pre-selected, monthly visible, all terms, close, demo label', async () => {
    renderApp('/paywall');
    expect(await screen.findByText('LumaFace PRO')).toBeTruthy();
    // annual hero pre-selected with trial + savings
    const annual = screen.getByRole('radio', { name: /Annual/ });
    expect(annual.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('BEST VALUE · SAVE 58%')).toBeTruthy();
    expect(screen.getByText(/7 days free/)).toBeTruthy();
    expect(screen.getByText('$49.99')).toBeTruthy();
    expect(screen.getByText('$4.17/month, billed yearly')).toBeTruthy();
    expect(screen.getByText('Monthly would cost $119.88/year — you save $69.89.')).toBeTruthy();
    // monthly visible same screen, no weekly plan anywhere
    expect(screen.getByText('$9.99')).toBeTruthy();
    expect(screen.queryByText(/weekly plan/i)).toBeNull();
    expect(screen.queryByText(/\$[\d.]+\s*\/\s*week/i)).toBeNull();
    // close visible immediately, cancel guidance + restore + fine print + demo label
    expect(screen.getByLabelText('Close and stay on the free tier')).toBeTruthy();
    expect(screen.getByText('Cancel anytime in Settings')).toBeTruthy();
    expect(screen.getByText('Restore purchase')).toBeTruthy();
    expect(screen.getByText(/Subscriptions renew automatically at the stated price/)).toBeTruthy();
    expect(screen.getByText('Demo build — no real charge is made.')).toBeTruthy();
    // trial timeline
    expect(screen.getByText(/Day 5 · we remind you/)).toBeTruthy();
  });

  it('simulated purchase sets lf_pro and shows the success state', async () => {
    renderApp('/paywall');
    fireEvent.click(await screen.findByText('Start 7-day free trial'));
    expect(await screen.findByText('Preparing your trial…')).toBeTruthy();
    expect(await screen.findByText(/Welcome to/, {}, { timeout: 4000 })).toBeTruthy();
    const pro = JSON.parse(localStorage.getItem('lf_pro') ?? 'null') as { active: boolean; planLabel: string } | null;
    expect(pro?.active).toBe(true);
    expect(pro?.planLabel).toBe('Annual $49.99/yr');
  }, 10000);

  it('restore purchase explains the demo build', async () => {
    renderApp('/paywall');
    fireEvent.click(await screen.findByText('Restore purchase'));
    expect(await screen.findByText('No store purchase found — this is a demo build')).toBeTruthy();
  });
});

/* ═══════════════════════ Profile page ═════════════════════════════════ */

describe('Profile page', () => {
  it('renders member card, privacy trust center, legal hub and danger zone', async () => {
    renderApp('/profile');
    expect(await screen.findByText('Free member')).toBeTruthy();
    expect(screen.getByText('Your data, your rules', { exact: false })).toBeTruthy();
    expect(screen.getByText('Camera guidance during activities')).toBeTruthy();
    expect(screen.getByText('Export my data')).toBeTruthy();
    expect(screen.getByText('Delete all my data')).toBeTruthy();
    expect(screen.getByText('When to see a professional')).toBeTruthy();
    expect(screen.getByText('AI disclosure')).toBeTruthy();
    expect(screen.getByText('Reset my progress')).toBeTruthy();
    expect(screen.getAllByText(/not medical advice/i).length).toBeGreaterThan(0);
  });

  it('delete-all double-confirm wipes every lf_* key (hold to confirm)', async () => {
    localStorage.setItem('lf_onboarded', 'true');
    localStorage.setItem('lf_profile', JSON.stringify({ goals: [], routineTime: 5, budgetMode: 'affordable', adultConfirmed: true }));
    renderApp('/profile');
    fireEvent.click(await screen.findByText('Delete all my data'));
    fireEvent.click(await screen.findByText('I understand, continue'));
    const hold = await screen.findByLabelText(/Hold to delete everything/);
    fireEvent.pointerDown(hold);
    // real 1.2s hold → confirm fires → every lf_* key removed
    await waitFor(
      () => {
        const remaining = Object.keys(localStorage).filter((k) => k.startsWith('lf_'));
        expect(remaining).toEqual([]);
      },
      { timeout: 4000 },
    );
  }, 10000);

  it('export confirm sheet triggers a JSON download of all lf_* keys', async () => {
    const urls: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => urls.push('downloaded'));
    renderApp('/profile');
    fireEvent.click(await screen.findByText('Export my data'));
    fireEvent.click(await screen.findByText('Download my data'));
    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(urls.length).toBe(1);
  });
});

/* ═══════════════════════ Help page ════════════════════════════════════ */

describe('Help page', () => {
  it('renders referral conditions, interim guidance, FAQ and contact', async () => {
    renderApp('/help');
    expect(await screen.findByText('Pause LumaFace and seek qualified care if you notice:')).toBeTruthy();
    expect(screen.getByText('Sudden facial weakness or drooping')).toBeTruthy();
    expect(screen.getByText('Symptoms after a recent procedure')).toBeTruthy();
    expect(screen.getByText('The calm trio is always safe-ish')).toBeTruthy();
    expect(screen.getByText('Does face yoga really work?')).toBeTruthy();
    expect(screen.getByText('Is LumaFace for teenagers?')).toBeTruthy();
    expect(screen.getByText('Email support')).toBeTruthy();
    expect(screen.getAllByText(/not medical advice/i).length).toBeGreaterThan(0);
    // no alarm language/UI anywhere
    expect(document.querySelector('.bg-red-500, .text-red-500')).toBeNull();
  });

  it('FAQ accordion opens an answer', async () => {
    renderApp('/help');
    fireEvent.click(await screen.findByText('How do I cancel?'));
    expect(await screen.findByText(/You keep PRO until the period ends/)).toBeTruthy();
  });
});
