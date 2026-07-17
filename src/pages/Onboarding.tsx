/**
 * /onboarding — the 9-step first-run flow (design/onboarding.md).
 *
 * Step 0 Welcome (promise + privacy + explicit 18+ confirmation — the Begin
 *   tap IS the confirmation; there is no way past Step 0 without it)
 * Step 1 Goals (max 3, enforced gently)
 * Step 2 Safety screening (7 optional questions, kind live notes from the
 *   rules engine, calm referral card — never scary, never red)
 * Step 3 Routine inventory (categories only; SAFE-PREG-RET note)
 * Step 4 Routine time (3/5/10) + environment (climate/outdoor/budget)
 * Step 5 Camera & privacy explainer ("never infers" + default-off consents)
 * Step 6 Building interstitial (~1.8s) — completeOnboarding runs HERE
 * Step 7 Personalized plan reveal (Today + Week 1 + why + honest expectations)
 * Step 8 Soft paywall moment (Sheet over the reveal; single CTA → /paywall,
 *   clear "start free" path)
 *
 * Skip contract: skipOnboarding() is offered ONLY pre-safety (Step 0 ghost +
 * Step 1 "Skip for now"). After the plan reveal the "start free" paths simply
 * finish — the plan is already built, so nothing is thrown away.
 *
 * Mid-flow persistence: partial input state (steps 0–5) is saved to
 * `lf_onboarding_draft` and resumed on reload; the draft is cleared on build
 * (Step 6) and on skip. (Documented choice — the draft key lives only here;
 * it can only exist pre-onboarding, where Profile/delete-all is unreachable.)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import { EMPTY_INVENTORY, EMPTY_SAFETY_ANSWERS, type Inventory, type SafetyAnswers } from '@/lib/rules';
import { GOALS, INVENTORY_OPTIONS, REACT_HISTORY_OPTIONS, SAFETY_QUESTIONS, type SafetyQuestionDef } from '@/data/content';
import { COLORS, EASE_OUT_SOFT, EASE_SIGNATURE } from '@/lib/theme';
import Sheet from '@/components/Sheet';
import StepWelcome from '@/pages/onboarding/StepWelcome';
import StepGoals from '@/pages/onboarding/StepGoals';
import StepSafety from '@/pages/onboarding/StepSafety';
import StepInventory from '@/pages/onboarding/StepInventory';
import StepTime, { type TimeEnvValues } from '@/pages/onboarding/StepTime';
import StepCamera from '@/pages/onboarding/StepCamera';
import StepBuilding from '@/pages/onboarding/StepBuilding';
import StepPlanReveal from '@/pages/onboarding/StepPlanReveal';
import StepPaywallMoment from '@/pages/onboarding/StepPaywallMoment';

const TOTAL_STEPS = 9;
const DRAFT_KEY = 'lf_onboarding_draft';

/* ── Draft (mid-flow resume) ───────────────────────────────────────────── */

interface OnboardingDraft extends TimeEnvValues {
  v: 1;
  step: number;
  goals: string[];
  answers: SafetyAnswers;
  inventory: Inventory;
  cameraCoach: boolean;
  photoSave: boolean;
}

const GOAL_IDS = new Set<string>(GOALS.map((g) => g.id));
const PRODUCT_IDS = new Set<string>(INVENTORY_OPTIONS.map((o) => o.id));
const REACT_IDS = new Set<string>(REACT_HISTORY_OPTIONS.map((o) => o.id));
const CLIMATES = new Set(['dry', 'temperate', 'humid']);
const OUTDOORS = new Set(['indoors', 'some', 'lots']);
const BUDGETS = new Set(['none', 'affordable', 'standard', 'premium']);

function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (d.v !== 1) return null;

    const goals = (Array.isArray(d.goals) ? d.goals : []).filter((g): g is string => typeof g === 'string' && GOAL_IDS.has(g)).slice(0, 3);
    let step = typeof d.step === 'number' && Number.isInteger(d.step) ? d.step : 0;
    // steps ≥6 require the completed build — resume at the last input step
    step = Math.min(Math.max(step, 0), 5);
    if (step >= 2 && goals.length === 0) step = 1; // goals gate was never passed

    const answers: SafetyAnswers = { ...EMPTY_SAFETY_ANSWERS };
    if (d.answers && typeof d.answers === 'object') {
      for (const q of SAFETY_QUESTIONS) answers[q.key] = d.answers[q.key] === true;
    }

    const products = (Array.isArray(d.inventory?.products) ? d.inventory.products : []).filter(
      (p): p is string => typeof p === 'string' && PRODUCT_IDS.has(p),
    );
    const reactsToNew = REACT_IDS.has(d.inventory?.reactsToNew as string)
      ? (d.inventory!.reactsToNew as Inventory['reactsToNew'])
      : null;

    return {
      v: 1,
      step,
      goals,
      answers,
      inventory: { products, reactsToNew },
      routineTime: d.routineTime === 3 || d.routineTime === 5 || d.routineTime === 10 ? d.routineTime : 5,
      climate: CLIMATES.has(d.climate as string) ? (d.climate as TimeEnvValues['climate']) : 'temperate',
      outdoorTime: OUTDOORS.has(d.outdoorTime as string) ? (d.outdoorTime as TimeEnvValues['outdoorTime']) : 'indoors',
      budgetMode: BUDGETS.has(d.budgetMode as string) ? (d.budgetMode as TimeEnvValues['budgetMode']) : 'affordable',
      cameraCoach: d.cameraCoach === true,
      photoSave: d.photoSave === true,
    };
  } catch {
    return null;
  }
}

function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* best-effort */
  }
}

/* ── Progress segments (onboarding.md structure) ───────────────────────── */

function ProgressSegments({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={step + 1}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Onboarding step ${step + 1} of ${TOTAL_STEPS}`}
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{
            width: i === step ? 16 : 6,
            backgroundColor: i <= step ? COLORS.ink : COLORS.hairline,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Onboarding() {
  const navigate = useNavigate();
  const { completeOnboarding, skipOnboarding, onboarded } = useApp();
  const reduced = useReducedMotion();

  // If onboarding was already finished before this visit (e.g. a reload after
  // the build step), go straight Home.
  const onboardedAtMount = useRef(onboarded);
  useEffect(() => {
    if (onboardedAtMount.current) navigate('/', { replace: true });
  }, [navigate]);

  // Lazy one-time draft load (mid-flow resume) — same pattern as lib/store.tsx.
  // The initializer runs only on mount, so `onboarded` here is the mount value.
  const [draft] = useState<OnboardingDraft | null>(() => (onboarded ? null : loadDraft()));

  const [step, setStep] = useState<number>(() => draft?.step ?? 0);
  const [dir, setDir] = useState(1);
  const [goals, setGoals] = useState<string[]>(() => draft?.goals ?? []);
  const [answers, setAnswers] = useState<SafetyAnswers>(() => draft?.answers ?? { ...EMPTY_SAFETY_ANSWERS });
  const [inventory, setInventory] = useState<Inventory>(() => draft?.inventory ?? { ...EMPTY_INVENTORY });
  const [timeEnv, setTimeEnv] = useState<TimeEnvValues>(() => ({
    routineTime: draft?.routineTime ?? 5,
    climate: draft?.climate ?? 'temperate',
    outdoorTime: draft?.outdoorTime ?? 'indoors',
    budgetMode: draft?.budgetMode ?? 'affordable',
  }));
  const [cameraCoach, setCameraCoach] = useState<boolean>(() => draft?.cameraCoach ?? false);
  const [photoSave, setPhotoSave] = useState<boolean>(() => draft?.photoSave ?? false);

  // Persist partial progress (input steps only)
  useEffect(() => {
    if (onboardedAtMount.current || step > 5) return;
    const d: OnboardingDraft = {
      v: 1,
      step,
      goals,
      answers,
      inventory,
      ...timeEnv,
      cameraCoach,
      photoSave,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* best-effort */
    }
  }, [step, goals, answers, inventory, timeEnv, cameraCoach, photoSave]);

  // Reset scroll on every step change (jsdom lacks Element.scrollTo — guard)
  useEffect(() => {
    const scroller = document.querySelector('[data-lf-scroll]');
    if (scroller && typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: 0 });
  }, [step]);

  const go = useCallback(
    (n: number) => {
      setDir(n > step ? 1 : -1);
      setStep(n);
    },
    [step],
  );

  /* ── Flow actions ── */

  const handleSkip = useCallback(() => {
    clearDraft();
    skipOnboarding(); // conservative plan + gentle defaults (store contract)
    navigate('/');
  }, [skipOnboarding, navigate]);

  // Step 6 timer fired — the local rules engine runs NOW (onboarding.md §6
  // engineering note): evaluate safety, build the 28-day plan, persist all
  // lf_* keys via the store contract.
  const handleBuildDone = useCallback(() => {
    completeOnboarding({
      profile: {
        goals,
        routineTime: timeEnv.routineTime,
        budgetMode: timeEnv.budgetMode,
        adultConfirmed: true,
        climate: timeEnv.climate,
        outdoorTime: timeEnv.outdoorTime,
      },
      safetyAnswers: answers,
      inventory,
      consents: { cameraCoach, photoSave },
    });
    clearDraft();
    setDir(1);
    setStep(7);
  }, [completeOnboarding, goals, timeEnv, answers, inventory, cameraCoach, photoSave]);

  const handleFinish = useCallback(() => navigate('/'), [navigate]);
  const handleSeePlans = useCallback(() => navigate('/paywall'), [navigate]);

  const toggleSafety = useCallback((key: SafetyQuestionDef['key']) => {
    setAnswers((prev) => {
      const next = { ...prev };
      next[key] = !next[key];
      return next;
    });
  }, []);

  /* ── Transition choreography (onboarding.md: exit x:-40/0.28 signature,
        enter x:40→0/0.4 out-soft; direction- and RTL-aware) ── */
  const rtl = useMemo(
    () => typeof document !== 'undefined' && document.documentElement.dir === 'rtl',
    [],
  );
  const dirMult = dir * (rtl ? -1 : 1);
  const screen = step === 8 ? 7 : step; // Step 8 overlays Step 7 — no re-mount

  const variants = {
    enter: (d: number) => ({
      opacity: 0,
      x: reduced ? 0 : 40 * d,
      transition: { duration: reduced ? 0.2 : 0.4, ease: EASE_OUT_SOFT },
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: reduced ? 0.2 : 0.4, ease: EASE_OUT_SOFT },
    },
    exit: (d: number) => ({
      opacity: 0,
      x: reduced ? 0 : -40 * d,
      transition: { duration: reduced ? 0.2 : 0.28, ease: EASE_SIGNATURE },
    }),
  };

  return (
    <div className="min-h-[100dvh] bg-cream">
      {/* Chrome — progress segments, back chevron, skip (pre-safety only) */}
      <header className="relative flex items-center justify-center px-3 pt-3 pb-2 min-h-[56px]">
        {step >= 1 && step <= 5 && (
          <button
            type="button"
            onClick={() => go(step - 1)}
            aria-label="Back"
            className="absolute start-1 top-1/2 -translate-y-1/2 inline-flex size-[44px] items-center justify-center rounded-full text-ink"
          >
            <ChevronLeft size={22} strokeWidth={1.75} className="rtl:-scale-x-100" aria-hidden="true" />
          </button>
        )}
        <ProgressSegments step={step} />
        {step === 1 && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-caption text-ink-2 min-h-[44px] px-2"
          >
            Skip for now
          </button>
        )}
      </header>

      <div className="px-5 pb-12">
        <AnimatePresence mode="wait" initial={false} custom={dirMult}>
          <motion.div
            key={screen}
            custom={dirMult}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {screen === 0 && <StepWelcome onBegin={() => go(1)} onLookAround={handleSkip} />}
            {screen === 1 && <StepGoals goals={goals} onChange={setGoals} onContinue={() => go(2)} />}
            {screen === 2 && (
              <StepSafety answers={answers} inventory={inventory} onToggle={toggleSafety} onContinue={() => go(3)} />
            )}
            {screen === 3 && (
              <StepInventory
                inventory={inventory}
                pregnantOrTrying={answers.pregnantOrTrying === true}
                onChange={setInventory}
                onContinue={() => go(4)}
                onPreferNot={() => {
                  setInventory({ ...EMPTY_INVENTORY });
                  go(4);
                }}
              />
            )}
            {screen === 4 && (
              <StepTime
                values={timeEnv}
                onChange={(patch) => setTimeEnv((prev) => ({ ...prev, ...patch }))}
                onContinue={() => go(5)}
              />
            )}
            {screen === 5 && (
              <StepCamera
                cameraCoach={cameraCoach}
                photoSave={photoSave}
                onConsent={(key, v) => (key === 'cameraCoach' ? setCameraCoach(v) : setPhotoSave(v))}
                onContinue={() => go(6)}
                onLater={() => {
                  setCameraCoach(false);
                  setPhotoSave(false);
                  go(6);
                }}
              />
            )}
            {screen === 6 && <StepBuilding onDone={handleBuildDone} />}
            {screen === 7 && (
              <>
                <StepPlanReveal onFinish={handleFinish} onShowPaywall={() => go(8)} />
                <Sheet open={step === 8} onClose={handleFinish} ariaLabel="LumaFace PRO — a gentle introduction">
                  <StepPaywallMoment onSeePlans={handleSeePlans} onStartFree={handleFinish} />
                </Sheet>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
