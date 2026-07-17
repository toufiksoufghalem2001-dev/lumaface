/**
 * Program — `/program` (design/program.md).
 * The 28-day personalized program: four purposeful weeks (Reset ·
 * Consistency · Target · Review), a day grid with done/today/locked states
 * driven by state.plan + state.progress.completedDays, a day bottom-sheet,
 * weekly check-in entries, the honest-expectations card and the disclaimer.
 * Free tier: days 1–3 open, days 4–28 locked → /paywall (safety content is
 * never locked; the check-in itself is always free).
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  Lock,
  Sparkles,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { COLORS, EASE_OUT_SOFT, RESERVED_TINTS, SPRING_DAY_DOT } from '@/lib/theme';
import { CHECK_IN_DAYS, WEEKS, weekOfDay, type WeekDef } from '@/data/program';
import { ACTIVITY_BY_ID } from '@/data/activities';
import type { PlanDay } from '@/lib/plan';
import ActivityRow from '@/components/ActivityRow';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import PlanDiffCard from '@/components/PlanDiffCard';
import ProgressRing from '@/components/ProgressRing';
import Sheet from '@/components/Sheet';
import { LFButton } from '@/components/ui';
import { FaceIllo } from '@/components/illos';
import { adjustmentForWeek, checkInDayFor, isCheckInDue } from '@/pages/program/checkInState';

const EASE = EASE_OUT_SOFT;

/** Free starter: days 1–3 open (program.md §2.4). */
export const FREE_PROGRAM_DAYS = 3;

type DayState = 'done' | 'today' | 'upcoming' | 'locked';

/* ── Day cell (program.md §2.2) ────────────────────────────────────────── */

function DayCell({
  day,
  state,
  isCheckInDay,
  checkInDue,
  wiggle,
  index,
  onTap,
}: {
  day: number;
  state: DayState;
  isCheckInDay: boolean;
  checkInDue: boolean;
  wiggle: boolean;
  index: number;
  onTap: (day: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, ...(wiggle && !reduceMotion ? { x: [0, -4, 4, -3, 3, 0] } : {}) }}
      transition={{
        ...(wiggle ? { x: { duration: 0.4 } } : {}),
        scale: { ...SPRING_DAY_DOT, delay: index * 0.04 },
        opacity: { duration: 0.2, delay: index * 0.04 },
      }}
      onClick={() => onTap(day)}
      className="relative flex flex-col items-center gap-1 min-h-[56px]"
      aria-label={`Day ${day}${
        state === 'done' ? ' — done' : state === 'today' ? ' — today' : state === 'locked' ? ' — locked, unlock with PRO' : ''
      }${isCheckInDay ? ', weekly check-in' : ''}`}
    >
      <span
        className={cn(
          'relative size-11 rounded-full flex items-center justify-center text-[14px]',
          state === 'done' && 'text-white',
          state === 'today' && 'bg-card border-2 font-bold text-ink',
          state === 'upcoming' && 'border border-hairline text-ink-2',
          state === 'locked' && 'bg-cream-2',
        )}
        style={{
          ...(state === 'done' ? { backgroundColor: COLORS.sage } : undefined),
          ...(state === 'today' ? { borderColor: COLORS.rose } : undefined),
        }}
      >
        {state === 'done' ? (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_DAY_DOT}>
            <Check size={16} strokeWidth={3} aria-hidden="true" />
          </motion.span>
        ) : state === 'locked' ? (
          <Lock size={14} className="text-ink-3" aria-hidden="true" />
        ) : (
          day
        )}
        {/* Today halo (§2.2 — 1.9s loop, paused under reduced motion) */}
        {state === 'today' && !reduceMotion && (
          <motion.span
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: COLORS.rose }}
            animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden="true"
          />
        )}
        {/* Check-in corner glyph (§2.2) */}
        {isCheckInDay && (
          <span
            className="absolute -top-1 -end-1 inline-flex size-[18px] items-center justify-center rounded-full border border-card"
            style={{ backgroundColor: RESERVED_TINTS.rosePetal.tint, color: RESERVED_TINTS.rosePetal.deep }}
            aria-hidden="true"
          >
            <ClipboardCheck size={10} strokeWidth={2.25} />
          </span>
        )}
      </span>
      {checkInDue && (
        <span className="text-[9px] font-bold uppercase tracking-[0.08em]" style={{ color: RESERVED_TINTS.rosePetal.deep }}>
          check-in
        </span>
      )}
    </motion.button>
  );
}

/* ── Week card (program.md §2) ─────────────────────────────────────────── */

const WEEK_FOCUS: Record<number, string> = {
  1: 'comfort + baseline',
  2: 'comfort + consistency',
  3: 'one kind addition',
  4: 'steady + review',
};

function WeekSection({
  week,
  index,
  planDays,
  completedDays,
  currentDay,
  isPro,
  checkInDueDay,
  hasAdjustment,
  wiggleDay,
  onTapDay,
  onPreview,
  onShowAdjustment,
}: {
  week: WeekDef;
  index: number;
  planDays: PlanDay[];
  completedDays: number[];
  currentDay: number;
  isPro: boolean;
  /** check-in day that is currently due, if any */
  checkInDueDay: number | null;
  hasAdjustment: boolean;
  /** locked day currently doing the lock-wiggle (§2 interaction) */
  wiggleDay: number | null;
  onTapDay: (day: number) => void;
  onPreview: (day: number | null) => void;
  onShowAdjustment: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [from, to] = week.days;
  const days = Array.from({ length: 7 }, (_, i) => from + i);
  const doneCount = days.filter((d) => completedDays.includes(d)).length;
  const allDone = doneCount === 7;
  const weekLocked = !isPro && from > FREE_PROGRAM_DAYS;
  const hasLockedDays = !isPro && to > FREE_PROGRAM_DAYS;
  const avgMin = Math.round(planDays.reduce((s, d) => s + d.estimatedMinutes, 0) / Math.max(planDays.length, 1));
  const firstUnlocked = days.find((d) => isPro || d <= FREE_PROGRAM_DAYS) ?? null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay: index * 0.06, ease: EASE }}
      className="bg-card rounded-[26px] shadow-card overflow-hidden"
    >
      {/* Header band (§2.1) */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full text-start p-[18px] flex items-start gap-3"
        style={{ backgroundColor: week.tint }}
        aria-expanded={!collapsed}
        aria-label={`Week ${week.week} — ${week.name}. ${collapsed ? 'Expand' : 'Collapse'}`}
      >
        <span className="min-w-0 flex-1">
          <span className="text-eyebrow uppercase text-ink-2 flex items-center gap-2">
            Week {week.week}
            <ChevronDown
              size={14}
              className={cn('text-ink-2 transition-transform duration-300', collapsed && '-rotate-90')}
              aria-hidden="true"
            />
          </span>
          <span className="block font-display text-display-md text-ink mt-0.5">{week.name}</span>
          <span className="block text-caption text-ink-2 mt-1 max-w-[36ch]">{week.intent}</span>
        </span>
        <span className="shrink-0 mt-1" aria-hidden="true">
          {allDone ? (
            <span className="inline-flex size-8 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.sage + '22', color: COLORS.sageDeep }}>
              <Check size={16} strokeWidth={2.5} />
            </span>
          ) : weekLocked ? (
            <Lock size={18} className="text-ink-3" />
          ) : null}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-[18px] pt-4 pb-[18px]">
              {/* Adjustment chip (§2.5) */}
              {hasAdjustment && (
                <button
                  type="button"
                  onClick={onShowAdjustment}
                  className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold min-h-[32px]"
                  style={{ backgroundColor: COLORS.sage + '1E', color: COLORS.sageDeep }}
                >
                  <Waves size={13} strokeWidth={2} aria-hidden="true" />
                  Adjusted after your check-in
                </button>
              )}

              {/* Day grid (§2.2) */}
              <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Week ${week.week} days`}>
                {days.map((d, i) => {
                  const state: DayState = completedDays.includes(d)
                    ? 'done'
                    : !isPro && d > FREE_PROGRAM_DAYS
                      ? 'locked'
                      : d === currentDay
                        ? 'today'
                        : 'upcoming';
                  const isCiDay = (CHECK_IN_DAYS as readonly number[]).includes(d);
                  return (
                    <DayCell
                      key={d}
                      day={d}
                      index={i}
                      state={state}
                      isCheckInDay={isCiDay}
                      checkInDue={isCiDay && checkInDueDay === d}
                      wiggle={wiggleDay === d}
                      onTap={onTapDay}
                    />
                  );
                })}
              </div>

              {/* Footer row (§2.3) */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-caption text-ink-2">
                  ≈{avgMin} min/day · focus: {WEEK_FOCUS[week.week]}
                </p>
                <button
                  type="button"
                  onClick={() => onPreview(firstUnlocked)}
                  className="text-label text-ink-2 underline underline-offset-2 min-h-[44px] inline-flex items-center"
                >
                  Preview
                </button>
              </div>

              {/* PRO lock veil (§2.4) */}
              {hasLockedDays && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3, ease: EASE }}
                >
                  <Link
                    to="/paywall"
                    className="mt-2 flex items-center gap-2.5 rounded-tile bg-violet-tint px-3.5 py-3 min-h-[44px]"
                  >
                    <Sparkles size={15} className="shrink-0 text-violet" aria-hidden="true" />
                    <span className="text-caption text-ink flex-1">
                      Unlock your full 28-day plan — $49.99/year with 7 free days
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-violet rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ── Check-in entry row (program.md §4) ────────────────────────────────── */

function CheckInRow({ week, due, done, onTap }: { week: number; due: boolean; done: boolean; onTap: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative w-full text-start rounded-[20px] p-4 flex items-center gap-3 overflow-hidden"
      style={{ backgroundColor: RESERVED_TINTS.rosePetal.tint }}
      aria-label={`Week ${week} check-in${due ? ' — due now' : done ? ' — completed' : ''}`}
    >
      {due && !reduceMotion && (
        <motion.span
          className="absolute inset-0 rounded-[20px] border-2 pointer-events-none"
          style={{ borderColor: RESERVED_TINTS.rosePetal.hue }}
          animate={{ opacity: [0.9, 0.2, 0.9] }}
          transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        />
      )}
      <span
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-petal"
        style={{ backgroundColor: RESERVED_TINTS.rosePetal.hue + '55', color: RESERVED_TINTS.rosePetal.deep }}
        aria-hidden="true"
      >
        <ClipboardCheck size={20} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold text-ink">
          Week {week} check-in{due ? ' · due now' : ''}
        </span>
        <span className="block text-caption text-ink-2 mt-0.5">
          {done
            ? 'Done — tap to revisit how your plan adjusted.'
            : 'Comfort, any irritation, how it fit your life — then your plan adjusts.'}
        </span>
      </span>
      {done ? (
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.sage + '22', color: COLORS.sageDeep }} aria-hidden="true">
          <Check size={14} strokeWidth={2.5} />
        </span>
      ) : (
        <ChevronRight size={18} className="shrink-0 rtl:-scale-x-100" style={{ color: RESERVED_TINTS.rosePetal.deep }} aria-hidden="true" />
      )}
    </motion.button>
  );
}

/* ── Day Sheet (program.md §3) ─────────────────────────────────────────── */

const AM_BASICS_SET = new Set(['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen']);
const PM_CLEANSE_ID = 'pm-cleanse-unwind';

function DaySheet({
  day,
  dayLocked,
  isActivityLocked,
  quickId,
  onQuickView,
  onClose,
}: {
  day: PlanDay | null;
  dayLocked: boolean;
  isActivityLocked: (id: string) => boolean;
  quickId: string | null;
  onQuickView: (id: string | null) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const quick = quickId ? ACTIVITY_BY_ID.get(quickId) : undefined;

  return (
    <Sheet open={day !== null} onClose={onClose} ariaLabel={day ? `Day ${day.day} details` : undefined}>
      {day && (
        <AnimatePresence mode="wait" initial={false}>
          {quick ? (
            /* Activity quick-view (§3 — same sheet, back chevron returns) */
            <motion.div
              key="quick"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => onQuickView(null)}
                className="inline-flex items-center gap-1 text-label text-ink-2 min-h-[44px] -ms-2 px-2"
                aria-label="Back to day"
              >
                <ChevronLeft size={17} className="rtl:-scale-x-100" aria-hidden="true" />
                Day {day.day}
              </button>
              <div className="mt-1 flex items-start gap-4">
                <span
                  className="w-20 h-[88px] shrink-0 overflow-hidden rounded-arch flex items-end justify-center"
                  style={{ backgroundColor: 'var(--lf-quick-hue, transparent)' }}
                  aria-hidden="true"
                >
                  <FaceIllo name={quick.media.illustration} className="w-20 h-[88px]" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-title text-ink">{quick.title}</span>
                  <span className="mt-1.5 block">
                    <EvidenceTierBadge tier={quick.evidenceTier} />
                  </span>
                </span>
              </div>
              <p className="text-body text-ink-2 mt-4">{quick.expectedOutcome}</p>
              <p className="text-caption text-ink-2 mt-2">
                {quick.frequency} · {quick.difficulty}
                {quick.equipment !== 'none' ? ` · ${quick.equipment}` : ''}
              </p>
              <LFButton variant="secondary" className="mt-5" onClick={() => navigate(`/activity/${quick.activityId}`)}>
                Open activity
              </LFButton>
            </motion.div>
          ) : (
            <motion.div
              key="day"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <p className="text-eyebrow uppercase text-ink-2 mt-1">
                Day {day.day} · Week {day.week} — {WEEKS[day.week - 1].name}
              </p>
              <h3 className="font-display text-display-md text-ink mt-1">
                {day.focusLine} — {day.estimatedMinutes} min
              </h3>

              {/* Est. chip row (§3) */}
              <div className="mt-3 flex flex-wrap gap-2">
                {[`≈${day.estimatedMinutes} min`, `${day.items.length} moments`, 'gentle'].map((chip) => (
                  <span key={chip} className="rounded-full bg-cream-2 px-3 py-1 text-[11px] font-bold text-ink-2">
                    {chip}
                  </span>
                ))}
              </div>

              {/* Activity list (§3) */}
              <DaySheetGroup label="Morning basics" ids={day.items.filter((i) => AM_BASICS_SET.has(i.activityId)).map((i) => i.activityId)} dayLocked={dayLocked} isActivityLocked={isActivityLocked} onQuickView={onQuickView} />
              <DaySheetGroup label="Evening" ids={day.items.filter((i) => i.activityId === PM_CLEANSE_ID).map((i) => i.activityId)} dayLocked={dayLocked} isActivityLocked={isActivityLocked} onQuickView={onQuickView} />
              <DaySheetGroup
                label="Guided moments"
                ids={day.items.filter((i) => !AM_BASICS_SET.has(i.activityId) && i.activityId !== PM_CLEANSE_ID).map((i) => i.activityId)}
                dayLocked={dayLocked}
                isActivityLocked={isActivityLocked}
                onQuickView={onQuickView}
              />

              {/* Why line (§3) */}
              {day.whyLine && (
                <p className="mt-4 flex items-start gap-2 text-caption text-ink-2">
                  <Sparkles size={14} className="shrink-0 mt-[1px] text-gold" aria-hidden="true" />
                  {day.whyLine}
                </p>
              )}

              {/* Check-in entry on check-in days */}
              {day.isCheckInDay && (
                <button
                  type="button"
                  onClick={() => navigate('/checkin')}
                  className="mt-4 w-full flex items-center gap-2.5 rounded-tile px-3.5 py-3 min-h-[44px] text-start"
                  style={{ backgroundColor: RESERVED_TINTS.rosePetal.tint }}
                >
                  <ClipboardCheck size={16} style={{ color: RESERVED_TINTS.rosePetal.deep }} aria-hidden="true" />
                  <span className="text-[13px] font-bold text-ink flex-1">Week {day.week} check-in — always free, two quiet minutes</span>
                  <ChevronRight size={15} className="rtl:-scale-x-100" style={{ color: RESERVED_TINTS.rosePetal.deep }} aria-hidden="true" />
                </button>
              )}

              {/* CTA (§3) */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE }} className="mt-5">
                {dayLocked ? (
                  <LFButton variant="tinted" tintColor={COLORS.violet} onClick={() => navigate('/paywall')}>
                    Unlock with PRO
                  </LFButton>
                ) : (
                  <StartDayButton day={day} />
                )}
                <p className="text-caption text-ink-3 mt-3 text-center">
                  Finish today to keep your streak warm — and skipping a day is always allowed.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  );
}

function DaySheetGroup({
  label,
  ids,
  dayLocked,
  isActivityLocked,
  onQuickView,
}: {
  label: string;
  ids: string[];
  dayLocked: boolean;
  isActivityLocked: (id: string) => boolean;
  onQuickView: (id: string) => void;
}) {
  const navigate = useNavigate();
  if (ids.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-caption text-ink-2 font-bold uppercase tracking-[0.1em]">{label}</p>
      <div className="mt-2 flex flex-col gap-2.5">
        {ids.map((id, i) => {
          const a = ACTIVITY_BY_ID.get(id);
          if (!a) return null;
          // Safety content (free set, e.g. Barrier Reset) is never locked.
          const locked = isActivityLocked(id) || (dayLocked && !a.free);
          return (
            <motion.div
              key={`${id}-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.05, ease: EASE }}
            >
              <ActivityRow
                activity={a}
                locked={locked}
                onClick={() => {
                  if (locked) navigate('/paywall');
                  else onQuickView(id);
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function StartDayButton({ day }: { day: PlanDay }) {
  const navigate = useNavigate();
  const firstGuided =
    day.items.find((i) => !AM_BASICS_SET.has(i.activityId) && i.activityId !== PM_CLEANSE_ID)?.activityId ??
    day.items[0]?.activityId;
  return (
    <LFButton onClick={() => firstGuided && navigate(`/activity/${firstGuided}/session`)}>
      Start Day {day.day}
    </LFButton>
  );
}

/* ── "What to expect" honesty card (program.md §5) ─────────────────────── */

function ExpectationsCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="bg-cream-2 rounded-card p-[18px]"
    >
      <div className="flex items-center gap-2.5">
        <Info size={17} className="shrink-0 text-ink-2" aria-hidden="true" />
        <h2 className="font-display font-semibold text-[19px] leading-[25px] text-ink">An honest four weeks.</h2>
      </div>
      <div className="mt-3.5 flex flex-col gap-3">
        {WEEKS.map((w, i) => (
          <motion.div
            key={w.week}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: EASE }}
            className="flex items-start gap-3"
          >
            <span
              className="mt-[3px] inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-ink-2"
              style={{ backgroundColor: w.tint }}
              aria-hidden="true"
            >
              {w.week}
            </span>
            <p className="text-[13px] leading-[19px] text-ink-2">{w.expectations}</p>
          </motion.div>
        ))}
      </div>
      <p className="text-caption text-ink-2 mt-4 pt-3 border-t border-hairline">
        Everyone's skin is different. This is wellness practice, not medical treatment — and your plan never includes
        anything your safety answers ruled out.
      </p>
    </motion.section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Program() {
  const { plan, progress, currentDay, pro, checkIns, isActivityLocked } = useApp();
  const navigate = useNavigate();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [quickId, setQuickId] = useState<string | null>(null);
  const [diffFor, setDiffFor] = useState<number | null>(null); // check-in day whose diff shows
  const [wiggleDay, setWiggleDay] = useState<number | null>(null);

  const isPro = pro.active;
  const completedDays = progress.completedDays;
  const pendingCheckInDay = checkInDayFor(checkIns, currentDay);
  const dueDay =
    (CHECK_IN_DAYS as readonly number[]).find((d) => isCheckInDue(checkIns, currentDay, d)) ?? null;

  const doneCount = completedDays.length;
  const pct = doneCount / 28;
  const week = weekOfDay(currentDay);
  const weekDef = WEEKS[week - 1];
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekDef.days[0] + i),
    [weekDef],
  );
  const doneThisWeek = weekDays.filter((d) => completedDays.includes(d)).length;

  const openPlanDay = plan?.days.find((d) => d.day === openDay) ?? null;
  const diffRecord = diffFor !== null ? checkIns.find((c) => c.day === diffFor) : undefined;

  const tapDay = (d: number) => {
    // Check-in day cell, when due → the check-in flow (always free)
    if ((CHECK_IN_DAYS as readonly number[]).includes(d) && dueDay === d) {
      navigate('/checkin');
      return;
    }
    if (!isPro && d > FREE_PROGRAM_DAYS) {
      // locked cell → lock wiggle, then paywall (§2 interaction)
      setWiggleDay(d);
      window.setTimeout(() => {
        setWiggleDay(null);
        navigate('/paywall');
      }, 420);
      return;
    }
    setQuickId(null);
    setOpenDay(d);
  };

  const previewDay = (d: number | null) => {
    if (d === null) {
      navigate('/paywall');
      return;
    }
    setQuickId(null);
    setOpenDay(d);
  };

  /* No plan yet (onboarding skipped entirely) — warm entry point. */
  if (!plan) {
    return (
      <div className="px-5 pt-10 pb-28 flex flex-col items-center text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
          <ClipboardCheck size={26} strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-display-lg text-ink mt-5">Four weeks of <em className="italic">showing up</em>.</h1>
        <p className="text-body text-ink-2 mt-3 max-w-[34ch]">
          Your 28-day program is built from your goals and safety answers. Two quiet minutes to set it up.
        </p>
        <LFButton className="mt-6" onClick={() => navigate('/onboarding')}>
          Build your ritual
        </LFButton>
      </div>
    );
  }

  return (
    <div className="pb-28">
      {/* ── Section 1 — Header (program.md §1) ── */}
      <section className="px-5 pt-4">
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="text-eyebrow uppercase text-ink-2">
          Your 28-day program
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08, ease: EASE }} className="font-display text-display-lg text-ink mt-1.5">
          Four weeks of <em className="italic">showing up</em>.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.16, ease: EASE }} className="text-body text-ink-2 mt-2 max-w-[38ch]">
          A plan built from your goals and safety answers — adjusted every week from how your skin and life actually
          responded.
        </motion.p>

        {/* Overall progress card (§1) */}
        <motion.button
          type="button"
          onClick={() => navigate('/progress')}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="mt-4 w-full bg-card rounded-card shadow-card p-[18px] flex items-center gap-4 text-start"
          aria-label={`Overall progress — ${Math.round(pct * 100)} percent. Open progress.`}
        >
          <ProgressRing value={pct} size={72} color={COLORS.rose}>
            <span className="font-display font-semibold text-[17px] text-ink">{Math.round(pct * 100)}%</span>
          </ProgressRing>
          <span className="min-w-0 flex-1">
            <span className="block text-body font-bold text-ink">
              Day {currentDay} of 28
            </span>
            <span className="block text-caption text-ink-2 mt-0.5">
              Week {week} — {weekDef.name} · {doneThisWeek} {doneThisWeek === 1 ? 'day' : 'days'} done
            </span>
            <span className="mt-2 flex items-center gap-1.5" aria-hidden="true">
              {weekDays.map((d, i) => {
                const done = completedDays.includes(d);
                const isToday = d === currentDay && !done;
                const locked = !isPro && d > FREE_PROGRAM_DAYS;
                return (
                  <motion.span
                    key={d}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...SPRING_DAY_DOT, delay: 0.4 + i * 0.03 }}
                    className={cn(
                      'size-[10px] rounded-full',
                      done && '',
                      isToday && 'ring-2 ring-offset-1',
                      !done && !isToday && (locked ? 'bg-cream-2' : 'border border-hairline'),
                    )}
                    style={{
                      ...(done ? { backgroundColor: COLORS.sage } : undefined),
                      ...(isToday ? ({ '--tw-ring-color': COLORS.rose } as React.CSSProperties) : undefined),
                    }}
                  />
                );
              })}
            </span>
          </span>
        </motion.button>
      </section>

      {/* ── Section 2 + 4 — Week cards with check-in entries ── */}
      <section className="px-5 mt-6 flex flex-col gap-4">
        {WEEKS.map((w, i) => {
          const ciDay = w.days[1]; // 7 / 14 / 21 / 28
          const ciRecord = checkIns.find((c) => c.day === ciDay);
          const adjustment = adjustmentForWeek(checkIns, w.week);
          const showChip = !!adjustment && (adjustment.planDiff.paused.length > 0 || adjustment.planDiff.added.length > 0);
          return (
            <div key={w.week} className="flex flex-col gap-3">
              <WeekSection
                week={w}
                index={i}
                planDays={plan.days.filter((d) => d.week === w.week)}
                completedDays={completedDays}
                currentDay={currentDay}
                isPro={isPro}
                checkInDueDay={dueDay}
                hasAdjustment={showChip}
                wiggleDay={wiggleDay}
                onTapDay={tapDay}
                onPreview={previewDay}
                onShowAdjustment={() => adjustment && setDiffFor(adjustment.day)}
              />
              <CheckInRow
                week={w.week}
                due={dueDay === ciDay}
                done={!!ciRecord}
                onTap={() => {
                  if (ciRecord) setDiffFor(ciRecord.day);
                  else navigate('/checkin');
                }}
              />
            </div>
          );
        })}
      </section>

      {/* ── Section 5 — What to expect ── */}
      <section className="px-5 mt-8">
        <ExpectationsCard />
      </section>

      {/* ── Section 6 — Footer ── */}
      <section className="px-5 mt-8">
        <DisclaimerBlock />
      </section>

      {/* Day sheet */}
      <DaySheet
        day={openPlanDay}
        dayLocked={openDay !== null && !isPro && openDay > FREE_PROGRAM_DAYS}
        isActivityLocked={isActivityLocked}
        quickId={quickId}
        onQuickView={setQuickId}
        onClose={() => {
          setOpenDay(null);
          setQuickId(null);
        }}
      />

      {/* Adjustment diff sheet (§2.5) */}
      <Sheet open={diffRecord !== undefined} onClose={() => setDiffFor(null)} ariaLabel="Your week, adjusted">
        {diffRecord && (
          <div>
            <p className="text-eyebrow uppercase text-ink-2 mt-1">Week {Math.ceil(diffRecord.day / 7)} check-in</p>
            <h3 className="font-display text-display-md text-ink mt-1">How your plan adjusted</h3>
            <p className="text-caption text-ink-2 mt-1.5">
              From your answers on{' '}
              {new Date(diffRecord.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — never from
              appearance analysis.
            </p>
            <PlanDiffCard diff={diffRecord.planDiff} className="mt-4 shadow-none border border-hairline" />
            {pendingCheckInDay <= 28 && (
              <LFButton variant="secondary" className="mt-4" onClick={() => setDiffFor(null)}>
                Close
              </LFButton>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
