/**
 * Progress — `/progress` (design/progress.md).
 * Proof and motivation with zero appearance pressure: habits heatmap, serif
 * stats with count-up, badge shelf, consent-gated on-device photo diary
 * (compare only self-to-self, honest "no reliable comparison" abstention),
 * a "focus on habits" hide toggle persisted to the profile, milestones,
 * disclaimer footer.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  EyeOff,
  Flame,
  Flower2,
  FolderLock,
  Gem,
  Info,
  Lock,
  Sparkles,
  Sun,
  Sunrise,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp, todayKey, type Capture } from '@/lib/store';
import type { UserProfile } from '@/lib/plan';
import { COLORS, EASE_OUT_SOFT } from '@/lib/theme';
import { ACTIVITY_BY_ID } from '@/data/activities';
import { BADGES, type BadgeDef } from '@/data/content';
import BadgeCard from '@/components/BadgeCard';
import CompareSlider from '@/components/CompareSlider';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import SectionHeader from '@/components/SectionHeader';
import Sheet from '@/components/Sheet';
import { Card, LFButton } from '@/components/ui';
import { EmptyPhotos } from '@/components/illos';
import PetalConfetti from '@/components/PetalConfetti';
import { capturesComparable, processPhotoFile } from '@/pages/progress/photo';
import QualityChips from '@/pages/progress/QualityChips';
import { useCountUp } from '@/pages/progress/useCountUp';
import {
  badgeProgress,
  buildMilestones,
  comfortEcho,
  comfortLabelFor,
  dayIntensity,
  longestStreak,
  monthCells,
} from '@/pages/progress/stats';

const EASE = EASE_OUT_SOFT;

/** Format "Jul 12" from a YYYY-MM-DD key. */
function shortDate(key: string): string {
  const d = new Date(key.length === 10 ? key + 'T00:00:00' : key);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Section 1 — Hero stats (progress.md §1) ───────────────────────────── */

function HeroStats({ brandNew }: { brandNew: boolean }) {
  const { progress } = useApp();
  const streak = useCountUp(Math.round(progress.streak), 0.8, 0.3, !brandNew);
  const minutes = useCountUp(Math.round(progress.minutes), 0.8, 0.38, !brandNew);
  const sessions = useCountUp(progress.sessions, 0.8, 0.46, !brandNew);

  const tiles = [
    { icon: Flame, color: COLORS.flame, value: streak, label: 'day streak', raw: progress.streak },
    { icon: Clock, color: '#7A5A24', value: minutes, label: 'minutes of care', raw: Math.round(progress.minutes) },
    { icon: Sparkles, color: COLORS.rose, value: sessions, label: 'rituals', raw: progress.sessions },
  ];

  return (
    <section className="px-5 pt-4">
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="font-display text-display-lg text-ink">
        Your progress
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06, ease: EASE }} className="text-caption text-ink-2 mt-1">
        Small minutes, gathered kindly. We measure showing up — never your face.
      </motion.p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {tiles.map(({ icon: Icon, color, value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 + i * 0.08, ease: EASE }}
            className="bg-card rounded-[20px] shadow-card p-3.5 flex flex-col items-center text-center"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-cream-2" style={{ color }} aria-hidden="true">
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className="font-display text-number-lg text-ink mt-1.5">{brandNew ? '—' : value}</span>
            <span className="text-caption text-ink-2">{label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Section 2 — Habits heatmap (progress.md §2) ───────────────────────── */

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function HeatmapSection() {
  const { progress } = useApp();
  const [monthOffset, setMonthOffset] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayKey();

  const base = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const year = base.getFullYear();
  const month = base.getMonth();
  const cells = useMemo(() => monthCells(year, month, today), [year, month, today]);
  const echo = useMemo(() => comfortEcho(progress.comfortLog, year, month), [progress.comfortLog, year, month]);
  const longest = useMemo(() => longestStreak(progress.dailyLog), [progress.dailyLog]);

  const page = (dir: number) => {
    setDirection(dir);
    setMonthOffset((o) => Math.min(0, o + dir));
    setSelected(null);
  };

  // selected-day tooltip details (§2 interaction)
  const selEntry = selected ? (progress.dailyLog[selected] ?? []) : [];
  const selMinutes = Math.round(
    selEntry.reduce((s, id) => s + (ACTIVITY_BY_ID.get(id)?.durationSeconds ?? 0), 0) / 60,
  );
  const selComfort = selected
    ? [...progress.comfortLog].reverse().find((e) => e.date.startsWith(selected))
    : undefined;

  return (
    <section className="px-5 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="bg-card rounded-card shadow-card p-5"
      >
        {/* header + month pager */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-title text-ink">Consistency</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => page(-1)}
              className="inline-flex size-10 items-center justify-center rounded-full text-ink-2"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <span className="text-label font-bold text-ink min-w-[92px] text-center">
              {base.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => page(1)}
              disabled={monthOffset >= 0}
              className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* selected-day tooltip chip */}
        <AnimatePresence>
          {selected && selEntry.length > 0 && (
            <motion.div
              key="sel"
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2 rounded-full bg-cream-2 px-3.5 py-2">
                <p className="text-caption text-ink flex-1">
                  {shortDate(selected)} · {selEntry.length} ritual {selEntry.length === 1 ? 'moment' : 'moments'}
                  {selMinutes > 0 ? `, ${selMinutes} min` : ''}
                  {selComfort ? ` · felt ${comfortLabelFor(selComfort.comfortLevel)}` : ''}
                </p>
                <button type="button" onClick={() => setSelected(null)} aria-label="Dismiss day details" className="inline-flex size-6 items-center justify-center rounded-full text-ink-3">
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* grid */}
        <div className="mt-4 grid grid-cols-7 gap-y-1.5 justify-items-center">
          {WEEKDAY_HEADERS.map((d, i) => (
            <span key={i} className="text-[10px] text-ink-3 font-medium">
              {d}
            </span>
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -24 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="mt-1.5 grid grid-cols-7 gap-y-1.5 justify-items-center"
          >
            {cells.map((cell, i) => {
              if (!cell) return <span key={`blank-${i}`} className="size-[34px]" aria-hidden="true" />;
              const count = progress.dailyLog[cell.key]?.length ?? 0;
              const intensity = cell.future ? 'none' : dayIntensity(count);
              return (
                <motion.button
                  key={cell.key}
                  type="button"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, delay: (i % 7) * 0.015 }}
                  onClick={() => count > 0 && setSelected((s) => (s === cell.key ? null : cell.key))}
                  disabled={count === 0}
                  className={cn('size-[34px] rounded-[10px] flex items-center justify-center text-[11px]', cell.future && 'opacity-50')}
                  style={{
                    backgroundColor:
                      intensity === 'full' ? COLORS.rose : intensity === 'partial' ? COLORS.rose + '73' : COLORS.cream2,
                    color: intensity === 'none' ? COLORS.ink3 : '#FFF',
                    ...(cell.today ? { boxShadow: `inset 0 0 0 1.5px ${COLORS.ink}` } : undefined),
                    ...(selected === cell.key ? { boxShadow: `inset 0 0 0 1.5px ${COLORS.ink}, 0 0 0 3px ${COLORS.rose}33` } : undefined),
                  }}
                  aria-label={`${shortDate(cell.key)}${count > 0 ? ` — ${count} ritual moments` : cell.future ? ' — upcoming' : ' — rest day'}`}
                >
                  {cell.day}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* legend + longest streak */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-caption text-ink-3">
            Less
            {[COLORS.cream2, COLORS.rose + '4D', COLORS.rose + '99', COLORS.rose].map((c) => (
              <span key={c} className="size-3 rounded-[4px]" style={{ backgroundColor: c }} aria-hidden="true" />
            ))}
            More
          </p>
          <p className="text-caption text-ink font-bold">Longest streak: {longest}</p>
        </div>

        {/* comfort echo — we track feelings, not looks (§2) */}
        <p className="mt-2.5 flex items-center gap-2 text-caption text-ink-2">
          {echo && echo.label === 'comfortable' ? (
            <Sun size={14} className="shrink-0 text-gold" aria-hidden="true" />
          ) : (
            <Cloud size={14} className="shrink-0 text-ink-3" aria-hidden="true" />
          )}
          {echo
            ? `This month you mostly felt: ${echo.label} (${echo.pct}% of sessions)`
            : 'No comfort check-ins logged this month yet — the app tracks feelings, not looks.'}
        </p>
      </motion.div>
    </section>
  );
}

/* ── Section 3 — Badge shelf (progress.md §3) ──────────────────────────── */

const BADGE_ICONS = { Sunrise, Flame, Gem, Flower2, Award, Sun } as const;

function BadgeShelf() {
  const { progress } = useApp();
  const [open, setOpen] = useState<BadgeDef | null>(null);

  return (
    <section>
      <div className="px-5">
        <SectionHeader eyebrow="Kindness, collected" title="Badges" />
      </div>
      <div className="px-5 grid grid-cols-2 gap-3">
        {BADGES.map((b, i) => {
          const earnedAt = progress.badges[b.id];
          const prog = badgeProgress(b.id, progress);
          return (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => setOpen(b)}
              initial={{ opacity: 0, y: 24, rotate: 1.5 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
              className="bg-card rounded-[20px] shadow-card p-4 flex flex-col items-center text-center min-h-[44px]"
              aria-label={`${b.name} — ${earnedAt ? `earned ${shortDate(earnedAt)}` : `locked. ${b.criteria}`}`}
            >
              <BadgeCard badge={b} earnedAt={earnedAt} shimmer={!!earnedAt} />
              <span className="text-caption text-ink-2 mt-2">{b.criteria}</span>
              <span className={cn('text-caption mt-0.5 font-bold', earnedAt ? 'text-gold' : 'text-ink-3')}>
                {earnedAt ? `Earned ${shortDate(earnedAt)}` : `${prog.current} of ${prog.target} ${prog.unit}`}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Badge detail sheet (§3 interaction) */}
      <Sheet open={open !== null} onClose={() => setOpen(null)} ariaLabel={open ? open.name : undefined}>
        {open && <BadgeDetail badge={open} onClose={() => setOpen(null)} />}
      </Sheet>
    </section>
  );
}

function BadgeDetail({ badge, onClose }: { badge: BadgeDef; onClose: () => void }) {
  const { progress } = useApp();
  const earnedAt = progress.badges[badge.id];
  const prog = badgeProgress(badge.id, progress);
  const Icon = BADGE_ICONS[badge.icon];
  const pct = Math.min(prog.current / prog.target, 1);

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={cn('inline-flex size-24 items-center justify-center rounded-full', !earnedAt && 'opacity-45')}
        style={
          earnedAt
            ? { backgroundColor: COLORS.card, border: `2.5px solid ${COLORS.gold}`, color: COLORS.ink, boxShadow: '0 6px 18px -6px rgba(201,162,39,.5)' }
            : { backgroundColor: COLORS.cream2, color: COLORS.ink3 }
        }
        aria-hidden="true"
      >
        <Icon size={38} strokeWidth={1.5} />
      </span>
      <h3 className="font-display text-display-md text-ink mt-4">{badge.name}</h3>
      <p className="text-body text-ink-2 mt-1.5">{badge.criteria}</p>
      {earnedAt ? (
        <p className="text-caption text-gold font-bold mt-3">Earned on {shortDate(earnedAt)}</p>
      ) : (
        <div className="w-full mt-4">
          <div className="h-2 rounded-full bg-cream-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: COLORS.gold }}
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </div>
          <p className="text-caption text-ink-2 mt-2">
            {prog.current} of {prog.target} {prog.unit}
          </p>
        </div>
      )}
      <p className="font-display italic text-quote text-ink-2 mt-4">Crowns are earned slowly.</p>
      <LFButton variant="secondary" className="mt-5" onClick={onClose}>
        Close
      </LFButton>
    </div>
  );
}

/* ── Section 4 — Photo diary (progress.md §4, consent-gated) ───────────── */

/** Arch capture slot (§4 — 1:1.2 aspect, arch mask). */
function CaptureSlot({
  label,
  capture,
  onAdd,
  pop,
}: {
  label: string;
  capture?: Capture;
  onAdd?: () => void;
  /** petal-pop on first fill (§4 animation) */
  pop?: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <motion.div
        key={capture?.captureId ?? 'empty'}
        initial={pop ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full overflow-hidden rounded-arch"
        style={{ aspectRatio: '1 / 1.2' }}
      >
        {capture ? (
          <img src={capture.dataUrl} alt={`Your capture — ${label}`} className="size-full object-cover" draggable={false} />
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="size-full border-2 border-dashed border-ink-3 rounded-arch flex flex-col items-center justify-center gap-2 text-ink-3"
            aria-label={`Add photo — ${label}`}
          >
            <Camera size={24} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-caption">Add photo</span>
          </button>
        )}
      </motion.div>
      <span className="text-caption text-ink-2">{label}</span>
    </div>
  );
}

/** Free tier — locked history preview (§4 / spec §11.1). */
function LockedHistoryPreview() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mt-4 rounded-card overflow-hidden bg-cream-2 p-6 flex flex-col items-center text-center"
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-60" style={{ filter: 'blur(12px)' }} aria-hidden="true">
        <EmptyPhotos className="w-40" />
      </div>
      <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-card shadow-card text-ink-3" aria-hidden="true">
        <Lock size={20} strokeWidth={1.75} />
      </span>
      <p className="relative text-body font-bold text-ink mt-3">Standardized history is a PRO kindness</p>
      <p className="relative text-caption text-ink-2 mt-1 max-w-[32ch]">
        Weekly same-conditions captures and side-by-side view.
      </p>
      <LFButton className="relative mt-4" fullWidth={false} onClick={() => navigate('/paywall')}>
        Unlock photo diary
      </LFButton>
    </motion.div>
  );
}

function PhotoDiarySection() {
  const { consents, setConsent, photos, addPhoto, deletePhoto, pro, profile, setProfile } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [lastSaved, setLastSaved] = useState<{ capture: Capture; comparable: boolean } | null>(null);
  const [fullView, setFullView] = useState<Capture | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevCount = useRef(photos.length);

  // "Focus on habits" — persisted into lf_profile so Profile can mirror it (spec §10.4).
  const hidden = (profile as unknown as { hideComparison?: boolean } | null)?.hideComparison === true;
  const setHidden = (v: boolean) => setProfile({ hideComparison: v } as unknown as Partial<UserProfile>);

  // first-photo celebration (§4 — petal-pop + one gold sparkle burst)
  useEffect(() => {
    const prev = prevCount.current;
    if (photos.length > prev && prev === 0) setCelebrate(true);
    prevCount.current = photos.length;
  }, [photos.length]);

  const baseline = photos[0];
  const latest = photos[photos.length - 1];
  const canCompare = pro.active && photos.length >= 2;
  const comparable = canCompare ? capturesComparable(baseline, latest) : false;
  const consentOn = consents.photoSave;
  // §11.1 — one baseline capture free, history PRO
  const freeHistoryLocked = !pro.active && photos.length >= 1;

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      const { dataUrl, quality } = await processPhotoFile(file);
      const capture = addPhoto(dataUrl, quality);
      setLastSaved({ capture, comparable: baseline ? capturesComparable(baseline, capture) : true });
    } catch {
      /* unreadable file — quietly stay put */
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <section>
      {/* header + PRO chip (§4) */}
      <div className="px-5 mt-8 mb-[14px] flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow uppercase text-ink-2">Photo diary</p>
          <h2 className="font-display text-title text-ink mt-1">Same light, same you</h2>
        </div>
        {pro.active ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ backgroundColor: COLORS.gold + '22', color: COLORS.gold }}>
            <Sparkles size={11} aria-hidden="true" />
            PRO
          </span>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/paywall')}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-violet-tint px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-violet min-h-[28px]"
          >
            <Sparkles size={11} aria-hidden="true" />
            PRO
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <PetalConfetti active={celebrate} count={8} accentColor={COLORS.gold} onDone={() => setCelebrate(false)} />

      {hidden ? (
        /* "Focus on habits" collapsed state (§4 / spec §10.4) */
        <div className="px-5">
          <div className="rounded-tile bg-cream-2 p-4 flex items-center gap-3">
            <EyeOff size={17} className="shrink-0 text-ink-2" aria-hidden="true" />
            <p className="text-caption text-ink-2 flex-1">Photos hidden — you're focusing on habits. They still count the most.</p>
            <button type="button" onClick={() => setHidden(false)} className="text-label text-rose min-h-[44px] inline-flex items-center">
              Show
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5">
          {/* privacy strip (§4) */}
          <div className="rounded-tile p-3.5 flex items-center gap-2.5" style={{ backgroundColor: COLORS.sage + '1E' }}>
            <FolderLock size={16} className="shrink-0" style={{ color: COLORS.sageDeep }} aria-hidden="true" />
            <p className="text-caption" style={{ color: COLORS.sageDeep }}>
              Your photos never leave this device. Nothing is uploaded, analyzed, or scored — ever.
            </p>
          </div>

          {!consentOn ? (
            /* Consent invitation (§4) */
            <Card className="mt-4 flex flex-col items-center text-center">
              <EmptyPhotos className="w-36" />
              <p className="text-body font-bold text-ink mt-4">A private photo diary, if you want one</p>
              <p className="text-caption text-ink-2 mt-1.5 max-w-[36ch]">
                Weekly same-conditions captures, only on this device, deletable one by one. Or skip photos entirely —
                habits are enough.
              </p>
              <LFButton className="mt-4" onClick={() => setConsent('photoSave', true)}>
                Allow on-device photos
              </LFButton>
              <LFButton variant="ghost" className="mt-1" onClick={() => setHidden(true)}>
                Not interested — hide this
              </LFButton>
            </Card>
          ) : (
            <>
              {/* capture guidance (§4) */}
              <p className="mt-4 flex items-start gap-2 text-caption text-ink-2">
                <Info size={14} className="shrink-0 mt-[1px]" aria-hidden="true" />
                Same window light, device at eye level, relaxed neutral face, hair away, no beauty filter. Mornings
                before your ritual are perfect.
              </p>

              {/* slots row (§4) */}
              <div className="mt-4 flex gap-3">
                <CaptureSlot
                  label="Day 1"
                  capture={baseline}
                  onAdd={freeHistoryLocked ? undefined : openPicker}
                  pop={photos.length === 1}
                />
                {pro.active ? (
                  <CaptureSlot
                    label="This week"
                    capture={photos.length >= 2 ? latest : undefined}
                    onAdd={openPicker}
                  />
                ) : (
                  <div className="flex-1" aria-hidden="true" />
                )}
              </div>

              {/* free tier: locked history preview (§4 / §11.1) */}
              {freeHistoryLocked && <LockedHistoryPreview />}

              {/* PRO: add another same-conditions capture */}
              {pro.active && (
                <LFButton variant="secondary" className="mt-4" disabled={processing} onClick={openPicker}>
                  Add this week's photo
                </LFButton>
              )}

              {/* compare view (§4 — self-to-self only, honest abstention) */}
              {canCompare && (
                <div className="mt-4">
                  <CompareSlider
                    beforeSrc={baseline.dataUrl}
                    afterSrc={latest.dataUrl}
                    comparable={comparable}
                    beforeLabel={shortDate(baseline.createdAt.slice(0, 10))}
                    afterLabel={shortDate(latest.createdAt.slice(0, 10))}
                  />
                  <p className="text-caption text-ink-3 mt-2 text-center">
                    Only you, only same-conditions captures. Anything visible "appears in this capture" — light does a
                    lot of talking.
                  </p>
                </div>
              )}

              {/* after-capture quality echo */}
              <AnimatePresence>
                {lastSaved && (
                  <motion.div
                    key={lastSaved.capture.captureId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="mt-4 rounded-tile bg-card border border-hairline p-3.5"
                  >
                    <p className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: COLORS.sageDeep }}>
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      Saved to this device only
                    </p>
                    <QualityChips quality={lastSaved.capture.qualityMetrics} className="mt-2" />
                    {!lastSaved.comparable && (
                      <p className="text-caption text-ink-2 mt-2">
                        This one's lighting differs from your baseline — we've saved it, but won't use it for
                        side-by-side comparison.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* timeline strip (§4) */}
              {photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-caption text-ink-2 font-bold uppercase tracking-[0.1em]">Your captures</p>
                  <div className="mt-2 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1" role="list">
                    {photos.map((p) => (
                      <button
                        key={p.captureId}
                        type="button"
                        role="listitem"
                        onClick={() => {
                          setFullView(p);
                          setConfirmDelete(false);
                        }}
                        className="snap-start shrink-0 flex flex-col items-center gap-1 min-w-[64px] min-h-[44px]"
                        aria-label={`View capture from ${shortDate(p.createdAt.slice(0, 10))}`}
                      >
                        <span className="size-16 overflow-hidden rounded-arch block border border-hairline">
                          <img src={p.dataUrl} alt="" className="size-full object-cover" draggable={false} />
                        </span>
                        <span className="text-caption text-ink-3">{shortDate(p.createdAt.slice(0, 10))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* processing hint */}
              {processing && <p className="mt-3 text-caption text-ink-2">Checking light and focus…</p>}

              {/* focus-on-habits toggle (§4 / spec §10.4) */}
              <div className="mt-5 flex items-center gap-3 rounded-tile bg-cream-2 p-3.5">
                <EyeOff size={16} className="shrink-0 text-ink-2" aria-hidden="true" />
                <p className="text-caption text-ink-2 flex-1">
                  Prefer no visual comparison? Hide photos and keep the heatmap.
                </p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  aria-label="Hide photos and focus on habits"
                  onClick={() => setHidden(true)}
                  className="relative h-7 w-[46px] shrink-0 rounded-full bg-card border border-hairline"
                >
                  <span className="absolute top-[3px] start-[3px] size-[22px] rounded-full bg-cream-2 border border-hairline" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Full-view sheet + per-photo delete (§4 / FR-008) */}
      <Sheet open={fullView !== null} onClose={() => setFullView(null)} ariaLabel="Your capture">
        {fullView && (
          <div>
            <img
              src={fullView.dataUrl}
              alt={`Your capture from ${shortDate(fullView.createdAt.slice(0, 10))}`}
              className="w-full rounded-card object-cover"
              style={{ aspectRatio: '4 / 5' }}
            />
            <p className="text-caption text-ink-2 mt-3 text-center">
              {shortDate(fullView.createdAt.slice(0, 10))} · saved on this device only
            </p>
            {!confirmDelete ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-caption text-ink-3 underline underline-offset-2 min-h-[44px] inline-flex items-center"
                >
                  Delete this photo
                </button>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-4">
                <p className="text-caption text-ink-2 text-center">
                  This can't be undone — your photo only exists here.
                </p>
                <LFButton
                  variant="destructive"
                  className="mt-3"
                  onClick={() => {
                    deletePhoto(fullView.captureId);
                    setFullView(null);
                    setConfirmDelete(false);
                  }}
                >
                  Delete permanently
                </LFButton>
                <LFButton variant="ghost" className="mt-1" onClick={() => setConfirmDelete(false)}>
                  Keep it
                </LFButton>
              </motion.div>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}

/* ── Section 5 — Milestones (progress.md §5) ───────────────────────────── */

function MilestonesSection() {
  const { progress, checkIns, photos } = useApp();
  const [expanded, setExpanded] = useState(false);
  const milestones = useMemo(
    () => buildMilestones(progress, checkIns, photos.length, photos[0]?.createdAt),
    [progress, checkIns, photos],
  );
  if (milestones.length === 0) return null;
  const shown = expanded ? milestones : milestones.slice(0, 6);

  return (
    <section>
      <div className="px-5">
        <SectionHeader eyebrow="Moments" title="Milestone journal" />
      </div>
      <div className="px-5">
        <div className="relative ps-5">
          {/* spine (§5 — draws once at 20% viewport) */}
          <motion.span
            className="absolute start-[5px] top-1 bottom-1 w-[1.5px] bg-hairline origin-top"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: EASE }}
            aria-hidden="true"
          />
          <div className="flex flex-col gap-4">
            {shown.map((m, i) => (
              <motion.div
                key={`${m.date}-${m.text}`}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
                className="relative"
              >
                <motion.span
                  className="absolute -start-5 top-[5px] size-[11px] rounded-petal"
                  style={{ backgroundColor: m.tone === 'gold' ? COLORS.gold : COLORS.sage }}
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.1 + i * 0.03 }}
                  aria-hidden="true"
                />
                <p className="text-caption text-ink-3">{shortDate(m.date.slice(0, 10))}</p>
                <p className="text-body text-ink">{m.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
        {milestones.length > 6 && !expanded && (
          <div className="mt-3 flex justify-center">
            <button type="button" onClick={() => setExpanded(true)} className="text-label text-rose min-h-[44px] inline-flex items-center">
              View all
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Empty state (progress.md — brand-new user) ────────────────────────── */

function EmptyIntro() {
  const navigate = useNavigate();
  return (
    <section className="px-5 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="bg-card rounded-card shadow-card p-6 flex flex-col items-center text-center"
      >
        <p className="font-display italic text-quote text-ink">“Every ritual begins with a single quiet minute.”</p>
        <p className="text-caption text-ink-2 mt-2">Your consistency calendar grows here, one gentle day at a time.</p>
        <LFButton className="mt-5" onClick={() => navigate('/program')}>
          Start Day 1
        </LFButton>
      </motion.div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Progress() {
  const { progress } = useApp();
  const brandNew =
    progress.sessions === 0 && progress.completedDays.length === 0 && Object.keys(progress.dailyLog).length === 0;

  return (
    <div className="pb-28">
      <HeroStats brandNew={brandNew} />
      {brandNew ? <EmptyIntro /> : <HeatmapSection />}
      <BadgeShelf />
      <PhotoDiarySection />
      <MilestonesSection />
      <section className="px-5 mt-8">
        <DisclaimerBlock />
      </section>
    </div>
  );
}
