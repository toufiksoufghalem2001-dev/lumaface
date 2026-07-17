/**
 * Paywall — `/paywall` (design/paywall.md). Store-compliant soft paywall:
 * value-first feature list, Annual $49.99 hero pre-selected (7-day trial,
 * real savings vs monthly), Monthly $9.99 on the same screen — NO weekly
 * plan anywhere. Close is visible immediately (never delayed), billing
 * terms (price · interval · trial · post-trial · renewal) live in a sticky
 * block that never scrolls away at 390×844, restore purchase (simulated),
 * "Cancel anytime in Settings" on the paywall itself, no countdowns, no
 * fake testimonials, unaltered hero-still-life.png imagery only.
 * Demo build: purchase is simulated → setPro(planLabel) → success state.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Lock, PiggyBank, ShieldCheck, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { COLORS, EASE_OUT_SOFT } from '@/lib/theme';
import Sheet from '@/components/Sheet';
import PetalConfetti from '@/components/PetalConfetti';
import { MarkPetal } from '@/components/illos';

const EASE = EASE_OUT_SOFT;

type PlanId = 'annual' | 'monthly';

const PLANS: Record<PlanId, { label: string; proLabel: string; cta: string }> = {
  annual: { label: 'Annual', proLabel: 'Annual $49.99/yr', cta: 'Start 7-day free trial' },
  monthly: { label: 'Monthly', proLabel: 'Monthly $9.99/mo', cta: 'Subscribe for $9.99/month' },
};

const FEATURES: { text: string; note: string; tint: string; deep: string; expandable?: boolean }[] = [
  { text: 'Your 28-day plan + weekly adjustments', note: 'adapts to comfort & irritation', tint: '#FBEFF1', deep: '#96455C' },
  { text: 'The full activity library', note: 'all 24, every tier labeled', tint: '#F7F0E2', deep: '#7A5A24' },
  { text: 'Camera-guided coaching', note: 'gentle form cues · on-device (Preview)', tint: '#EDF4FB', deep: '#2F6189' },
  { text: 'The LumaFace coach, unlimited', note: 'answers with sources, always', tint: COLORS.violetTint, deep: COLORS.violet },
  { text: 'Standardized progress history', note: 'same-conditions photos, on-device', tint: '#F0F5EC', deep: '#4A6B43', expandable: true },
  { text: 'Ingredient & compatibility education', note: 'paced one-active introductions', tint: '#FBF0EB', deep: '#9C5844' },
  { text: 'Climate, time & budget adaptation', note: 'your routine fits your real life', tint: '#EBF5F2', deep: '#33675C' },
];

const TERMS_COPY =
  'Annual: $49.99/year after a 7-day free trial; the trial converts to the annual plan unless canceled at least 24 hours before it ends. Monthly: $9.99/month, no trial. Subscriptions renew automatically at the stated price and interval until canceled — manage or cancel anytime in your store settings (linked from Profile). Refunds are routed through your store. In this demo build no real charge is ever made.';

const PRIVACY_SUMMARY =
  'Photos stay on your device. Live camera frames never leave your device. No account needed. No sale of personal data. No facial analysis for advertising or identity. Coach messages in this preview build are simulated locally and never leave your device.';

/** User "calmer animations" pref (set in Profile) — local mirror, OS pref wins via useReducedMotion. */
function calmMotionPref(): boolean {
  try {
    const raw = localStorage.getItem('lf_prefs');
    return raw ? Boolean(JSON.parse(raw).reducedMotion) : false;
  } catch {
    return false;
  }
}

/* ── Plan card ─────────────────────────────────────────────────────────── */

function PlanCard({
  id,
  selected,
  onSelect,
}: {
  id: PlanId;
  selected: boolean;
  onSelect: (id: PlanId) => void;
}) {
  const annual = id === 'annual';
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(id)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: selected ? -2 : 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={cn(
        'relative w-full rounded-[20px] bg-card p-3.5 text-start transition-[box-shadow,border-color] duration-200',
        selected ? 'border-2 border-rose shadow-pop' : 'border border-hairline shadow-card',
      )}
    >
      {annual && (
        <span className="absolute -top-2.5 end-3.5 rounded-full bg-rose px-2.5 py-1 text-[11px] font-bold text-white">
          BEST VALUE · SAVE 58%
        </span>
      )}
      <span className="flex items-center gap-3">
        {/* radio */}
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
            selected ? 'border-rose bg-rose' : 'border-ink-3 bg-transparent',
          )}
        >
          {selected && <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="size-[8px] rounded-full bg-white" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-bold text-ink">{PLANS[id].label}</span>
          <span className="block text-caption text-ink-2">
            {annual ? '$4.17/month, billed yearly' : 'no trial — flexibility first'}
          </span>
        </span>
        <span className="text-end">
          <span className="font-display font-semibold text-[24px] leading-[26px] text-ink">{annual ? '$49.99' : '$9.99'}</span>
          <span className="block text-caption text-ink-2">{annual ? '/year' : '/month'}</span>
        </span>
      </span>
      {annual && (
        <>
          <span className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-rose-tint px-3 py-2 text-label" style={{ color: COLORS.roseDeep }}>
            <Sparkles size={14} aria-hidden="true" />
            <span>
              <strong>7 days free</strong> — then $49.99/year. Cancel anytime.
            </span>
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-caption" style={{ color: COLORS.sageDeep }}>
            <PiggyBank size={12} aria-hidden="true" />
            Monthly would cost $119.88/year — you save $69.89.
          </span>
        </>
      )}
    </motion.button>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */

export default function Paywall() {
  const { setPro } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const osReduceMotion = useReducedMotion();
  const staticGradient = osReduceMotion || calmMotionPref();

  const from = params.get('from') ?? (location.state as { from?: string } | null)?.from ?? null;
  const postOnboarding = from === 'onboarding';
  const showHeroImage = from !== 'lock';

  const [plan, setPlan] = useState<PlanId>('annual'); // Annual hero pre-selected
  const [stage, setStage] = useState<'offer' | 'processing' | 'success'>('offer');
  const [privacyNoteOpen, setPrivacyNoteOpen] = useState(false);
  const [legalSheet, setLegalSheet] = useState<'terms' | 'privacy' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function showToast(text: string) {
    setToast(text);
    later(() => setToast(null), 2400);
  }

  function close() {
    if (leaving) return;
    setLeaving(true);
    setToast("The free tier is yours — waiting whenever you're ready 🌸");
    later(() => {
      if (location.key === 'default') navigate('/');
      else navigate(-1);
    }, 1400);
  }

  function purchase() {
    if (stage !== 'offer') return;
    setStage('processing');
    later(() => {
      setPro(PLANS[plan].proLabel);
      setStage('success');
    }, 1200);
  }

  const finePrint = useMemo(
    () =>
      'Payment is charged to your store account at confirmation of purchase. Subscriptions renew automatically at the stated price and interval unless canceled at least 24 hours before the period ends — manage or cancel anytime in your store settings. The 7-day trial converts to the annual plan at $49.99/year unless canceled. LumaFace is a cosmetic wellness and education app; it is not medical advice and provides no diagnosis.',
    [],
  );

  return (
    <motion.div
      className="lf-paywall-gradient relative flex min-h-full flex-col text-[#FDF7F2]"
      style={{ backgroundSize: '180% 180%' }}
      animate={staticGradient ? undefined : { backgroundPosition: ['0% 0%', '100% 100%'] }}
      transition={staticGradient ? undefined : { duration: 18, repeat: Infinity, repeatType: 'mirror', ease: 'linear' }}
    >
      {stage === 'success' ? (
        /* ── Section 7 — Success state ── */
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-16 text-center">
          <PetalConfetti active accentColor="#FDF7F2" count={26} />
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="inline-flex size-[84px] items-center justify-center rounded-full bg-gold shadow-glow-gold"
          >
            <Check size={40} strokeWidth={2.5} className="text-white" aria-hidden="true" />
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="font-display text-display-lg mt-6"
          >
            Welcome to <strong>PRO</strong>.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: EASE }}
            className="font-display italic text-quote mt-2 text-[rgba(253,247,242,.8)]"
          >
            Your whole ritual is open — begin whenever you're ready.
          </motion.p>
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="mt-8 inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-bold text-plum"
          >
            Continue to today
          </motion.button>
        </div>
      ) : (
        <>
          {/* ── Scrollable value content ── */}
          <div className="flex-1 px-5 pb-6">
            {/* Close X — visible immediately, never delayed */}
            <div className="flex pt-4">
              <button
                type="button"
                onClick={close}
                aria-label="Close and stay on the free tier"
                className="inline-flex size-10 items-center justify-center rounded-full bg-[rgba(253,247,242,.16)] text-[#FDF7F2]"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            {/* Hero lockup */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="mt-2 flex flex-col items-center">
              <MarkPetal className="size-10" color="#ECC1B4" />
              <div className="mt-2 flex items-center gap-2">
                <span className="sr-only">LumaFace PRO</span>
                <span aria-hidden="true" className="font-display text-[24px] font-semibold leading-[30px]">
                  LumaFace
                </span>
                <span aria-hidden="true" className="rounded-full bg-violet-tint px-2 py-[3px] text-[12px] font-bold text-violet">
                  PRO
                </span>
              </div>
              {showHeroImage && (
                <motion.img
                  src="/hero-still-life.png"
                  alt="A jade roller, gua sha stone, moisturizer and tea on cream linen — the calm of a morning ritual"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                  className="mt-3 h-[110px] w-[88px] object-cover"
                  style={{ borderRadius: '90px 90px 16px 16px', boxShadow: '0 0 0 8px rgba(255,255,255,.1)' }}
                />
              )}
            </motion.div>

            {/* Headline block */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }} className="mt-4 text-center">
              {postOnboarding && <p className="text-eyebrow uppercase text-[rgba(253,247,242,.72)]">Your first week is free</p>}
              <h2 className="font-display text-display-lg mt-1">
                {postOnboarding ? (
                  <>
                    Your plan grows <em>with</em> you.
                  </>
                ) : (
                  <>
                    Care that <em>adjusts</em> to you.
                  </>
                )}
              </h2>
              <p className="mx-auto mt-2 max-w-[34ch] text-body text-[rgba(253,247,242,.72)]">
                Your 28-day plan, re-tuned every week from how your skin and life respond — plus the full library, coach and diary.
              </p>
            </motion.div>

            {/* Feature list */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="mt-5 rounded-card bg-card p-[14px] text-ink"
            >
              {FEATURES.map((f, i) => (
                <motion.div key={f.text} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease: EASE }}>
                  <button
                    type="button"
                    disabled={!f.expandable}
                    onClick={() => f.expandable && setPrivacyNoteOpen((v) => !v)}
                    aria-expanded={f.expandable ? privacyNoteOpen : undefined}
                    className={cn('flex w-full items-center gap-2.5 py-2 text-start min-h-[40px]', i > 0 && 'border-t border-hairline')}
                  >
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.25 + i * 0.06 }}
                      className="inline-flex size-[26px] shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: f.tint, color: f.deep }}
                      aria-hidden="true"
                    >
                      <Check size={14} strokeWidth={2.25} />
                    </motion.span>
                    <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-[18px]">{f.text}</span>
                    <span className="shrink-0 text-right text-[11px] leading-[15px] text-ink-2" style={{ maxWidth: '38%' }}>
                      {f.note}
                    </span>
                  </button>
                  {f.expandable && privacyNoteOpen && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-2 ps-9 text-caption text-ink-2">
                      Photos save only on this device, only with your consent, deletable one by one.
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {/* Trust line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-caption text-[rgba(253,247,242,.72)]"
            >
              <span className="inline-flex items-center gap-1">
                <Check size={12} aria-hidden="true" /> Cancel anytime in Settings
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck size={12} aria-hidden="true" /> No hidden fees, ever
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Lock size={12} aria-hidden="true" /> Secure store payment
              </span>
            </motion.p>
          </div>

          {/* ── Sticky billing block: plan selector + CTA + terms never scroll away ── */}
          <div className="sticky bottom-0 px-5 pb-5 pt-6" style={{ background: 'linear-gradient(transparent, rgba(62,29,58,.94) 18%)' }}>
            <div role="radiogroup" aria-label="Choose your plan" className="flex flex-col gap-2.5">
              <PlanCard id="annual" selected={plan === 'annual'} onSelect={setPlan} />
              <PlanCard id="monthly" selected={plan === 'monthly'} onSelect={setPlan} />
            </div>

            {/* CTA */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
              whileTap={{ scale: 0.97 }}
              onClick={purchase}
              disabled={stage === 'processing'}
              className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-white text-[16px] font-bold text-plum"
              style={{ boxShadow: '0 14px 34px -10px rgba(0,0,0,.4)' }}
            >
              {stage === 'processing' ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-plum/30 border-t-plum" aria-hidden="true" />
                  Preparing your trial…
                </>
              ) : (
                PLANS[plan].cta
              )}
            </motion.button>

            {/* Trial timeline (annual only) */}
            {plan === 'annual' && (
              <div className="mt-3 flex items-start" aria-label="How the trial works">
                {['Today · free access begins', 'Day 5 · we remind you', 'Day 7 · first charge unless you cancel'].map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.5 + i * 0.06, ease: EASE }}
                    className="relative flex-1 text-center"
                  >
                    {i < 2 && <span className="absolute start-1/2 top-[4px] h-px w-full bg-[rgba(253,247,242,.3)]" aria-hidden="true" />}
                    <span className="relative mx-auto block size-[9px] rounded-full bg-[#FDF7F2]" aria-hidden="true" />
                    <span className="mt-1.5 block px-1 text-[10.5px] leading-[14px] text-[rgba(253,247,242,.72)]">{step}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Fine print */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.7 }} className="mx-auto mt-3 max-w-[34ch] text-center text-[10.5px] leading-[15px] text-[rgba(253,247,242,.55)]">
              {finePrint}
            </motion.p>

            {/* Footer links */}
            <div className="mt-2.5 flex items-center justify-center gap-5">
              <button type="button" onClick={() => showToast('No store purchase found — this is a demo build')} className="text-caption text-[rgba(253,247,242,.55)] underline underline-offset-2 min-h-[32px]">
                Restore purchase
              </button>
              <button type="button" onClick={() => setLegalSheet('terms')} className="text-caption text-[rgba(253,247,242,.55)] underline underline-offset-2 min-h-[32px]">
                Terms
              </button>
              <button type="button" onClick={() => setLegalSheet('privacy')} className="text-caption text-[rgba(253,247,242,.55)] underline underline-offset-2 min-h-[32px]">
                Privacy
              </button>
            </div>
            <p className="mt-1 text-center text-[10.5px] text-[rgba(253,247,242,.55)]">Demo build — no real charge is made.</p>
          </div>
        </>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[85%] rounded-full bg-cream px-5 py-3 text-center text-caption text-ink shadow-pop"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legal sheets (full hub lives in Profile) */}
      <Sheet open={legalSheet === 'terms'} onClose={() => setLegalSheet(null)} ariaLabel="Terms and subscription terms">
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Plain and short</p>
        <h3 className="font-display text-display-md text-ink mt-1">Terms & subscription terms</h3>
        <p className="text-body text-ink mt-3">{TERMS_COPY}</p>
      </Sheet>
      <Sheet open={legalSheet === 'privacy'} onClose={() => setLegalSheet(null)} ariaLabel="Privacy policy summary">
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Your data, your rules</p>
        <h3 className="font-display text-display-md text-ink mt-1">Privacy, in plain language</h3>
        <p className="text-body text-ink mt-3">{PRIVACY_SUMMARY}</p>
      </Sheet>
    </motion.div>
  );
}
