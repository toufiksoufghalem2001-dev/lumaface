/**
 * AuthCallback — `/auth/callback` (M2). Magic-link landing route.
 * supabase-js is created with `detectSessionInUrl: true`, so simply creating
 * the client here exchanges the tokens in the URL hash for a session and
 * fires onAuthStateChange(SIGNED_IN) — we then route home. Link errors
 * (expired, denied) surface a calm retry path back to /auth.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { BACKEND_ENABLED } from '@/lib/config';
import { getSession, getSupabase, onAuthStateChange } from '@/lib/supabase';
import { EASE_OUT_SOFT } from '@/lib/theme';

const EASE = EASE_OUT_SOFT;

/** Parse `#error=…&error_description=…` from a magic-link error redirect. */
function urlAuthError(): string | null {
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const desc = params.get('error_description');
    return desc ? desc.replace(/\+/g, ' ') : null;
  } catch {
    return null;
  }
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(() => urlAuthError());
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!BACKEND_ENABLED) {
      navigate('/auth', { replace: true });
      return;
    }
    /* Creating the client here is what consumes the URL-hash tokens. */
    getSupabase();

    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        navigate('/', { replace: true });
      }
    };

    const unsubscribe = onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) finish();
    });

    /* The session may already be restored by the time we subscribe. */
    void getSession().then((session) => {
      if (session) finish();
    });

    const slowTimer = window.setTimeout(() => setSlow(true), 6000);
    const failTimer = window.setTimeout(() => {
      if (!done) setError((prev) => prev ?? 'This link could not be verified — it may have expired.');
    }, 12000);

    return () => {
      unsubscribe();
      window.clearTimeout(slowTimer);
      window.clearTimeout(failTimer);
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute -top-20 -right-24 size-72 rounded-full bg-rose-tint opacity-70 blur-3xl" />
        <span className="absolute bottom-16 -left-28 size-80 rounded-full bg-[#F7F0E2] opacity-80 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="relative">
        <span className="font-display italic font-semibold text-[26px] text-ink">LumaFace</span>
        {error ? (
          <>
            <h1 className="font-display text-display-md text-ink mt-4">That link didn't work</h1>
            <p className="text-body text-ink-2 mt-3 max-w-[300px]">{error} Send yourself a fresh one — it only takes a moment.</p>
            <Link to="/auth" className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-full bg-rose px-8 text-label font-bold text-white shadow-glow-rose">
              Back to sign-in
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-display-md text-ink mt-4">Signing you in…</h1>
            <div className="mt-5 flex justify-center gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="size-2 rounded-full bg-rose"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            {slow && <p className="text-caption text-ink-2 mt-4 max-w-[280px]">Still checking your link — a slow connection can add a few seconds.</p>}
          </>
        )}
      </motion.div>
    </div>
  );
}
