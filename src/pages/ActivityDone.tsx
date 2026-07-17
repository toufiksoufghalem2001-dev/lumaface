/**
 * Activity Done — `/activity/:id/done` (activity.md State C).
 * Celebration on the category tint: petal confetti, sage check hero, honest
 * stats, ComfortPrompt wired to `logSession(activityId, comfort, seconds)`,
 * "what you just practiced" honest summary, badge reveal, PRO upsell (free
 * users), next-activity suggestion, and Done / Practice-again CTAs.
 *
 * Navigation contract (in): location.state {
 *   seconds?: number      — practiced seconds (default: record duration)
 *   reps?: number         — reps held (default: derived from session plan)
 *   continuous?: boolean  — skincare slot (default: category === 'skincare')
 *   stepCount?: number    — steps cued (default: record steps length)
 *   origin?: string       — return path for "Done" (default: '/')
 *   queue?: string[]; queueIndex?: number — ritual-queue threading
 * }
 *
 * Data honesty note: `logSession` is called from ComfortPrompt's onComplete.
 * If the member leaves without answering comfort, the Done CTA logs a neutral
 * completion (comfort 1) so the session still counts — sessions count when
 * they complete. The store derives irritationFlag from comfortLevel === 3;
 * the Yes/No follow-up itself is display-side (see LIMITATIONS in the
 * milestone report).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { animate, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Flame, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { CATEGORY_THEME, COLORS, EASE_OUT_SOFT, EASE_SIGNATURE, formatMinutes } from '@/lib/theme';
import { ACTIVITY_BY_ID, RELAXATION_POOL_IDS, getActivity } from '@/data/activities';
import { BADGES } from '@/data/content';
import ActivityRow from '@/components/ActivityRow';
import BadgeCard from '@/components/BadgeCard';
import ComfortPrompt, { type ComfortResult } from '@/components/ComfortPrompt';
import PetalConfetti from '@/components/PetalConfetti';
import SafetyBox from '@/components/SafetyBox';
import { LFButton } from '@/components/ui';
import { MarkPetal } from '@/components/illos';
import { TIER_DONE_REMINDER, deepenedTint } from '@/pages/activity/copy';
import { buildSessionPlan } from '@/pages/activity/sessionPlan';
import { todayKey } from '@/lib/store';

const EASE = EASE_OUT_SOFT;

interface DoneRouteState {
  seconds?: number;
  reps?: number;
  continuous?: boolean;
  stepCount?: number;
  origin?: string;
  queue?: string[];
  queueIndex?: number;
}

/** Number counts up over 0.8s on first view (design.md §6.9; instant on reduced motion). */
function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (reduce) return; // reduced motion renders the final value directly
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{reduce ? value : display}</>;
}

export default function ActivityDone() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { logSession, todayDoneIds, progress, plan, currentDay, safetyEval, pro, isActivityLocked } = useApp();

  const activity = id ? getActivity(id) : undefined;
  const state = (location.state as DoneRouteState | null) ?? {};

  const derived = useMemo(() => (activity ? buildSessionPlan(activity) : null), [activity]);
  const seconds = state.seconds ?? activity?.durationSeconds ?? 0;
  const reps = state.reps ?? derived?.reps ?? 1;
  const continuous = state.continuous ?? activity?.category === 'skincare';
  const stepCount = state.stepCount ?? activity?.steps.length ?? 1;
  const origin = state.origin ?? '/';
  const queue = state.queue;
  const queueIndex = state.queueIndex ?? 0;

  /* snapshot BEFORE this session is logged (mount-time lazy state init) —
     these must not flip when logSession re-renders the page */
  const [snap] = useState(() => ({
    alreadyCounted: activity ? todayDoneIds.includes(activity.activityId) : false,
    firstToday: progress.lastDone !== todayKey(),
    streak: progress.streak,
    badges: progress.badges,
  }));
  const { alreadyCounted: alreadyCountedToday, firstToday: firstSessionToday, streak: streakAtMount } = snap;
  const loggedRef = useRef(false);

  const [comfort, setComfort] = useState<ComfortResult | null>(null);
  const [confettiDone, setConfettiDone] = useState(false);

  const log = (level: 1 | 2 | 3) => {
    if (!activity || loggedRef.current) return;
    loggedRef.current = true;
    logSession(activity.activityId, level, seconds);
  };

  const onComfort = (result: ComfortResult) => {
    setComfort(result);
    log(result.comfortLevel);
  };

  /* badges earned by THIS session (diff vs the mount snapshot) */
  const newBadgeIds = Object.keys(progress.badges).filter((b) => !(b in snap.badges));
  const earnedBadges = BADGES.filter((b) => newBadgeIds.includes(b.id));

  /* next-activity suggestion: queue next → today's plan → relaxation pool */
  const suggestionId = useMemo(() => {
    if (!activity) return undefined;
    if (queue && queueIndex + 1 < queue.length) return queue[queueIndex + 1];
    if (plan) {
      const items = plan.days.find((d) => d.day === currentDay)?.items.map((i) => i.activityId) ?? [];
      const next = items.find(
        (pid) =>
          pid !== activity.activityId &&
          !todayDoneIds.includes(pid) &&
          !safetyEval.excludedActivityIds.includes(pid),
      );
      if (next) return next;
    }
    return RELAXATION_POOL_IDS.find((r) => r !== activity.activityId && !safetyEval.excludedActivityIds.includes(r));
     
  }, [activity, plan, currentDay, queue, queueIndex, safetyEval, todayDoneIds]);

  if (!activity) {
    return (
      <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center min-h-[70dvh]">
        <MarkPetal className="size-10 opacity-60" />
        <h1 className="font-display text-display-md text-ink mt-5">This activity wandered off</h1>
        <LFButton variant="secondary" className="mt-6" onClick={() => navigate('/library')}>
          Browse the library
        </LFButton>
      </div>
    );
  }

  const theme = CATEGORY_THEME[activity.category];
  const suggestion = suggestionId ? ACTIVITY_BY_ID.get(suggestionId) : undefined;
  const suggestionLocked = suggestion ? isActivityLocked(suggestion.activityId) : false;
  const minutesOrSeconds = seconds >= 90 ? Math.round(seconds / 60) : seconds;

  return (
    <motion.div
      initial={{ backgroundColor: deepenedTint(theme.tint, theme.deep) }}
      animate={{ backgroundColor: theme.tint }}
      transition={{ duration: 0.7, ease: EASE_SIGNATURE }}
      className="relative min-h-full overflow-hidden"
    >
      {/* C1 — petal confetti (one-shot, behind content) */}
      {!confettiDone && (
        <PetalConfetti active count={26} accentColor={theme.hue} onDone={() => setConfettiDone(true)} />
      )}

      <div className="relative z-10 px-5 pt-14 pb-10">
        {/* ── C2 · Completion hero ── */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <motion.span
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${COLORS.sage}` }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
              aria-hidden="true"
            />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.15 }}
              className="inline-flex size-[72px] items-center justify-center rounded-full text-white"
              style={{ backgroundColor: COLORS.sage }}
              aria-hidden="true"
            >
              <Check size={34} strokeWidth={2.5} />
            </motion.span>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
            className="font-display text-display-lg text-ink mt-5"
          >
            Gently done.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
            className="font-display italic text-quote text-ink-2 mt-1.5"
          >
            You showed up for yourself — that's the whole practice.
          </motion.p>
        </div>

        {/* ── C3 · Stats row ── */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            {
              key: 'streak',
              value: firstSessionToday ? 1 : Math.max(1, streakAtMount),
              prefix: firstSessionToday ? '+' : '',
              caption: firstSessionToday ? 'day streak' : 'day streak · held',
              flame: true,
            },
            { key: 'time', value: minutesOrSeconds, prefix: '', caption: seconds >= 90 ? 'minutes' : 'seconds', flame: false },
            {
              key: 'reps',
              value: continuous ? stepCount : reps,
              prefix: '',
              caption: continuous ? (stepCount === 1 ? 'step' : 'steps') : reps === 1 ? 'rep held' : 'reps held',
              flame: false,
            },
          ].map((tile, i) => (
            <motion.div
              key={tile.key}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.08, ease: EASE }}
              className="bg-card rounded-[18px] shadow-card px-2 py-3.5 flex flex-col items-center"
            >
              <span className="font-display text-number-lg text-ink inline-flex items-center gap-1">
                {tile.flame && (
                  <motion.span
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.35, 1] }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="inline-flex"
                    aria-hidden="true"
                  >
                    <Flame size={20} className="text-flame" fill="currentColor" strokeWidth={1.75} />
                  </motion.span>
                )}
                {tile.prefix}
                <CountUp value={tile.value} />
              </span>
              <span className="text-caption text-ink-2 mt-0.5 text-center">{tile.caption}</span>
            </motion.div>
          ))}
        </div>
        {alreadyCountedToday && (
          <p className="text-caption text-ink-2 text-center mt-2.5">Already counted today — still lovely.</p>
        )}

        {/* ── C4 · Comfort prompt ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
          className="mt-5"
        >
          <ComfortPrompt deepColor={theme.deep} tintColor={theme.tint} onComplete={onComfort} />
          {comfort && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="text-caption text-ink-2 mt-2.5 text-center">
              {comfort.comfortLevel === 1 && 'Lovely. See you tomorrow.'}
              {comfort.comfortLevel === 2 && "Noted — tomorrow's dose gets gentler."}
              {comfort.comfortLevel === 3 && !comfort.irritationFlag && "Thank you for saying — we'll keep things extra gentle."}
            </motion.p>
          )}
          {comfort?.comfortLevel === 3 && comfort.irritationFlag && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-3">
              <SafetyBox
                title="Your skin is asking for a pause"
                items={[
                  "We've noted it for your next check-in, which moves this week toward Barrier Reset and pauses the likely triggers. If it persists, please see a professional.",
                ]}
              />
              <button
                type="button"
                onClick={() => navigate('/activity/barrier-reset', { state: { origin: `/activity/${activity.activityId}/done` } })}
                className="mt-2.5 w-full flex items-center gap-2.5 rounded-tile bg-card px-3.5 py-3 min-h-[44px] text-start shadow-card"
              >
                <span className="text-[13px] font-medium text-ink flex-1">Open Barrier Reset — the calm-down protocol</span>
                <ChevronRight size={15} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ── C5 · What you just practiced ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: EASE }}
          className="mt-5 rounded-[20px] p-[18px] border border-white/60"
          style={{ backgroundColor: deepenedTint(theme.tint, theme.deep) }}
        >
          <p className="text-eyebrow uppercase" style={{ color: theme.deep }}>
            The honest summary
          </p>
          <p className="text-body font-bold text-ink mt-2">{activity.expectedOutcome}</p>
          <p className="text-caption text-ink-2 mt-2">{TIER_DONE_REMINDER[activity.evidenceTier]}</p>
        </motion.div>

        {/* ── Badge earned (above upsell, gold shimmer) ── */}
        {earnedBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.85, ease: EASE }}
            className="mt-5 bg-card rounded-card shadow-card p-[18px]"
          >
            <p className="text-eyebrow uppercase" style={{ color: COLORS.gold }}>
              Badge earned
            </p>
            <div className="mt-3 flex gap-3">
              {earnedBadges.map((b) => (
                <BadgeCard key={b.id} badge={b} earnedAt={progress.badges[b.id]} shimmer onClick={() => navigate('/progress')} />
              ))}
            </div>
            <p className="text-caption text-ink-2 mt-2.5">Badges celebrate habits and care — never appearance.</p>
          </motion.div>
        )}

        {/* ── C6 · Upsell (free users only) ── */}
        {!pro.active && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9, ease: EASE }}
            className="mt-5 bg-card rounded-card shadow-card p-[18px] border-t-[3px] border-violet"
          >
            <p className="text-eyebrow uppercase text-violet">Keep the ritual going</p>
            <h2 className="font-display text-title text-ink mt-1.5">Your plan has more for you</h2>
            <p className="text-caption text-ink-2 mt-1.5">
              PRO unlocks your full 28-day plan, the whole library, camera-guided coaching and your progress diary.
            </p>
            <LFButton className="mt-4" onClick={() => navigate('/paywall')}>
              <Sparkles size={15} strokeWidth={1.75} aria-hidden="true" />
              See PRO plans
            </LFButton>
          </motion.div>
        )}

        {/* ── Next-activity suggestion ── */}
        {suggestion && !(queue && queueIndex + 1 < queue.length) && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1, ease: EASE }}
            className="mt-5 bg-card rounded-card shadow-card p-[18px]"
          >
            <p className="text-eyebrow uppercase text-ink-2">Keep the glow going</p>
            <div className="mt-2.5">
              <ActivityRow
                activity={suggestion}
                locked={suggestionLocked}
                onClick={() => {
                  if (suggestionLocked) navigate('/paywall');
                  else navigate(`/activity/${suggestion.activityId}`, { state: { origin: `/activity/${activity.activityId}/done` } });
                }}
              />
            </div>
          </motion.div>
        )}

        {/* ── C7 · CTAs ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.05, ease: EASE }}
          className="mt-6"
        >
          {queue && queueIndex + 1 < queue.length && suggestion ? (
            <LFButton
              variant="tinted"
              tintColor={theme.deep}
              onClick={() => {
                log(1); // sessions count when they complete — even without a comfort answer
                navigate(`/activity/${suggestion.activityId}/session`, {
                  replace: true,
                  state: { origin, queue, queueIndex: queueIndex + 1 },
                });
              }}
            >
              Next: {suggestion.title} · {formatMinutes(suggestion.durationSeconds)}
            </LFButton>
          ) : (
            <>
              <LFButton
                variant="tinted"
                tintColor={theme.deep}
                onClick={() => {
                  log(1); // sessions count when they complete — even without a comfort answer
                  navigate(origin);
                }}
              >
                Done
              </LFButton>
              <div className="flex justify-center">
                <LFButton
                  variant="ghost"
                  fullWidth={false}
                  className="mt-2 underline underline-offset-4"
                  onClick={() => {
                    log(1);
                    navigate(`/activity/${activity.activityId}/session`, { replace: true, state: { origin } });
                  }}
                >
                  Practice again
                </LFButton>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* exported so the session player and future queue hosts share the contract */
export type { DoneRouteState };
