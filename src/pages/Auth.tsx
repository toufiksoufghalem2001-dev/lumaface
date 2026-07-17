/**
 * Auth — `/auth` (M2). A warm, on-brand sign-in screen: email magic link
 * (no passwords), a clear sent state, honest error states, and a guilt-free
 * "continue without an account" path. Photos-stay-local promise is explicit.
 *
 * Session detection: the AppProvider subscribes to supabase-js
 * `onAuthStateChange`; when a session exists (including the magic-link
 * return via /auth/callback) this page routes home. With BACKEND_ENABLED
 * false, the page degrades to an honest "works offline" card.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Check, FolderLock, Mail, RotateCcw, X } from 'lucide-react';
import { BACKEND_ENABLED } from '@/lib/config';
import { sendMagicLink } from '@/lib/supabase';
import { useApp } from '@/lib/store';
import { Card, LFButton } from '@/components/ui';
import { EASE_OUT_SOFT } from '@/lib/theme';

const EASE = EASE_OUT_SOFT;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Auth() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Signed in (already, or the magic link just landed) → go home. */
  useEffect(() => {
    if (auth.status === 'signed-in') navigate('/', { replace: true });
  }, [auth.status, navigate]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError('That email looks incomplete — mind checking it?');
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await sendMagicLink(clean);
    setBusy(false);
    if (failure) {
      setError(failure);
      setSent(false);
      return;
    }
    setEmail(clean);
    setSent(true);
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-10 pt-5">
      {/* warm blooms */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -top-20 -right-24 size-72 rounded-full bg-rose-tint opacity-70 blur-3xl" />
        <span className="absolute bottom-24 -left-28 size-80 rounded-full bg-[#F7F0E2] opacity-80 blur-3xl" />
      </div>

      <div className="relative flex items-center justify-between">
        <span className="font-display italic font-semibold text-[22px] text-ink">LumaFace</span>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Close sign-in"
          className="inline-flex size-[40px] items-center justify-center rounded-full bg-cream-2 text-ink-2"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }} className="relative mt-10">
        <p className="text-eyebrow uppercase text-ink-2">Your ritual, everywhere</p>
        <h1 className="font-display text-display-lg text-ink mt-2">One gentle link,<br />no password</h1>
        <p className="text-body text-ink-2 mt-3">
          Sign in to sync your plan and progress across devices and keep a safe backup — only if you opt in.
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1, ease: EASE }} className="relative mt-8">
        <Card className="rounded-[24px] shadow-pop p-5">
          {!BACKEND_ENABLED ? (
            <>
              <h2 className="font-display text-title text-ink">Fully offline, fully yours</h2>
              <p className="text-body text-ink-2 mt-2">
                Accounts aren't available in this build — LumaFace works completely without one. Everything stays on this device.
              </p>
              <LFButton className="mt-5" onClick={() => navigate('/')}>
                Continue
              </LFButton>
            </>
          ) : sent ? (
            <>
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-sage/15 text-sage-deep" aria-hidden="true">
                <Check size={22} />
              </span>
              <h2 className="font-display text-title text-ink mt-3">Check your inbox</h2>
              <p className="text-body text-ink-2 mt-2">
                We sent a sign-in link to <span className="font-bold text-ink">{email}</span>. Open it on this device and you'll land right back here.
              </p>
              <div className="mt-5 flex flex-col gap-1.5">
                <LFButton variant="secondary" disabled={busy} onClick={() => void submit()}>
                  <RotateCcw size={15} aria-hidden="true" />
                  {busy ? 'Resending…' : 'Resend the link'}
                </LFButton>
                <LFButton variant="ghost" className="underline underline-offset-2" onClick={() => { setSent(false); setError(null); }}>
                  Use a different email
                </LFButton>
              </div>
            </>
          ) : (
            <form onSubmit={(e) => void submit(e)} noValidate>
              <label htmlFor="lf-auth-email" className="text-body font-bold text-ink">
                Your email
              </label>
              <div className="mt-2 flex h-[52px] items-center gap-2.5 rounded-full bg-cream-2 px-4 focus-within:ring-[1.5px] focus-within:ring-rose">
                <Mail size={17} className="shrink-0 text-ink-3" aria-hidden="true" />
                <input
                  id="lf-auth-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  className="h-full min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-3 focus:outline-none"
                />
              </div>
              {error && (
                <p role="alert" className="mt-2.5 text-caption text-rose-deep">
                  {error}
                </p>
              )}
              <LFButton type="submit" className="mt-4" disabled={busy}>
                {busy ? 'Sending your link…' : 'Email me a magic link'}
              </LFButton>
              <p className="mt-3 text-center text-caption text-ink-3">One click in the email signs you in — nothing to remember.</p>
            </form>
          )}
        </Card>
      </motion.div>

      {BACKEND_ENABLED && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative mt-5 flex flex-col items-center gap-3">
          <button type="button" onClick={() => navigate('/')} className="min-h-[44px] text-label text-ink-2 underline underline-offset-2">
            Continue without an account
          </button>
          <div className="flex items-start gap-2.5 rounded-tile bg-cream-2/80 px-4 py-3">
            <FolderLock size={15} className="mt-[2px] shrink-0 text-ink-2" aria-hidden="true" />
            <p className="text-caption text-ink-2">
              Your photos stay on this device — always. Sync is opt-in, consent-gated, and revocable anytime in Profile.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
