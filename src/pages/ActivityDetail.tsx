/**
 * Activity Detail — `/activity/:id` (activity.md State A).
 * Learn + safety: illustration hero in the category arch, preparation,
 * numbered steps with breathing cue, SafetyBox (contraindications + stop
 * conditions), EvidenceTierBadge + honest expected outcome, DisclaimerBlock,
 * and the sticky Begin CTA.
 *
 * Gating order (safety beats everything):
 *   1. safety-excluded (safetyEval.excludedActivityIds) → kind "resting this
 *      one for now" state + why + referral link when applicable. Never
 *      startable. Session route redirects here too.
 *   2. PRO-locked (free user) → full education stays readable, CTA becomes
 *      "Unlock with PRO" → /paywall.
 *
 * Navigation contract: reads `location.state.origin` (return path, default
 * '/library') and threads it into the session route state.
 */

import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  Check,
  ChevronLeft,
  HeartHandshake,
  Package,
  Repeat,
  Sparkles,
  Timer,
  Wind,
} from 'lucide-react';
import { useApp } from '@/lib/store';
import { CATEGORY_THEME, COLORS, EASE_OUT_SOFT, EASE_SIGNATURE, formatMinutes } from '@/lib/theme';
import { SKINCARE_BASICS_IDS, getActivity } from '@/data/activities';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import SafetyBox from '@/components/SafetyBox';
import SectionHeader from '@/components/SectionHeader';
import { LFButton, PetalBlob } from '@/components/ui';
import { FaceIllo, MarkPetal } from '@/components/illos';
import FramePortal from '@/pages/activity/FramePortal';
import { TIER_FRAMING, contraindicationRows, honestOneLiner } from '@/pages/activity/copy';

const EASE = EASE_OUT_SOFT;

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const { isActivityLocked, safetyEval, todayDoneIds, toggleTodayItem } = useApp();

  const activity = id ? getActivity(id) : undefined;
  const origin = (location.state as { origin?: string } | null)?.origin ?? '/library';

  /* top of screen on enter (the phone column keeps scroll between routes) */
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('[data-lf-scroll]');
    if (!scroller) return;
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top: 0, behavior: 'auto' });
    else scroller.scrollTop = 0; // jsdom fallback
  }, [id]);

  const excluded = useMemo(
    () => (activity ? safetyEval.excludedActivityIds.includes(activity.activityId) : false),
    [activity, safetyEval],
  );

  /* why is it resting? match fired warnings to this activity's rule codes;
     SAFE-FACE-01 excludes whole categories, so fall back to the driving warning */
  const exclusionReasons = useMemo(() => {
    if (!activity || !excluded) return [];
    const matched = safetyEval.warnings.filter((w) => activity.contraindicationCodes.includes(w.code));
    return (matched.length > 0 ? matched : safetyEval.warnings.slice(0, 1)).map((w) => w.message);
  }, [activity, excluded, safetyEval]);

  const exclusionReferral = useMemo(() => {
    if (!activity || !excluded) return undefined;
    return (
      safetyEval.referrals.find((r) => activity.contraindicationCodes.includes(r.code)) ?? safetyEval.referrals[0]
    );
  }, [activity, excluded, safetyEval]);

  /* ── Unknown activity id ── */
  if (!activity) {
    return (
      <div className="px-5 pt-16 pb-10 flex flex-col items-center text-center min-h-[70dvh]">
        <MarkPetal className="size-10 opacity-60" />
        <h1 className="font-display text-display-md text-ink mt-5">This activity wandered off</h1>
        <p className="text-body text-ink-2 mt-3 max-w-[32ch]">
          We couldn't find that activity — the library always has a quiet moment waiting.
        </p>
        <LFButton variant="secondary" className="mt-6" onClick={() => navigate('/library')}>
          Browse the library
        </LFButton>
      </div>
    );
  }

  const theme = CATEGORY_THEME[activity.category];
  const locked = isActivityLocked(activity.activityId);
  const doneToday = todayDoneIds.includes(activity.activityId);
  const isSkincareSlot = (SKINCARE_BASICS_IDS as readonly string[]).includes(activity.activityId);
  const contraRows = contraindicationRows(activity.contraindicationCodes);

  const metaChips = [
    { icon: Timer, label: formatMinutes(activity.durationSeconds) },
    { icon: Repeat, label: activity.frequency },
    { icon: ActivityIcon, label: activity.difficulty },
    { icon: Package, label: activity.equipment },
  ];

  return (
    <motion.div
      initial={{ backgroundColor: COLORS.cream }}
      animate={{ backgroundColor: theme.tint }}
      transition={{ duration: 0.7, ease: EASE_SIGNATURE }}
      className="min-h-full"
    >
      {/* ── A1 · Hero ── */}
      <div className="relative px-5 pt-3 pb-16">
        {/* overlay top bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <button
            type="button"
            onClick={() => navigate(origin)}
            aria-label="Back"
            className="inline-flex size-11 items-center justify-center rounded-full bg-white/80 backdrop-blur-[8px] text-ink shadow-card"
          >
            <ChevronLeft size={20} strokeWidth={1.75} className="rtl:-scale-x-100" aria-hidden="true" />
          </button>
          {locked ? (
            <button
              type="button"
              onClick={() => navigate('/paywall')}
              className="h-9 rounded-full bg-violet-tint px-3.5 flex items-center gap-1.5 text-label text-violet"
              aria-label="PRO activity — see PRO plans"
            >
              <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
              PRO
            </button>
          ) : (
            <span className="h-9 rounded-full bg-white/80 backdrop-blur-[8px] px-3.5 inline-flex items-center gap-1.5 text-label text-ink shadow-card">
              <Timer size={14} strokeWidth={1.75} style={{ color: theme.deep }} aria-hidden="true" />
              {formatMinutes(activity.durationSeconds)}
            </span>
          )}
        </motion.div>

        {/* illustration in the large arch mask + drifting petal blob */}
        <div className="relative mt-4 flex justify-center">
          {!reduceMotion && (
            <motion.span
              className="absolute rounded-petal"
              style={{ width: 220, height: 220, backgroundColor: theme.hue, opacity: 0.5, top: -12 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }}
              aria-hidden="true"
            />
          )}
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.94, y: 20, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative w-[240px] overflow-hidden rounded-arch-lg shadow-card"
            style={{ backgroundColor: theme.hue }}
          >
            <FaceIllo name={activity.media.illustration} className="w-[240px] h-[240px] block" />
          </motion.div>
        </div>
      </div>

      {/* ── A2 · Title block (overlaps hero) ── */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
        className="relative -mt-10 rounded-t-[28px] bg-card px-5 pt-6 pb-40"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-eyebrow uppercase" style={{ color: theme.deep }}>
            {theme.name}
          </p>
          <EvidenceTierBadge tier={activity.evidenceTier} />
        </div>
        <h1 className="font-display text-display-lg text-ink mt-2">{activity.title}</h1>
        <p className="font-display italic text-quote text-ink-2 mt-1.5">{honestOneLiner(activity.expectedOutcome)}</p>

        {/* meta chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {metaChips.map(({ icon: Icon, label }, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.05, ease: EASE }}
              className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3 h-8 text-caption text-ink-2"
            >
              <Icon size={13} strokeWidth={1.75} style={{ color: theme.deep }} aria-hidden="true" />
              {label}
            </motion.span>
          ))}
        </div>

        {/* ── Excluded state (safety beats everything) ── */}
        {excluded && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="mt-6"
          >
            <div className="bg-cream-2 rounded-[20px] p-[18px]">
              <div className="flex items-center gap-3">
                <PetalBlob className="size-10 shrink-0" style={{ backgroundColor: COLORS.card, color: COLORS.ink2 }}>
                  <HeartHandshake size={20} strokeWidth={1.75} />
                </PetalBlob>
                <p className="text-body font-bold text-ink">Resting this one for now</p>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {exclusionReasons.map((msg, i) => (
                  <p key={i} className="text-[13px] leading-[19px] text-ink-2">
                    {msg}
                  </p>
                ))}
                <p className="text-[13px] leading-[19px] text-ink-2">
                  Nothing is wrong with you — this is your safety profile doing its job. It comes back the moment it's right for you.
                </p>
              </div>
              <LFButton variant="secondary" className="mt-4" onClick={() => navigate('/library')}>
                Find a gentler moment
              </LFButton>
            </div>
            {exclusionReferral && (
              <div className="mt-3">
                <SafetyBox.Urgent items={[exclusionReferral.message]} />
              </div>
            )}
          </motion.div>
        )}

        {/* ── A3 · Preparation ── */}
        <SectionHeader eyebrow="Before you begin" />
        <div className="flex flex-col gap-2.5">
          {activity.preparation.map((prep, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
              className="flex items-start gap-2.5"
            >
              <Check size={14} strokeWidth={2.25} className="shrink-0 mt-[4px]" style={{ color: theme.deep }} aria-hidden="true" />
              <p className="text-[14px] leading-[21px] text-ink">{prep}</p>
            </motion.div>
          ))}
        </div>

        {/* ── A3 · Steps ── */}
        <SectionHeader eyebrow="How to practice" />
        <div className="relative">
          {/* connecting dashed line through the circle centers */}
          <motion.span
            initial={reduceMotion ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute start-[17px] top-4 bottom-4 w-0 origin-top border-s-[1.5px] border-dashed"
            style={{ borderColor: `${theme.deep}40` }}
            aria-hidden="true"
          />
          <ol className="relative flex flex-col gap-4">
            {activity.steps.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
                className="flex items-start gap-3"
              >
                <span
                  className="relative z-10 inline-flex size-[34px] shrink-0 items-center justify-center rounded-full font-display font-semibold text-[15px] text-white"
                  style={{ backgroundColor: theme.deep }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="text-body text-ink pt-[5px]">{step}</p>
              </motion.li>
            ))}
          </ol>
          {/* breathing cue chip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, delay: activity.steps.length * 0.08 + 0.1 }}
            className="mt-4 ps-[46px]"
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-label"
              style={{ color: theme.deep, backgroundColor: theme.tint }}
            >
              <Wind size={14} strokeWidth={1.75} aria-hidden="true" />
              {activity.breathingCue}
            </span>
          </motion.div>
        </div>

        {/* ── A4 · Safety & honest outcome ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-8"
        >
          {(() => {
            const realStops = activity.stopConditions.filter((s) => !/^none/i.test(s));
            if (contraRows.length > 0) {
              return <SafetyBox title="Skip this if…" items={contraRows} stopItems={realStops.length > 0 ? realStops : undefined} />;
            }
            return (
              <SafetyBox
                title="Nothing to skip for"
                items={[
                  realStops.length > 0
                    ? 'This is one of the gentlest items in the library — nothing to skip for.'
                    : 'This is the gentlest item in the library — nothing to skip for.',
                ]}
                stopItems={realStops.length > 0 ? realStops : undefined}
              />
            );
          })()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          className="mt-4 rounded-[20px] p-[18px]"
          style={{ backgroundColor: theme.tint }}
        >
          <div className="flex items-center gap-2">
            <EvidenceTierBadge tier={activity.evidenceTier} interactive={false} />
            <p className="text-eyebrow uppercase" style={{ color: theme.deep }}>
              What to expect, honestly
            </p>
          </div>
          <p className="text-body font-bold text-ink mt-2.5">{activity.expectedOutcome}</p>
          <p className="text-caption text-ink-2 mt-2">{TIER_FRAMING[activity.evidenceTier]}</p>
          <p className="text-caption text-ink-3 mt-2.5">
            Reviewed by {activity.expertReviewer} · {activity.expertCredential}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
        >
          <DisclaimerBlock className="mt-4" />
        </motion.div>
      </motion.div>

      {/* ── A5 · Sticky bottom CTA (above the 76px tab bar) ── */}
      {!excluded && (
        <FramePortal>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
            className="pointer-events-none absolute inset-x-0 z-40 px-5 pt-8"
            style={{
              bottom: 'calc(76px + env(safe-area-inset-bottom))',
              background: `linear-gradient(to top, ${theme.tint} 55%, transparent)`,
            }}
          >
            <div className="pointer-events-auto pb-3">
              {locked ? (
                <LFButton onClick={() => navigate('/paywall')} aria-label="Unlock with PRO — see PRO plans">
                  <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
                  Unlock with PRO
                </LFButton>
              ) : isSkincareSlot ? (
                <>
                  <LFButton
                    variant="tinted"
                    tintColor={theme.deep}
                    onClick={() => toggleTodayItem(activity.activityId)}
                    aria-pressed={doneToday}
                  >
                    {doneToday ? (
                      <>
                        <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                        Done today — tap to undo
                      </>
                    ) : (
                      'Mark as done'
                    )}
                  </LFButton>
                  <div className="flex justify-center">
                    <LFButton
                      variant="ghost"
                      fullWidth={false}
                      className="mt-1 underline underline-offset-4"
                      onClick={() => navigate(`/activity/${activity.activityId}/session`, { state: { origin } })}
                    >
                      Guide me anyway
                    </LFButton>
                  </div>
                </>
              ) : (
                <LFButton
                  variant="tinted"
                  tintColor={theme.deep}
                  onClick={() => navigate(`/activity/${activity.activityId}/session`, { state: { origin } })}
                >
                  {doneToday ? 'Practice again' : 'Start guided session'} · {formatMinutes(activity.durationSeconds)}
                </LFButton>
              )}
            </div>
          </motion.div>
        </FramePortal>
      )}
      {excluded && <div className="pb-10" />}
    </motion.div>
  );
}
