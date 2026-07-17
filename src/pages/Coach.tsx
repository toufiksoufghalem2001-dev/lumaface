/**
 * Coach — `/coach` (design/coach.md). The bounded AI coach, M1 "Preview":
 * every answer is simulated locally by the approved-library retrieval module
 * (./coach/engine.ts) and rendered through the exact §8.5 structured contract
 * via CoachBubble. Safety classifier intercepts BEFORE normal coaching:
 * urgent symptoms → professional-care interrupt card + coaching paused;
 * diagnosis / attractiveness / other people / body-harm → graceful refusal.
 * Free tier: 3 questions/day (counted from today's thread messages); PRO is
 * unlimited. Threads persist locally via saveCoachThread.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, FlaskConical, Info, LifeBuoy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp, todayKey, type CoachThread, type CoachThreadMessage } from '@/lib/store';
import { EASE_OUT_SOFT } from '@/lib/theme';
import { CoachBubble, CoachTyping, UserBubble } from '@/components/CoachBubble';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import { LFButton } from '@/components/ui';
import { CoachMark } from '@/components/illos';
import {
  answerQuestion,
  classifySafety,
  refusalText,
  safetyRedirectAnswer,
  urgentCopy,
  FREE_DAILY_QUESTIONS,
  SUGGESTED_PROMPTS,
} from '@/pages/coach/engine';

const EASE = EASE_OUT_SOFT;

function messageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Module-scope factories (event-time helpers — impure by design). */
function createMessage(role: 'user' | 'coach', text: string, answer?: CoachThreadMessage['answer']): CoachThreadMessage {
  return { id: messageId(), role, text, answer, createdAt: new Date().toISOString() };
}

function createThread(): CoachThread {
  return { id: `coach_${todayKey()}_${Date.now().toString(36)}`, createdAt: new Date().toISOString(), messages: [] };
}

function isToday(iso: string): boolean {
  return iso.slice(0, 10) === todayKey();
}

/* ── Safety interrupt card (replaces normal bubble flow) ───────────────── */

function SafetyInterruptCard({ body }: { body: string }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-[20px] border-[1.5px] border-ink/30 bg-card p-[18px]"
      role="alert"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-petal bg-cream-2 text-ink" aria-hidden="true">
          <LifeBuoy size={22} strokeWidth={1.75} />
        </span>
        <p className="font-display text-title text-ink">Please see a professional now.</p>
      </div>
      <p className="text-body text-ink mt-3">{body}</p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.35 }}>
        <LFButton
          variant="tinted"
          tintColor="#2A160D"
          className="mt-4"
          onClick={() => navigate('/help')}
        >
          Open professional-care guidance
        </LFButton>
        <p className="text-caption text-ink-2 mt-3">
          I've paused coaching for this conversation. Everything else in LumaFace stays here when you're back.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */

export default function Coach() {
  const { profile, pro, coachThreads, saveCoachThread, setProfile } = useApp();
  const navigate = useNavigate();

  /* Today's thread = the most recent thread started today (if any). */
  const [thread, setThread] = useState<CoachThread | null>(() => {
    const todays = coachThreads.filter((t) => isToday(t.createdAt));
    return todays.length > 0 ? todays[todays.length - 1] : null;
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [chipOffset, setChipOffset] = useState(0);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const toastTimer = useRef<number | null>(null);
  /* mirror of the latest thread for timer callbacks (avoids setState-in-updater) */
  const threadRef = useRef<CoachThread | null>(thread);
  useEffect(() => {
    threadRef.current = thread;
  }, [thread]);

  useEffect(() => () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  /* Free-tier meter: user questions asked today across ALL threads. */
  const questionsToday = useMemo(() => {
    const others = coachThreads
      .filter((t) => t.id !== thread?.id)
      .flatMap((t) => t.messages)
      .filter((m) => m.role === 'user' && isToday(m.createdAt)).length;
    const mine = thread?.messages.filter((m) => m.role === 'user' && isToday(m.createdAt)).length ?? 0;
    return others + mine;
  }, [coachThreads, thread]);

  const canAsk = pro.active || questionsToday < FREE_DAILY_QUESTIONS;
  const paused = thread?.messages.some((m) => m.answer?.intent === 'safety_redirect') ?? false;
  const messages = thread?.messages ?? [];

  /* Auto-scroll to the latest message (smooth 0.3s). */
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-lf-scroll]');
    root?.scrollTo?.({ top: root.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing]);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }

  function commit(next: CoachThread) {
    threadRef.current = next;
    setThread(next);
    saveCoachThread(next);
  }

  function send(raw: string) {
    const text = raw.trim();
    if (!text || typing || !canAsk || paused) return;
    setInput('');

    const base = thread ?? createThread();
    const withUser: CoachThread = { ...base, messages: [...base.messages, createMessage('user', text)] };

    const intercept = classifySafety(text);

    /* Safety never waits — no typing delay on an urgent redirect. */
    if (intercept?.kind === 'urgent') {
      const coachMsg = createMessage('coach', urgentCopy(intercept.variant).body, safetyRedirectAnswer(intercept.variant, intercept.code));
      commit({ ...withUser, messages: [...withUser.messages, coachMsg] });
      return;
    }

    /* Normal flow: 1.1s typing indicator, then the reply. */
    setTyping(true);
    commit(withUser);
    typingTimer.current = window.setTimeout(() => {
      setTyping(false);
      // non-urgent intercepts (urgent already returned above) → graceful refusal
      const coachMsg = intercept
        ? createMessage('coach', refusalText(intercept.kind))
        : (() => {
            const answer = answerQuestion(text, { goals: profile?.goals ?? [] });
            return createMessage('coach', answer.summary, answer);
          })();
      const cur = threadRef.current ?? withUser;
      commit({ ...cur, messages: [...cur.messages, coachMsg] });
      setChipOffset((n) => n + 1);
    }, 1100);
  }

  function startNewConversation() {
    commit(createThread());
  }

  function switchToThreeMinuteWeek() {
    setProfile({ routineTime: 3 });
    showToast('Done — smaller, kinder week ahead');
  }

  const chips = useMemo(() => {
    const n = SUGGESTED_PROMPTS.length;
    return Array.from({ length: n }, (_, i) => SUGGESTED_PROMPTS[(i + chipOffset) % n]);
  }, [chipOffset]);

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Section 1 — Header & honesty banner ── */}
      <header className="px-5 pt-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="flex items-center gap-3">
          <CoachMark className="size-9 shrink-0" />
          <h1 className="font-display text-display-lg text-ink flex-1">Coach</h1>
          <span className="text-caption text-ink-2">
            {pro.active ? 'Today · Unlimited' : `Today · ${Math.min(questionsToday, FREE_DAILY_QUESTIONS)} of ${FREE_DAILY_QUESTIONS} free questions`}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="mt-3 rounded-tile bg-violet-tint p-3.5 flex items-start gap-2.5"
        >
          <FlaskConical size={16} className="shrink-0 mt-[1px] text-violet" aria-hidden="true" />
          <p className="text-caption text-ink">
            <strong>Preview build</strong> — answers come from our approved library, not a live AI. The real coach will answer the same way: sources shown, uncertainty admitted, diagnosis never given.
          </p>
        </motion.div>
      </header>

      {/* Canonical wellness disclaimer (spec §12: appears on Coach) */}
      <div className="px-5 pt-3">
        <DisclaimerBlock />
      </div>

      {/* ── Section 2 — Conversation ── */}
      <section className="flex-1 px-5 pt-4 pb-5 flex flex-col gap-3" aria-live="polite">
        {messages.length === 0 && !typing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <CoachMark className="size-[72px]" />
            <p className="font-display italic text-quote text-ink mt-5 max-w-[26ch]">
              Ask me about routines, ingredients, evidence, or how to keep going.
            </p>
            <p className="text-caption text-ink-2 mt-2.5 max-w-[30ch]">
              I'll tell you what I know, what I don't, and where it comes from.
            </p>
          </div>
        ) : (
          <>
            <p className="text-caption text-ink-3 text-center" aria-hidden="true">
              Today
            </p>
            {messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} text={m.text} />
              ) : m.answer?.intent === 'safety_redirect' ? (
                <SafetyInterruptCard key={m.id} body={m.answer.summary} />
              ) : (
                <div key={m.id}>
                  <CoachBubble text={m.text} answer={m.answer} onActivityPress={(id) => navigate(`/activity/${id}`)} />
                  {m.answer?.intent === 'routine_adjustment' && profile?.routineTime !== 3 && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.25, ease: EASE }}
                      onClick={switchToThreeMinuteWeek}
                      className="mt-2 ms-8 inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-rose px-4 text-label text-rose"
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      Switch to 3-minute week
                    </motion.button>
                  )}
                </div>
              ),
            )}
            {typing && <CoachTyping />}
          </>
        )}
        <div ref={scrollAnchorRef} />
      </section>

      {/* ── Section 3 — Composer (sticky above tab bar) ── */}
      <div className="sticky bottom-0 bg-cream px-5 pb-4 pt-2">
        {/* Standing disclaimer row — always visible above the input */}
        <div className="flex items-start gap-2 pb-2">
          <Info size={13} className="shrink-0 mt-[2px] text-ink-2" aria-hidden="true" />
          <p className="text-caption text-ink-2">
            I'm a wellness coach, not a clinician. I can't diagnose, and for anything urgent I'll always point you to a professional.
          </p>
        </div>

        {/* Suggested prompts (snap-scroll carousel) */}
        {!paused && canAsk && (
          <div className="no-scrollbar -mx-5 mb-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5" aria-label="Suggested questions">
            {chips.map((prompt, i) => (
              <motion.button
                key={prompt}
                type="button"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.04, ease: EASE }}
                onClick={() => send(prompt)}
                className="h-[34px] shrink-0 snap-start rounded-full bg-cream-2 px-4 text-[13px] font-medium text-ink-2"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-2 rounded-full bg-ink px-4 py-2 text-center text-caption text-cream"
              role="status"
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>

        {paused ? (
          /* Coaching paused after a safety redirect */
          <div className="rounded-[20px] border border-hairline bg-card p-4 text-center">
            <p className="text-body text-ink-2">Coaching is paused for this conversation.</p>
            <div className="mt-3 flex flex-col gap-1.5">
              <LFButton onClick={() => navigate('/help')} variant="tinted" tintColor="#2A160D">
                Open professional-care guidance
              </LFButton>
              <LFButton variant="ghost" onClick={startNewConversation} className="underline underline-offset-2">
                Start a new conversation
              </LFButton>
            </div>
          </div>
        ) : !canAsk ? (
          /* Free-tier meter exhaustion */
          <div className="rounded-[20px] border border-hairline bg-card p-4 text-center">
            <p className="text-body text-ink">That's today's free coaching — PRO keeps the conversation open.</p>
            <div className="mt-3 flex flex-col gap-1.5">
              <LFButton onClick={() => navigate('/paywall')}>See PRO</LFButton>
              <LFButton variant="ghost" onClick={() => showToast('See you tomorrow 🌸')}>
                Come back tomorrow
              </LFButton>
            </div>
          </div>
        ) : (
          <form
            className="flex items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="coach-input" className="sr-only">
              Ask the coach a question
            </label>
            <input
              id="coach-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about care, evidence, routines…"
              autoComplete="off"
              className="h-[44px] min-w-0 flex-1 rounded-full bg-cream-2 px-4 text-body text-ink placeholder:text-ink-3 focus:outline-none focus:ring-[1.5px] focus:ring-rose"
            />
            <motion.button
              type="submit"
              aria-label="Send question"
              disabled={!input.trim() || typing}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'inline-flex size-[48px] shrink-0 items-center justify-center rounded-full text-white',
                input.trim() && !typing ? 'bg-rose shadow-glow-rose' : 'bg-ink-3',
              )}
            >
              <ArrowUp size={20} strokeWidth={2} aria-hidden="true" />
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
}
