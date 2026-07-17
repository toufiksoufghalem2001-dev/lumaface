/**
 * BillingCancel — `/billing/cancel` (Stripe Checkout cancel URL).
 * Calm, no-pressure: no charge was made, the free tier is real, the offer
 * waits. One path back to the paywall, one path home, one to Support.
 */

import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Flower2 } from 'lucide-react';
import { EASE_OUT_SOFT } from '@/lib/theme';

const EASE = EASE_OUT_SOFT;

export default function BillingCancel() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="lf-paywall-gradient relative flex min-h-full flex-col items-center justify-center px-5 py-16 text-center text-[#FDF7F2]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="inline-flex size-[84px] items-center justify-center rounded-full bg-[rgba(253,247,242,.16)]"
        aria-hidden="true"
      >
        <Flower2 size={36} strokeWidth={1.75} />
      </motion.span>
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        className="font-display text-display-lg mt-6"
      >
        No charge was made.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
        className="mt-3 max-w-[34ch] text-body text-[rgba(253,247,242,.75)]"
      >
        Take your time — the free tier is yours whenever you’re ready, and the offer waits exactly as you left it.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
        className="mt-8 w-full"
      >
        <button
          type="button"
          onClick={() => navigate('/paywall')}
          className="inline-flex min-h-[54px] w-full items-center justify-center rounded-full bg-white px-6 text-[16px] font-bold text-plum"
        >
          Back to the offer
        </button>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-3 inline-flex min-h-[44px] items-center justify-center text-caption text-[rgba(253,247,242,.7)] underline underline-offset-2"
        >
          Continue with the free tier
        </button>
        <p className="mt-6 text-caption text-[rgba(253,247,242,.55)]">
          Something felt unclear?{' '}
          <button type="button" onClick={() => navigate('/support')} className="underline underline-offset-2">
            Talk to us
          </button>{' '}
          — a person answers.
        </p>
      </motion.div>
    </motion.div>
  );
}
