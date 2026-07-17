/**
 * Home (Today) — `/` (design/home.md).
 * Greeting → streak ring → duration-aware ritual stack → check-in prompt →
 * tip ticker → program teaser → coach entry → badges → quote → disclaimer.
 * No-plan state renders a warm "build your ritual" CTA with the free basics.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { CATEGORY_THEME, COLORS, EASE_OUT_SOFT, RESERVED_TINTS, SPRING_CHECK } from '@/lib/theme';
import { ACTIVITY_BY_ID, SKINCARE_BASICS_IDS, RELAXATION_POOL_IDS, ACTIVITIES } from '@/data/activities';
import { BADGES, QUOTES } from '@/data/content';
import { WEEKS, weekOfDay, type WeekDef } from '@/data/program';
import { planDayMomentCount } from '@/lib/plan';
import ActivityRow from '@/components/ActivityRow';
import BadgeCard from '@/components/BadgeCard';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import ProgressRing from '@/components/ProgressRing';
import SectionHeader from '@/components/SectionHeader';
import Sheet from '@/components/Sheet';
import TipTicker from '@/components/TipTicker';
import { Card, LFButton } from '@/components/ui';
import { CoachMark, FaceIllo, Petal } from '@/components/illos';

const EASE = EASE_OUT_SOFT;

const COACH_PROMPTS = ['Is my moisturizer enough in winter?', 'Why sunscreen every day?', 'My skin stung after a new serum'];

const AM_BASIC_SET = new Set<string>(SKINCARE_BASICS_IDS.slice(0, 3));

/* ── Section 2 — Greeting ──────────────────────────────────────────────── */

function Greeting() {
  const { profile, plan, todayDoneIds, currentDay } = useApp();
  const navigate = useNavigate();
  const now = new Date();
  const hour = now.getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const name = profile?.name?.trim();
  const eyebrow = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`.toUpperCase();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const poetic = QUOTES.greetingPool[dayOfYear % QUOTES.greetingPool.length];

  const total = plan ? planDayMomentCount(plan, currentDay) : 0;
  const done = todayDoneIds.length;
  const pct = total > 0 ? Math.min(done / total, 1) : 0;

  return (
    <section className="px-5 pt-4">
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05, ease: EASE }} className="text-eyebrow uppercase text-ink-2">
        {eyebrow}
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.12, ease: EASE }} className="font-display text-display-lg text-ink mt-1.5">
        {name ? `Good ${tod}, ${name}.` : `Good ${tod}.`}
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.2, ease: EASE }} className="font-display italic text-quote text-ink-2 mt-1.5">
        {poetic}
      </motion.p>

      {plan && (
        <motion.button
          type="button"
          onClick={() => navigate('/program')}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
          className="mt-4 w-full bg-card rounded-[20px] shadow-card p-4 flex items-center gap-4 text-start"
          aria-label={`Today's care — ${done} of ${total} moments complete. Open program.`}
        >
          <ProgressRing value={pct} size={64} color={COLORS.rose}>
            <span className="font-display font-semibold text-[15px] text-ink">{Math.round(pct * 100)}%</span>
          </ProgressRing>
          <span className="min-w-0">
            <span className="block text-body font-bold text-ink">Today's care</span>
            <span className="block text-caption text-ink-2 mt-0.5">
              {done} of {total} moments complete
            </span>
            <span className="block text-caption text-ink-3 mt-0.5">Habits, not beauty — we track showing up.</span>
          </span>
        </motion.button>
      )}
    </section>
  );
}

/* ── Safety-skipped slim banner (home.md content notes) ────────────────── */

function SafetyBanner() {
  const { safety } = useApp();
  if (safety?.reviewStatus !== 'skipped') return null;
  return (
    <div className="px-5 mt-3">
      <Link to="/onboarding?step=2" className="flex items-center gap-2.5 rounded-tile bg-cream-2 px-3.5 py-3 min-h-[44px]">
        <ClipboardCheck size={16} className="shrink-0 text-ink-2" aria-hidden="true" />
        <span className="text-caption text-ink-2 flex-1">Answer 7 quick safety questions to complete your plan</span>
        <ChevronRight size={15} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ── Section 3 — Today's Ritual (hero card) ────────────────────────────── */

function RitualCard() {
  const { plan, currentDay, todayDoneIds, toggleTodayItem, isActivityLocked, pro, safetyEval } = useApp();
  const navigate = useNavigate();
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapOverride, setSwapOverride] = useState<Record<string, string>>({});

  const day = plan?.days.find((d) => d.day === currentDay);
  const items = useMemo(() => {
    if (!day) return [];
    return day.items.map((i) => swapOverride[i.activityId] ?? i.activityId);
  }, [day, swapOverride]);

  if (!plan || !day) return null;

  const amBasics = items.filter((id) => AM_BASIC_SET.has(id));
  const guided = items.filter((id) => !AM_BASIC_SET.has(id));
  const allDone = items.length > 0 && items.every((id) => todayDoneIds.includes(id));
  const firstOpen = guided.find((id) => !todayDoneIds.includes(id)) ?? guided[0] ?? items[0];
  const lockedBeyondStarter = !pro.active && currentDay > 3;

  /* swap alternatives: same-category or relaxation pool, safety-filtered */
  const swapTarget = guided.find((id) => !ACTIVITY_BY_ID.get(id)?.free) ?? guided[0];
  const targetActivity = swapTarget ? ACTIVITY_BY_ID.get(swapTarget) : undefined;
  const alternatives = targetActivity
    ? ACTIVITIES.filter(
        (a) =>
          a.activityId !== targetActivity.activityId &&
          (a.category === targetActivity.category || (RELAXATION_POOL_IDS as readonly string[]).includes(a.activityId)) &&
          !safetyEval.excludedActivityIds.includes(a.activityId),
      ).slice(0, 5)
    : [];

  return (
    <section className="px-5 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
        className="bg-card rounded-card shadow-pop p-5"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-eyebrow uppercase text-ink-2">Today's ritual · Day {currentDay}</p>
          <span className="rounded-full bg-cream-2 px-3 py-1 text-label text-ink">
            {day.estimatedMinutes} min · {items.length} moments
          </span>
        </div>

        {allDone ? (
          /* Done state */
          <div className="mt-5 flex flex-col items-center text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.sage + '22', color: COLORS.sageDeep }} aria-hidden="true">
              <Check size={26} strokeWidth={2.25} />
            </span>
            <p className="font-display text-title text-ink mt-3">Today's ritual is complete — see you tomorrow</p>
            <p className="text-caption text-ink-2 mt-1">Streaks pause, they don't judge. Rest is part of care.</p>
            <LFButton variant="secondary" className="mt-4" onClick={() => navigate('/library')}>
              Browse a bonus activity
            </LFButton>
          </div>
        ) : (
          <>
            {/* AM skincare mini-stack */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.3 }} className="mt-5 flex items-center justify-between">
              <span className="text-caption text-ink-2 font-bold uppercase tracking-[0.1em]">Morning basics</span>
              <Link to="/routine" className="text-caption text-ink-2 underline underline-offset-2">
                edit routine
              </Link>
            </motion.p>
            <div className="mt-2 flex flex-col gap-1">
              {amBasics.map((id, i) => {
                const a = ACTIVITY_BY_ID.get(id);
                if (!a) return null;
                const done = todayDoneIds.includes(id);
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.35 + i * 0.07, ease: EASE }}
                    className="flex items-center gap-3 min-h-[48px]"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`Mark ${a.title} done`}
                      onClick={() => toggleTodayItem(id)}
                      className={cn(
                        'size-6 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors duration-250',
                        done ? 'border-transparent' : 'border-ink-3',
                      )}
                      style={done ? { backgroundColor: COLORS.sage } : undefined}
                    >
                      {done && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_CHECK}>
                          <Check size={14} strokeWidth={3} className="text-white" />
                        </motion.span>
                      )}
                    </button>
                    <Link to={`/activity/${id}`} className="flex items-center gap-3 min-w-0 flex-1 min-h-[44px]">
                      <span className="size-9 shrink-0 overflow-hidden rounded-arch" style={{ backgroundColor: CATEGORY_THEME[a.category].hue }} aria-hidden="true">
                        <FaceIllo name={a.media.illustration} className="size-9" />
                      </span>
                      <span className={cn('text-label text-ink truncate', done && 'line-through opacity-60')}>{a.title}</span>
                      <EvidenceTierBadge tier={a.evidenceTier} mini interactive={false} />
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Guided activities */}
            {guided.length > 0 && (
              <>
                <p className="mt-4 text-caption text-ink-2 font-bold uppercase tracking-[0.1em]">Today's guided moments</p>
                <div className="mt-2 flex flex-col gap-2.5">
                  {guided.map((id, i) => {
                    const a = ACTIVITY_BY_ID.get(id);
                    if (!a) return null;
                    const locked = isActivityLocked(id) || lockedBeyondStarter;
                    const done = todayDoneIds.includes(id);
                    return (
                      <motion.div
                        key={`${id}-${i}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.42 + i * 0.07, ease: EASE }}
                        className={cn(done && 'opacity-60')}
                      >
                        <ActivityRow
                          activity={a}
                          locked={locked}
                          onClick={() => {
                            if (locked) navigate('/paywall');
                            else navigate(`/activity/${id}`);
                          }}
                          trailing={done ? <Check size={17} className="shrink-0" style={{ color: COLORS.sage }} aria-hidden="true" /> : undefined}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* CTA row */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.55, ease: EASE }} className="mt-5">
              <LFButton onClick={() => navigate(`/activity/${firstOpen}/session`)}>Begin ritual · {day.estimatedMinutes} min</LFButton>
              {guided.length > 0 && (
                <div className="mt-2 flex justify-end">
                  <LFButton variant="ghost" fullWidth={false} className="text-caption" onClick={() => setSwapOpen(true)}>
                    Swap an activity
                  </LFButton>
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Free-starter lock ribbon */}
        {lockedBeyondStarter && (
          <Link
            to="/paywall"
            className="mt-4 flex items-center gap-2.5 rounded-tile bg-violet-tint px-3.5 py-3 min-h-[44px]"
          >
            <Sparkles size={15} className="shrink-0 text-violet" aria-hidden="true" />
            <span className="text-caption text-ink flex-1">Your 3-day starter is complete — unlock your full plan</span>
            <ChevronRight size={15} className="shrink-0 text-violet rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        )}
      </motion.div>

      {/* Swap sheet */}
      <Sheet open={swapOpen} onClose={() => setSwapOpen(false)} ariaLabel="Swap an activity">
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Plan-allowed alternatives</p>
        <h3 className="font-display text-display-md text-ink mt-1">Swap {targetActivity?.title}</h3>
        <p className="text-caption text-ink-2 mt-1.5">Every option here already passed your safety profile.</p>
        <div className="mt-4 flex flex-col gap-3">
          {alternatives.map((a) => {
            const locked = isActivityLocked(a.activityId);
            return (
              <div key={a.activityId} className="flex items-center gap-2">
                <div className="flex-1">
                  <ActivityRow
                    activity={a}
                    locked={locked}
                    onClick={() => {
                      if (locked) {
                        setSwapOpen(false);
                        navigate('/paywall');
                        return;
                      }
                      if (swapTarget) setSwapOverride((prev) => ({ ...prev, [swapTarget]: a.activityId }));
                      setSwapOpen(false);
                    }}
                    trailing={locked ? <Lock size={16} className="shrink-0 text-ink-3" aria-hidden="true" /> : undefined}
                  />
                </div>
              </div>
            );
          })}
          {alternatives.length === 0 && <p className="text-body text-ink-2">No alternatives fit this slot today — your plan keeps it gentle.</p>}
        </div>
      </Sheet>
    </section>
  );
}



/* ── Section 4 — Weekly check-in prompt (conditional) ──────────────────── */

function CheckInPrompt() {
  const { currentDay, checkIns } = useApp();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const isCheckInDay = [7, 14, 21, 28].includes(currentDay);
  const alreadyDone = checkIns.some((c) => c.day === currentDay);
  if (!isCheckInDay || alreadyDone || dismissed) return null;

  const week = Math.ceil(currentDay / 7);
  const deep = RESERVED_TINTS.rosePetal.deep;
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="px-5 mt-6"
    >
      <div className="relative rounded-card p-5 overflow-hidden" style={{ backgroundColor: RESERVED_TINTS.rosePetal.tint }}>
        <motion.span
          className="absolute -top-3 end-6 opacity-60"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Petal color={RESERVED_TINTS.rosePetal.hue} className="size-7 block" />
        </motion.span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-3 end-3 inline-flex size-9 items-center justify-center rounded-full"
          aria-label="Dismiss check-in prompt"
        >
          <X size={16} className="text-ink-2" />
        </button>
        <span
          className="inline-flex size-11 items-center justify-center rounded-petal"
          style={{ backgroundColor: RESERVED_TINTS.rosePetal.hue + '55', color: deep }}
          aria-hidden="true"
        >
          <ClipboardCheck size={20} strokeWidth={1.75} />
        </span>
        <p className="text-eyebrow uppercase mt-3" style={{ color: deep }}>
          Day {currentDay} · Weekly check-in
        </p>
        <h2 className="font-display text-title text-ink mt-1">
          {week === 1 ? 'How was your first week?' : `Week ${week}, how did it go?`}
        </h2>
        <p className="text-caption text-ink-2 mt-1.5 max-w-[36ch]">
          Two minutes: comfort, any irritation, and how the routine fit your life. Your plan adjusts from your answers.
        </p>
        <LFButton variant="tinted" tintColor={deep} className="mt-4" onClick={() => navigate('/checkin')}>
          Start check-in
        </LFButton>
      </div>
    </motion.section>
  );
}

/* ── Section 6 — Program teaser ────────────────────────────────────────── */

function ProgramTeaser() {
  const { plan, currentDay, progress, pro } = useApp();
  const navigate = useNavigate();
  if (!plan) return null;

  const week: WeekDef = WEEKS[weekOfDay(currentDay) - 1];
  const [from] = week.days;
  const weekDays = Array.from({ length: 7 }, (_, i) => from + i);
  const doneCount = weekDays.filter((d) => progress.completedDays.includes(d)).length;
  const pct = progress.completedDays.length / 28;

  return (
    <section className="px-5">
      <SectionHeader eyebrow="Your 28-day program" actionLabel="View program" onAction={() => navigate('/program')} />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <Card tappable onClick={() => navigate('/program')} className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-display-md text-ink">
              Week {week.week} — <em className="italic">{week.name}</em>
            </h3>
            <p className="text-caption text-ink-2 mt-0.5">
              {week.week === 1 ? 'A safe baseline, gently kept.' : `${doneCount} of 7 days done this week`}
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {weekDays.map((d, i) => {
                const done = progress.completedDays.includes(d);
                const isToday = d === currentDay;
                const locked = !pro.active && d > 3;
                return (
                  <motion.span
                    key={d}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24, delay: i * 0.04 }}
                    className={cn(
                      'size-[26px] rounded-full flex items-center justify-center text-[11px] font-bold',
                      done && 'text-white',
                      !done && isToday && 'border-2 bg-card',
                      !done && !isToday && 'border border-hairline text-ink-2',
                    )}
                    style={{
                      ...(done ? { backgroundColor: COLORS.sage } : undefined),
                      ...(isToday && !done ? { borderColor: COLORS.rose, color: COLORS.ink } : undefined),
                    }}
                    aria-label={`Day ${d}${done ? ' done' : isToday ? ' today' : locked ? ' locked' : ' upcoming'}`}
                  >
                    {done ? (
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    ) : locked ? (
                      <Lock size={11} className="text-ink-3" aria-hidden="true" />
                    ) : (
                      d
                    )}
                    {isToday && !done && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2"
                        style={{ borderColor: COLORS.rose }}
                        animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    )}
                  </motion.span>
                );
              })}
            </div>
          </div>
          <ProgressRing value={pct} size={56} color={COLORS.rose} strokeWidth={5}>
            <span className="font-display font-semibold text-[13px] text-ink">{Math.round(pct * 100)}%</span>
          </ProgressRing>
        </Card>
      </motion.div>
    </section>
  );
}

/* ── Section 7 — Coach entry ───────────────────────────────────────────── */

function CoachEntry() {
  const navigate = useNavigate();
  return (
    <section className="px-5 mt-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <Card tappable onClick={() => navigate('/coach')} className="relative overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(106,67,201,.3), transparent)' }} aria-hidden="true" />
          <div className="flex items-center gap-3.5">
            <CoachMark className="size-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow uppercase text-ink-2">LumaFace Coach · Preview</p>
              <p className="text-body font-bold text-ink mt-0.5">Ask about your routine</p>
              <p className="text-caption text-ink-2 mt-0.5">Answers from our approved library — with sources, and honest uncertainty.</p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
          </div>
        </Card>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {COACH_PROMPTS.map((prompt, i) => (
            <motion.button
              key={prompt}
              type="button"
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
              onClick={() => navigate(`/coach?prompt=${encodeURIComponent(prompt)}`)}
              className="h-[34px] rounded-full bg-cream-2 px-4 text-[13px] text-ink-2"
            >
              {prompt}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ── Section 8 — Badges preview ────────────────────────────────────────── */

function BadgesPreview() {
  const { progress } = useApp();
  const navigate = useNavigate();
  const [openBadge, setOpenBadge] = useState<string | null>(null);

  const ordered = [...BADGES].sort((a, b) => {
    const ea = progress.badges[a.id] ? 1 : 0;
    const eb = progress.badges[b.id] ? 1 : 0;
    return eb - ea;
  });
  const selected = BADGES.find((b) => b.id === openBadge);

  const progressHint = (id: string): string => {
    switch (id) {
      case 'first-light':
        return `${Math.min(progress.sessions, 1)} of 1 sessions`;
      case 'three-day-rhythm':
        return `${Math.min(progress.streak, 3)} of 3-day streak`;
      case 'diamond-week':
        return `${Math.min(progress.streak, 7)} of 7-day streak`;
      case 'full-circle':
        return `${progress.completedDays.length} of 28 days`;
      case 'century-of-care':
        return `${Math.min(progress.sessions, 100)} of 100 sessions`;
      case 'early-ritual':
        return `${Math.min(progress.earlySessions, 5)} of 5 early sessions`;
      default:
        return '';
    }
  };

  return (
    <section className="px-5">
      <SectionHeader eyebrow="Kindness, collected" title="Your badges" actionLabel="All" onAction={() => navigate('/progress')} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x -mx-5 px-5 pb-1">
        {ordered.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
            className="snap-start"
          >
            <BadgeCard badge={b} earnedAt={progress.badges[b.id]} shimmer={false} onClick={() => setOpenBadge(b.id)} />
          </motion.div>
        ))}
      </div>

      <Sheet open={selected !== undefined && openBadge !== null} onClose={() => setOpenBadge(null)} ariaLabel={selected?.name ?? 'Badge'}>
        {selected && (
          <div className="flex flex-col items-center text-center pt-2">
            <BadgeCard badge={selected} earnedAt={progress.badges[selected.id]} />
            <p className="font-display text-title text-ink mt-4">{selected.name}</p>
            <p className="text-body text-ink-2 mt-1.5">{selected.criteria}</p>
            <p className="text-caption text-ink-2 mt-3 rounded-full bg-cream-2 px-3.5 py-1.5">
              {progress.badges[selected.id]
                ? `Earned ${new Date(progress.badges[selected.id]).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                : progressHint(selected.id)}
            </p>
            <p className="text-caption text-ink-3 mt-4">Badges celebrate habits and care — never appearance change.</p>
          </div>
        )}
      </Sheet>
    </section>
  );
}

/* ── Reminder nudge (one-time soft card after first ritual) ────────────── */

function ReminderNudge() {
  const { progress } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || progress.sessions < 1 || progress.sessions > 3) return null;

  return (
    <section className="px-5 mt-6">
      <div className="relative bg-card rounded-card shadow-card p-4 flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
          <Bell size={18} strokeWidth={1.75} />
        </span>
        <p className="text-[13.5px] leading-[19px] text-ink flex-1">Would a gentle daily nudge help?</p>
        <button type="button" onClick={() => setOpen(true)} className="text-label text-rose min-h-[44px] px-2">
          Maybe
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="inline-flex size-9 items-center justify-center" aria-label="Dismiss reminder nudge">
          <X size={15} className="text-ink-3" />
        </button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="Daily reminders">
        <p className="text-eyebrow uppercase text-ink-2 mt-1">Reminders, gently</p>
        <h3 className="font-display text-display-md text-ink mt-1">A nudge, never a nag</h3>
        <p className="text-body text-ink-2 mt-3">
          One quiet notification at a time you choose. Off by default; change it anytime in Profile. Streaks pause,
          they don't judge — a reminder is an invitation, not a debt.
        </p>
        <LFButton className="mt-5" onClick={() => { setOpen(false); setDismissed(true); navigate('/profile'); }}>
          Choose a time in Profile
        </LFButton>
        <LFButton variant="ghost" className="mt-1" onClick={() => { setOpen(false); setDismissed(true); }}>
          Not now
        </LFButton>
      </Sheet>
    </section>
  );
}

/* ── No-plan state — warm "build your ritual" CTA ──────────────────────── */

function NoPlanCta() {
  const navigate = useNavigate();
  const basics = SKINCARE_BASICS_IDS.map((id) => ACTIVITY_BY_ID.get(id)).filter((a) => a !== undefined);
  return (
    <section className="px-5 mt-6">
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE }} className="bg-card rounded-card shadow-pop p-5">
        <p className="text-eyebrow uppercase text-ink-2">Begin, gently</p>
        <h2 className="font-display text-display-md text-ink mt-1.5">Build your ritual</h2>
        <p className="text-body text-ink-2 mt-2 max-w-[34ch]">
          Answer a few kind questions and we'll compose a 3, 5 or 10-minute daily ritual — checked against your
          safety answers, honest about the science.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          {basics.map((a, i) => (
            <motion.div key={a.activityId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 + i * 0.07, ease: EASE }}>
              <ActivityRow activity={a} onClick={() => navigate(`/activity/${a.activityId}`)} />
            </motion.div>
          ))}
        </div>
        <p className="text-caption text-ink-2 mt-3">The AM/PM basics are free forever — as is every safety feature.</p>
        <LFButton className="mt-4" onClick={() => navigate('/onboarding')}>
          Build your ritual
        </LFButton>
        <LFButton variant="ghost" className="mt-1" onClick={() => navigate('/library')}>
          Browse the library first
        </LFButton>
      </motion.div>
    </section>
  );
}

/* ── Page assembly ─────────────────────────────────────────────────────── */

export default function Home() {
  const { plan } = useApp();
  const quoteWords = QUOTES.daily.split(' ');

  return (
    <div className="pb-8">
      <Greeting />
      <SafetyBanner />
      {plan ? <RitualCard /> : <NoPlanCta />}
      {plan && <CheckInPrompt />}
      {plan && <ReminderNudge />}

      {/* Section 5 — Daily tip */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="px-5 mt-6"
      >
        <TipTicker />
      </motion.section>

      {plan && <ProgramTeaser />}
      <CoachEntry />
      <BadgesPreview />

      {/* Section 9 — Daily quote */}
      <section className="px-5 mt-10 flex flex-col items-center text-center">
        <span className="w-7 h-px bg-rose/60 mb-4 rounded-full" aria-hidden="true" />
        <p className="font-display italic text-quote text-ink max-w-[30ch]">
          {quoteWords.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35, delay: i * 0.03 }}
              className="inline-block"
            >
              {w}
              {i < quoteWords.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </p>
        <p className="text-caption text-ink-3 mt-2">{QUOTES.dailyAttribution}</p>
      </section>

      {/* Section 10 — Footer disclaimer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="px-5 mt-8"
      >
        <DisclaimerBlock />
        <p className="text-caption text-ink-3 text-center mt-3.5">LumaFace · care you can trust · v1.0</p>
      </motion.footer>
    </div>
  );
}
