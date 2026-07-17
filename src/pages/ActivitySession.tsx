/**
 * Activity Session — `/activity/:id/session` (activity.md State B).
 * Full-bleed immersive guided player: StepCue + ProgressRing with breathing
 * halo, phase timing from the activity's steps/duration (see
 * ./sessionPlan.ts), pause/resume, ±10s nudges, sound + haptic toggles,
 * PRO camera-coach teaser (simulated, clearly labeled "Preview"), and a
 * graceful exit sheet (no partial credit — sessions count when complete).
 *
 * Offline & backgrounding behavior (documented):
 *  - The player is fully offline: timeline, sounds (WebAudio oscillators)
 *    and illustrations are all local; no network is touched.
 *  - The clock is wall-clock anchored (performance.now deltas), and the tab
 *    AUTO-PAUSES on `visibilitychange` → hidden. Returning to the tab shows
 *    the paused state; nothing jumps and nothing is lost. Resume is one tap.
 *
 * Navigation contracts:
 *  - in:  state { origin?: string, queue?: string[], queueIndex?: number }
 *  - out: navigate(`/activity/:id/done`, { replace: true, state: { seconds,
 *         reps, continuous, stepCount, origin, queue, queueIndex } })
 *  - Safety/PRO guards redirect (replace) to `/activity/:id` — an excluded
 *    or locked activity can never be started, even by deep link.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, Minus, Pause, Play, Plus, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { CATEGORY_THEME, EASE_OUT_SOFT, EASE_SIGNATURE } from '@/lib/theme';
import { getActivity } from '@/data/activities';
import ProgressRing from '@/components/ProgressRing';
import Sheet from '@/components/Sheet';
import StepCue from '@/components/StepCue';
import { LFButton } from '@/components/ui';
import { FaceIllo } from '@/components/illos';
import { buildSessionPlan, phaseAt, phaseLabel, type SessionPlan } from '@/pages/activity/sessionPlan';
import { deepenedTint } from '@/pages/activity/copy';

const EASE = EASE_OUT_SOFT;

/* ── Gentle local sound engine (WebAudio — fully offline, no assets) ───── */

function createSounds() {
  let ctx: AudioContext | null = null;
  const ensure = (): AudioContext | null => {
    try {
      if (!ctx) ctx = new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  };
  const tone = (freq: number, dur: number, gain = 0.035, delay = 0) => {
    const c = ensure();
    if (!c) return;
    try {
      const t0 = c.currentTime + delay;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* audio is a nicety — never break the session for it */
    }
  };
  return {
    /** soft two-note chime at phase change */
    chime: () => {
      tone(660, 0.35);
      tone(880, 0.5, 0.028, 0.14);
    },
    /** very soft tick for the last 3 hold seconds */
    tick: () => tone(520, 0.07, 0.02),
    /** small major arpeggio at completion */
    success: () => {
      tone(523.25, 0.3, 0.04);
      tone(659.25, 0.32, 0.04, 0.14);
      tone(783.99, 0.55, 0.045, 0.28);
    },
  };
}

/** Simulated PRO camera-coach cue chips (rotate every 6s) — clearly a preview. */
const CAMERA_CUES = [
  'Center your face in the soft frame',
  'Soften your forehead — good',
  'Slow and even — lovely pace',
];

interface SessionRouteState {
  origin?: string;
  queue?: string[];
  queueIndex?: number;
}

export default function ActivitySession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { isActivityLocked, safetyEval, consents, pro } = useApp();

  const activity = id ? getActivity(id) : undefined;
  const routeState = (location.state as SessionRouteState | null) ?? {};
  const origin = routeState.origin ?? '/library';
  const queue = routeState.queue;
  const queueIndex = routeState.queueIndex ?? 0;

  const plan: SessionPlan | null = useMemo(() => (activity ? buildSessionPlan(activity) : null), [activity]);

  /* ── clock: wall-clock anchored, pause-aware ── */
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPausedState] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [exitOpen, setExitOpen] = useState(false);
  const clock = useRef({ start: 0, pausedAt: 0, pausedTotal: 0, offset: 0 });
  const finishedRef = useRef(false);
  const soundsRef = useRef<ReturnType<typeof createSounds> | null>(null);
  const sounds = () => (soundsRef.current ??= createSounds());

  useEffect(() => {
    clock.current = { start: performance.now(), pausedAt: 0, pausedTotal: 0, offset: 0 };
    finishedRef.current = false;
  }, [plan]);

  useEffect(() => {
    if (!plan || paused) return;
    const id = window.setInterval(() => {
      const c = clock.current;
      setElapsed((performance.now() - c.start - c.pausedTotal) / 1000 + c.offset);
    }, 200);
    return () => window.clearInterval(id);
  }, [plan, paused]);

  const setPaused = useCallback((p: boolean) => {
    setPausedState((prev) => {
      if (prev === p) return prev;
      const now = performance.now();
      if (p) clock.current.pausedAt = now;
      else clock.current.pausedTotal += now - clock.current.pausedAt;
      return p;
    });
  }, []);

  /* auto-pause when the tab backgrounds — the session waits kindly */
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [setPaused]);

  const pos = plan ? phaseAt(plan, elapsed) : null;
  const label = plan && pos ? phaseLabel(plan, pos) : '';

  /* completion → Done (replace so Back never returns to a finished player) */
  useEffect(() => {
    if (!plan || !activity || finishedRef.current) return;
    if (elapsed >= plan.totalSeconds) {
      finishedRef.current = true;
      if (soundOn) sounds().success();
      try {
        navigator.vibrate?.([18, 40, 18]);
      } catch {
        /* haptics optional */
      }
      navigate(`/activity/${activity.activityId}/done`, {
        replace: true,
        state: {
          seconds: Math.round(plan.totalSeconds),
          reps: plan.reps,
          continuous: plan.continuous,
          stepCount: plan.stepCount,
          origin,
          queue,
          queueIndex,
        } satisfies SessionRouteState & { seconds: number; reps: number; continuous: boolean; stepCount: number },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate/queue are stable for this flow
  }, [elapsed, plan, activity, navigate, origin, soundOn]);

  /* phase change: chime + light haptic tick */
  const phaseIndex = pos?.phaseIndex ?? -1;
  useEffect(() => {
    if (phaseIndex <= 0) return;
    if (soundOn) sounds().chime();
    try {
      navigator.vibrate?.(8);
    } catch {
      /* haptics optional */
    }
     
  }, [phaseIndex, soundOn]);

  /* 3 gentle ticks in the last 3s of a Hold */
  const countdown = pos?.countdown ?? 0;
  const phaseKind = pos?.phase.kind;
  useEffect(() => {
    if (phaseKind === 'work' && countdown <= 3 && countdown >= 1 && !paused && soundOn) sounds().tick();
     
  }, [countdown, phaseKind, paused, soundOn]);

  /* ±10s nudges shift the timeline (clamped, pause-aware) */
  const nudge = (delta: number) => {
    if (!plan) return;
    const c = clock.current;
    const now = paused ? c.pausedAt : performance.now();
    const current = (now - c.start - c.pausedTotal) / 1000 + c.offset;
    const next = Math.min(Math.max(current + delta, 0.2), plan.totalSeconds - 0.5);
    c.offset += next - current;
    setElapsed(next);
  };

  /* ── guards (after every hook) ── */
  if (!activity || !plan || !pos) {
    return <Navigate to="/library" replace />;
  }
  const excluded = safetyEval.excludedActivityIds.includes(activity.activityId);
  if (excluded || isActivityLocked(activity.activityId)) {
    return <Navigate to={`/activity/${activity.activityId}`} replace />;
  }

  const theme = CATEGORY_THEME[activity.category];
  const deepTint = deepenedTint(theme.tint, theme.deep);
  const nextStep = activity.steps[pos.stepIndex + 1];
  const inQueue = Boolean(queue && queue.length > 1);

  return (
    <motion.div
      initial={{ backgroundColor: theme.tint }}
      animate={{ backgroundColor: deepTint }}
      transition={{ duration: 0.7, ease: EASE_SIGNATURE }}
      className="relative min-h-full flex flex-col overflow-hidden"
    >
      {/* slow radial bloom breathing behind the ring */}
      {!reduceMotion && (
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none"
          style={{ width: 420, height: 420, backgroundColor: theme.hue, opacity: 0.35 }}
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          aria-hidden="true"
        />
      )}

      {/* ── B1 · Chrome ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 px-5 pt-4 flex items-center justify-between gap-3"
      >
        <button
          type="button"
          onClick={() => setExitOpen(true)}
          aria-label="End session"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur-[8px] text-ink"
        >
          <X size={19} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <p className="text-label text-center min-w-0 truncate" style={{ color: theme.deep }}>
          {inQueue ? `${queueIndex + 1} of ${queue!.length} · ${activity.title}` : activity.title}
        </p>
        <button
          type="button"
          onClick={() => setSoundOn((s) => !s)}
          aria-label={soundOn ? 'Mute session sounds' : 'Unmute session sounds'}
          aria-pressed={soundOn}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur-[8px] text-ink"
        >
          {soundOn ? <Volume2 size={18} strokeWidth={1.75} aria-hidden="true" /> : <VolumeX size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </motion.div>

      {/* ── B2 · Step cue ── */}
      <StepCue
        className="relative z-10 px-5 mt-3"
        step={activity.steps[pos.stepIndex]}
        stepIndex={pos.stepIndex}
        nextStep={nextStep}
        breathingCue={activity.breathingCue}
        deepColor={theme.deep}
      />
      {/* phase announcements for screen readers (design.md §12) */}
      <span className="sr-only" aria-live="polite">
        {label}
        {pos.phase.rep !== null && !plan.continuous ? ` — rep ${pos.phase.rep} of ${pos.phase.totalReps}` : ''}
      </span>

      {/* ── B3 · Progress ring ── */}
      <div className="relative z-10 flex-1 min-h-[300px] flex items-center justify-center py-4">
        <motion.div
          key={pos.phaseIndex}
          initial={reduceMotion ? undefined : { scale: 1.03 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className={cn('transition-opacity duration-300', paused && 'opacity-60')}
        >
          <ProgressRing value={pos.progress} size={260} color={theme.deep} breathing={!paused && !reduceMotion} animateFill={false}>
            <p className="text-eyebrow uppercase" style={{ color: theme.deep }}>
              {label}
            </p>
            <p className="font-display text-number-xl text-ink mt-1" aria-hidden="true">
              {pos.countdown}
            </p>
            <p className="text-caption text-ink-2 mt-1">
              {plan.continuous
                ? `${Math.floor((plan.totalSeconds - elapsed) / 60)}:${String(Math.max(0, Math.ceil((plan.totalSeconds - elapsed) % 60))).padStart(2, '0')} left`
                : pos.phase.rep !== null
                  ? `Rep ${pos.phase.rep} of ${pos.phase.totalReps}`
                  : pos.phase.kind === 'intro'
                    ? `${plan.reps} ${plan.reps === 1 ? 'rep' : 'reps'} ahead`
                    : 'all reps done'}
            </p>
          </ProgressRing>
        </motion.div>

        {/* Paused chip (glass pill, center-top) */}
        <AnimatePresence>
          {paused && (
            <motion.span
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="absolute top-2 inline-flex items-center rounded-full bg-white/70 backdrop-blur-[10px] px-4 py-1.5 text-label text-ink shadow-card"
            >
              Paused
            </motion.span>
          )}
        </AnimatePresence>

        {/* PRO camera-coach simulated self-view (Preview) */}
        {consents.cameraCoach && pro.active && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute end-4 top-2 w-[88px] rounded-[18px] overflow-hidden border border-white/70 shadow-card bg-card"
          >
            <div className="relative h-[104px]" style={{ backgroundColor: theme.hue }}>
              <div className="absolute inset-[10px] rounded-arch border-[1.5px] border-white/80" aria-hidden="true" />
              <div className="absolute inset-0 flex items-end justify-center" aria-hidden="true">
                <FaceIllo name={activity.media.illustration} className="w-[64px] h-[64px] opacity-90" />
              </div>
            </div>
            <p className="text-[9.5px] leading-[12px] font-bold text-center py-1 bg-violet-tint text-violet uppercase tracking-[0.08em]">
              Preview
            </p>
          </motion.div>
        )}
      </div>

      {/* ── B4 · Camera-coach strip (simulated teaser) ── */}
      <CameraCoachStrip deepColor={theme.deep} />

      {/* ── B5 · Controls ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: EASE }}
        className="relative z-10 px-5 pb-8 pt-2"
      >
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => nudge(-10)}
            aria-label="Back 10 seconds"
            className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink/15 text-ink bg-white/40"
          >
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold">
              <Minus size={11} strokeWidth={2.25} aria-hidden="true" />
              10s
            </span>
          </button>
          <motion.button
            type="button"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? 'Resume session' : 'Pause session'}
            animate={!paused && !reduceMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={!paused && !reduceMotion ? { duration: 1.9, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
            className="inline-flex size-16 items-center justify-center rounded-full text-white shadow-pop"
            style={{ backgroundColor: theme.deep }}
          >
            {paused ? <Play size={24} strokeWidth={1.75} className="ms-0.5" aria-hidden="true" /> : <Pause size={24} strokeWidth={1.75} aria-hidden="true" />}
          </motion.button>
          <button
            type="button"
            onClick={() => nudge(10)}
            aria-label="Skip ahead 10 seconds"
            className="inline-flex size-11 items-center justify-center rounded-full border-[1.5px] border-ink/15 text-ink bg-white/40"
          >
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold">
              <Plus size={11} strokeWidth={2.25} aria-hidden="true" />
              10s
            </span>
          </button>
        </div>
        <p className="text-caption text-ink-2 text-center mt-3">Eyes closed is fine — we'll count for you.</p>
      </motion.div>

      {/* ── Graceful exit sheet ── */}
      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} ariaLabel="End your session early?">
        <h3 className="font-display text-display-md text-ink mt-1">End your session early?</h3>
        <p className="text-body text-ink-2 mt-2">
          Sessions count when they complete — be kind to yourself and finish the minute.
        </p>
        <div className="mt-5 flex flex-col gap-1">
          <LFButton variant="tinted" tintColor={theme.deep} onClick={() => setExitOpen(false)}>
            Keep practicing
          </LFButton>
          <div className="flex justify-center">
            <LFButton
              variant="ghost"
              fullWidth={false}
              className="mt-1 underline underline-offset-4"
              onClick={() => navigate(origin, { replace: true })}
            >
              End session
            </LFButton>
          </div>
        </div>
      </Sheet>
    </motion.div>
  );
}

/* ── B4 implementation — consent-aware, never a surprise OS prompt ────── */

function CameraCoachStrip({ deepColor }: { deepColor: string }) {
  const { consents, pro } = useApp();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [infoOpen, setInfoOpen] = useState(false);
  const [cueIndex, setCueIndex] = useState(0);

  const simulated = consents.cameraCoach && pro.active;

  useEffect(() => {
    if (!simulated || reduceMotion) return;
    const t = window.setInterval(() => setCueIndex((i) => (i + 1) % CAMERA_CUES.length), 6000);
    return () => window.clearInterval(t);
  }, [simulated, reduceMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
      className="relative z-10 px-5"
    >
      {!consents.cameraCoach ? (
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="w-full min-h-[40px] rounded-full bg-white/45 backdrop-blur-[6px] px-4 flex items-center gap-2.5 text-start"
        >
          <Camera size={15} strokeWidth={1.75} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="text-caption text-ink-2 flex-1">Camera guidance is off — turn it on anytime in Profile.</span>
        </button>
      ) : !pro.active ? (
        <button
          type="button"
          onClick={() => navigate('/paywall')}
          className="w-full min-h-[40px] rounded-full bg-white/45 backdrop-blur-[6px] px-4 flex items-center gap-2.5 text-start"
        >
          <Camera size={15} strokeWidth={1.75} className="shrink-0 text-ink-2" aria-hidden="true" />
          <span className="text-caption text-ink-2 flex-1">Camera-guided form cues are a PRO preview — see how it feels.</span>
          <Sparkles size={14} strokeWidth={1.75} className="shrink-0 text-violet" aria-hidden="true" />
        </button>
      ) : (
        <div className="rounded-[16px] bg-white/45 backdrop-blur-[6px] px-4 py-2.5">
          <div className="flex items-center gap-2.5 min-h-[24px]">
            <Camera size={15} strokeWidth={1.75} className="shrink-0" style={{ color: deepColor }} aria-hidden="true" />
            <AnimatePresence mode="wait">
              <motion.span
                key={cueIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-caption text-ink flex-1"
              >
                {CAMERA_CUES[cueIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
          <p className="text-[10px] leading-[14px] text-ink-2 mt-1">
            Preview: guidance is simulated in this build; live analysis never uploads frames.
          </p>
        </div>
      )}

      {/* consent explainer — points to Profile, never triggers an OS prompt */}
      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} ariaLabel="About camera guidance">
        <div className="flex items-center gap-3 mt-1">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
            <Camera size={18} strokeWidth={1.75} />
          </span>
          <h3 className="font-display text-display-md text-ink">Camera guidance</h3>
        </div>
        <p className="text-body text-ink-2 mt-3">
          With your permission, camera guidance watches your <em>form</em> — centering, pace, relaxed forehead — never your
          appearance. In this preview build the cues are simulated, and live analysis would run on your device only:
          frames are never uploaded.
        </p>
        <p className="text-body text-ink-2 mt-2">
          It's always your call: the toggle lives in Profile, starts off, and you can change it anytime.
        </p>
        <div className="mt-5 flex flex-col gap-1">
          <LFButton
            variant="secondary"
            onClick={() => {
              setInfoOpen(false);
              navigate('/profile');
            }}
          >
            Open Profile privacy controls
          </LFButton>
          <div className="flex justify-center">
            <LFButton variant="ghost" fullWidth={false} className="mt-1" onClick={() => setInfoOpen(false)}>
              Not now
            </LFButton>
          </div>
        </div>
      </Sheet>
    </motion.div>
  );
}

/* exported for the Done page, which threads the same queue/origin state */
export type { SessionRouteState };
