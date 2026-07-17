/**
 * BillingSuccess — `/billing/success` (Stripe Checkout return URL).
 * The webhook flips `is_pro` server-side, so this page polls
 * entitlement-status (1.5s cadence, ~20s budget) until it lands:
 *   is_pro → setPro(server plan label) + petal celebration + trial line → `/`
 *   budget exhausted → honest "payment received, activation pending" state
 *     pointing at Restore on the paywall (never a fake activation).
 * Signed out → gentle sign-in prompt (we can't verify without a session).
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Check, Clock, LogIn } from 'lucide-react';
import { useApp } from '@/lib/store';
import { EASE_OUT_SOFT } from '@/lib/theme';
import {
  authFromApp,
  mapServerPlanToLabel,
  pollEntitlementUntilPro,
  type AuthSnapshot,
} from '@/lib/billing';
import PetalConfetti from '@/components/PetalConfetti';

const EASE = EASE_OUT_SOFT;

type Stage = 'polling' | 'activated' | 'pending' | 'signed-out';

export interface BillingSuccessProps {
  /** Test seam: override the auth snapshot until the store's auth slice lands. */
  authOverride?: AuthSnapshot;
  /** Test seam: shrink the polling budget. */
  pollConfig?: { intervalMs?: number; timeoutMs?: number };
}

export default function BillingSuccess({ authOverride, pollConfig }: BillingSuccessProps = {}) {
  const app = useApp();
  const { setPro } = app;
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('polling');
  const [annual, setAnnual] = useState(true);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    let cancelled = false;
    const auth = authOverride ?? authFromApp(app);
    if (!auth.signedIn || !auth.token) {
      setStage('signed-out');
      return;
    }
    const token = auth.token;
    (async () => {
      const res = await pollEntitlementUntilPro(token, {
        intervalMs: pollConfig?.intervalMs ?? 1500,
        timeoutMs: pollConfig?.timeoutMs ?? 20000,
      });
      if (cancelled) return;
      if (res.activated) {
        const label = mapServerPlanToLabel(res.entitlement?.planLabel);
        setPro(label);
        setAnnual(label !== 'Monthly $9.99/mo');
        setStage('activated');
        timers.current.push(window.setTimeout(() => navigate('/'), 6000));
      } else {
        setStage('pending');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; app/override identity is stable
  }, []);

  return (
    <motion.div
      className="lf-paywall-gradient relative flex min-h-full flex-col items-center justify-center px-5 py-16 text-center text-[#FDF7F2]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {stage === 'polling' && (
        <>
          <span className="size-8 animate-spin rounded-full border-[3px] border-[rgba(253,247,242,.3)] border-t-[#FDF7F2]" aria-hidden="true" />
          <h1 className="font-display text-display-lg mt-6">Confirming your payment…</h1>
          <p className="mt-2 max-w-[32ch] text-body text-[rgba(253,247,242,.75)]">
            This takes a few seconds — Stripe is letting our server know.
          </p>
        </>
      )}

      {stage === 'activated' && (
        <>
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
            {annual ? 'Your 7-day trial is active — we’ll remind you on day 5.' : 'Your subscription is active — everything is open.'}
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
        </>
      )}

      {stage === 'pending' && (
        <>
          <span className="inline-flex size-[84px] items-center justify-center rounded-full bg-[rgba(253,247,242,.16)]" aria-hidden="true">
            <Clock size={36} strokeWidth={1.75} />
          </span>
          <h1 className="font-display text-display-lg mt-6">Payment received — activation pending.</h1>
          <p className="mt-3 max-w-[34ch] text-body text-[rgba(253,247,242,.75)]">
            Stripe confirmed your payment; PRO unlocks as soon as our server catches up (usually under a minute). On the
            paywall, tap <strong>Restore purchase</strong> to refresh.
          </p>
          <button
            type="button"
            onClick={() => navigate('/paywall')}
            className="mt-8 inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-bold text-plum"
          >
            Open the paywall
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center text-caption text-[rgba(253,247,242,.7)] underline underline-offset-2"
          >
            Back to today
          </button>
        </>
      )}

      {stage === 'signed-out' && (
        <>
          <span className="inline-flex size-[84px] items-center justify-center rounded-full bg-[rgba(253,247,242,.16)]" aria-hidden="true">
            <LogIn size={36} strokeWidth={1.75} />
          </span>
          <h1 className="font-display text-display-lg mt-6">One more step — sign in.</h1>
          <p className="mt-3 max-w-[34ch] text-body text-[rgba(253,247,242,.75)]">
            We can’t verify your subscription until you’re signed in. Sign in from Profile, then this activation finishes
            itself.
          </p>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="mt-8 inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-bold text-plum"
          >
            Go to Profile
          </button>
        </>
      )}
    </motion.div>
  );
}
