/**
 * Routine — `/routine` (design/routine.md).
 * The AM/PM skincare ritual home — the Tier A core of LumaFace. Product-
 * CATEGORY slots (never brands), correct order logic, personalized cautions
 * from the safety profile, and bite-size "why this order" education.
 *
 * Check-off persistence: every slot checkbox writes today's items via
 * `toggleTodayItem(activityId)` — the same dailyLog the Home hero card
 * mirrors. The three PM rows are phases of ONE activity (Evening Cleanse &
 * Unwind, 90s: remover → cleanse → moisturize), so they share a single
 * check-off: tapping any PM checkbox toggles the evening ritual.
 */

import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Droplets,
  HandHeart,
  LifeBuoy,
  MoonStar,
  Sparkles,
  Sun,
  Sunrise,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { CATEGORY_THEME, COLORS, EASE_OUT_SOFT, SPRING_CHECK } from '@/lib/theme';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import SafetyBox from '@/components/SafetyBox';
import SectionHeader from '@/components/SectionHeader';
import { LFButton } from '@/components/ui';
import { FaceIllo } from '@/components/illos';

const EASE = EASE_OUT_SOFT;
const THEME = CATEGORY_THEME.skincare;

/* ── Slot definitions (product CATEGORIES — never brands) ──────────────── */

interface Slot {
  key: string;
  step: string;
  slotLine: string;
  guidance: string;
  /** activity behind the chevron + checkbox */
  activityId: string;
  illustration: string;
}

const AM_SLOTS: Slot[] = [
  { key: 'am-cleanse', step: 'Gentle cleanse', slotLine: 'A mild, non-stripping cleanser', guidance: 'Lukewarm water, fingertips, 20–30 seconds', activityId: 'am-gentle-cleanse', illustration: 'FaceCleanseAm' },
  { key: 'am-moisturize', step: 'Moisturizer', slotLine: 'A simple, fragrance-free moisturizer', guidance: 'Apply to slightly damp skin', activityId: 'am-moisturizer', illustration: 'FaceMoisturize' },
  { key: 'am-spf', step: 'Sunscreen', slotLine: 'Broad-spectrum SPF 30 or higher', guidance: 'Face, neck and ears — every single morning', activityId: 'daily-sunscreen', illustration: 'FaceSunscreen' },
];

const PM_SLOTS: Slot[] = [
  { key: 'pm-removal', step: 'Makeup removal', slotLine: 'A gentle remover, if you wore makeup or SPF', guidance: 'No rubbing the eye area — press, hold, lift away', activityId: 'pm-cleanse-unwind', illustration: 'FaceCleansePm' },
  { key: 'pm-cleanse', step: 'Gentle cleanse', slotLine: 'Your mild morning cleanser', guidance: 'One cleanse is enough unless makeup was heavy', activityId: 'pm-cleanse-unwind', illustration: 'FaceCleansePm' },
  { key: 'pm-moisturize', step: 'Moisturizer', slotLine: 'Your simple moisturizer', guidance: 'A slightly richer layer is fine at night', activityId: 'pm-cleanse-unwind', illustration: 'FaceMoisturize' },
];

const STRONG_ACTIVES: { id: string; name: string; status: string }[] = [
  { id: 'retinoid', name: 'Retinoid/retinol', status: 'Retinoid · nights only · buffer with moisturizer if it stings' },
  { id: 'acids', name: 'Exfoliating acids (AHA/BHA)', status: 'Acids · 2–3 nights a week · never stacked with another new active' },
  { id: 'benzoyl-peroxide', name: 'Benzoyl peroxide', status: 'Benzoyl peroxide · thin layer · expect some dryness in the first weeks' },
];

const ORDER_EDUCATION: { title: string; body: string }[] = [
  {
    title: 'Cleanse first, always',
    body: "Sunscreen and makeup sit on top of skin; removing them gently lets everything after actually reach you. Lukewarm water protects your barrier — hot water and brushes don't make skin cleaner, just angrier.",
  },
  {
    title: 'Moisturizer on damp skin',
    body: 'Moisturizers seal in water. Applied within a minute of patting dry, they support comfort and reduce visible dryness — established guidance, not magic.',
  },
  {
    title: 'SPF is the last morning step',
    body: "Broad-spectrum SPF 30+ helps protect against UV-related visible aging and pigment changes. It's the strongest evidence in this entire app — two finger-lengths for face and neck.",
  },
];

/* ── Ritual card (shared AM/PM anatomy) ────────────────────────────────── */

function RitualCard({
  icon,
  title,
  minutes,
  bandColor,
  iconColor,
  slots,
  delay,
  children,
}: {
  icon: ReactNode;
  title: string;
  minutes: string;
  bandColor: string;
  iconColor: string;
  slots: Slot[];
  delay: number;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  const { todayDoneIds, toggleTodayItem } = useApp();

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className="mx-5 mt-5 bg-card rounded-[24px] shadow-card overflow-hidden"
      aria-label={title}
    >
      {/* header band */}
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ backgroundColor: bandColor }}>
        <span style={{ color: iconColor }} aria-hidden="true">
          {icon}
        </span>
        <h2 className="font-display text-title flex-1" style={{ color: iconColor }}>
          {title}
        </h2>
        <span className="rounded-full bg-card px-3 py-1 text-label text-ink">{minutes}</span>
      </div>

      {/* slot rows */}
      <div className="px-4 py-2.5">
        {slots.map((slot, i) => {
          const done = todayDoneIds.includes(slot.activityId);
          return (
            <motion.div
              key={slot.key}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: delay + 0.15 + i * 0.06, ease: EASE }}
              className="flex items-center gap-3 py-2.5 min-h-[64px] border-b border-hairline last:border-b-0"
            >
              <span className="size-11 shrink-0 overflow-hidden rounded-arch" style={{ backgroundColor: THEME.hue }} aria-hidden="true">
                <FaceIllo name={slot.illustration} className="size-11" />
              </span>
              <button
                type="button"
                onClick={() => navigate(`/activity/${slot.activityId}`, { state: { origin: '/routine' } })}
                className="min-w-0 flex-1 text-start min-h-[44px]"
                aria-label={`${slot.step} — open activity detail`}
              >
                <span className={cn('block text-body font-bold text-ink', done && 'line-through opacity-60')}>{slot.step}</span>
                <span className="block text-caption text-ink-2">{slot.slotLine}</span>
                <span className="block text-caption text-ink-3 mt-0.5">{slot.guidance}</span>
              </button>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Mark ${slot.step} not done` : `Mark ${slot.step} done`}
                onClick={() => toggleTodayItem(slot.activityId)}
                className={cn(
                  'size-7 shrink-0 rounded-full border-[1.5px] flex items-center justify-center transition-colors',
                  done ? 'border-transparent' : 'border-ink-3',
                )}
                style={done ? { backgroundColor: COLORS.sage } : undefined}
              >
                {done && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_CHECK}>
                    <Check size={15} strokeWidth={3} className="text-white" />
                  </motion.span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/activity/${slot.activityId}`, { state: { origin: '/routine' } })}
                aria-label={`${slot.step} — open activity detail`}
                className="inline-flex size-8 shrink-0 items-center justify-center text-ink-3"
              >
                <ChevronRight size={17} className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {children}
    </motion.section>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Routine() {
  const navigate = useNavigate();
  const { profile, inventory, safetyEval, pro } = useApp();
  const [openEdu, setOpenEdu] = useState<number | null>(0);

  const actives = STRONG_ACTIVES.filter((a) => inventory?.products.includes(a.id));
  const strongCount = actives.length;

  /* personalized AM notes (routine.md §2) */
  const amNotes: { icon: typeof Sun; text: string }[] = [];
  if (profile?.outdoorTime === 'lots') {
    amNotes.push({ icon: Sun, text: "Reapply SPF if you're outdoors for long stretches — your plan reminds you." });
  }
  if (profile?.climate === 'dry') {
    amNotes.push({ icon: Droplets, text: "Dry climate: don't skip moisturizer even if skin feels oily." });
  }
  if (profile?.budgetMode === 'none') {
    amNotes.push({ icon: HandHeart, text: 'No products? Lukewarm water + SPF when you can is a kind baseline.' });
  }

  return (
    <div className="pb-16">
      {/* ── 1 · Header ── */}
      <header className="px-5 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="flex items-center gap-2 flex-wrap"
        >
          <p className="text-eyebrow uppercase" style={{ color: THEME.deep }}>
            Skincare foundation
          </p>
          <EvidenceTierBadge tier="A" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1, ease: EASE }}
          className="font-display text-display-lg text-ink mt-2"
        >
          Your daily <em className="italic">basics</em>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: EASE }}
          className="text-body text-ink-2 mt-1.5 max-w-[36ch]"
        >
          The few steps dermatologists consistently recommend — in the right order, at your pace. Categories, never brands:
          bring whatever products you already love.
        </motion.p>
      </header>

      {/* ── 2 · AM ritual card ── */}
      <RitualCard
        icon={<Sunrise size={20} strokeWidth={1.75} />}
        title="Morning ritual"
        minutes="≈ 2 min"
        bandColor={THEME.tint}
        iconColor={THEME.deep}
        slots={AM_SLOTS}
        delay={0.1}
      >
        {amNotes.length > 0 && (
          <div className="px-4 pb-3.5 flex flex-col gap-1.5">
            {amNotes.map(({ icon: Icon, text }) => (
              <p key={text} className="flex items-start gap-2 text-caption text-ink-2">
                <Icon size={13} strokeWidth={1.75} className="shrink-0 mt-[2px]" style={{ color: THEME.deep }} aria-hidden="true" />
                {text}
              </p>
            ))}
          </div>
        )}
      </RitualCard>

      {/* ── 3 · PM ritual card ── */}
      <RitualCard
        icon={<MoonStar size={20} strokeWidth={1.75} />}
        title="Evening ritual"
        minutes="≈ 2 min"
        bandColor={COLORS.cream2}
        iconColor={COLORS.ink}
        slots={PM_SLOTS}
        delay={0.25}
      />

      {/* ── 4 · Your actives ── */}
      <SectionHeader eyebrow="Your actives" title="Strong ingredients, paced kindly." className="px-5" />
      <div className="px-5 flex flex-col gap-3">
        {strongCount === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="bg-cream-2 rounded-[20px] p-[18px]"
          >
            <p className="text-body text-ink-2">
              You listed no strong actives — a calm shelf. When you're curious, introduce exactly one, slowly.
            </p>
            <div className="flex">
              <LFButton
                variant="ghost"
                fullWidth={false}
                className="mt-2 underline underline-offset-4 -ms-2"
                onClick={() => navigate('/activity/one-active-intro', { state: { origin: '/routine' } })}
              >
                Learn about one-active introduction
              </LFButton>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="bg-card rounded-card shadow-card p-[18px] flex flex-col gap-3"
          >
            {actives.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-body font-bold text-ink">{a.name}</p>
                  <p className="text-caption text-ink-2 mt-0.5">{a.status}</p>
                </div>
                <EvidenceTierBadge tier="A" mini interactive={false} className="mt-0.5" />
              </div>
            ))}
          </motion.div>
        )}

        {/* rule-driven caution cards */}
        {safetyEval.pregnancyRetinoidExcluded && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
            <SafetyBox
              title="A pause worth taking"
              items={[
                "Retinoids aren't recommended while pregnant or trying. We've paused retinoid education in your plan — please confirm alternatives with your clinician.",
              ]}
            >
              <button
                type="button"
                onClick={() => navigate('/help')}
                className="mt-3.5 w-full flex items-center gap-2.5 rounded-tile bg-cream-2 px-3.5 py-3 min-h-[44px] text-start"
              >
                <LifeBuoy size={16} className="shrink-0 text-ink-2" aria-hidden="true" />
                <span className="text-[13px] font-medium text-ink flex-1">When to pause and see a professional — always in Help</span>
                <ChevronRight size={15} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </SafetyBox>
          </motion.div>
        )}
        {strongCount >= 2 && (
          <SafetyBox
            title="One at a time wins"
            items={[
              'Using several strong actives together raises irritation risk without raising results. Your plan introduces them separately — never on the same new night.',
            ]}
          />
        )}
        {safetyEval.contraindicationCodes.includes('SAFE-IRR-01') && (
          <SafetyBox
            title="Barrier-reset mode"
            items={["Actives are paused until your skin settles. Cleanse, moisturize, SPF — that's the whole routine for now."]}
          />
        )}

        {/* PRO education: free users see the teaser; PRO users the schedule */}
        {pro.active && strongCount > 0 ? (
          <div className="bg-card rounded-card shadow-card p-[18px]">
            <p className="text-eyebrow uppercase text-ink-2">Paced introduction</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {['Week 1: 2 nights', 'Week 2: 3 nights', 'Weeks 3–4: build toward label frequency'].map((chip) => (
                <span key={chip} className="rounded-full bg-cream-2 px-3 py-1.5 text-caption text-ink">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-caption text-ink-2 mt-2.5">One active at a time, patch-tested — your plan paces the rest.</p>
          </div>
        ) : !pro.active ? (
          <motion.button
            type="button"
            onClick={() => navigate('/paywall')}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="w-full bg-card rounded-card shadow-card p-[18px] border-t-[3px] border-violet text-start"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet shrink-0" aria-hidden="true" />
              <span className="text-body font-bold text-ink">Ingredient know-how, with PRO</span>
            </span>
            <span className="block text-caption text-ink-2 mt-1.5">
              Ingredient compatibility, paced introduction calendars, and climate/budget adjustments are part of PRO.
            </span>
          </motion.button>
        ) : null}
      </div>

      {/* ── 5 · Why this order ── */}
      <SectionHeader eyebrow="Small science" title="Why this order works." className="px-5" />
      <div className="px-5 flex flex-col gap-2.5">
        {ORDER_EDUCATION.map((edu, i) => {
          const open = openEdu === i;
          return (
            <motion.div
              key={edu.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
              className="bg-card rounded-[18px] shadow-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenEdu(open ? null : i)}
                aria-expanded={open}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 min-h-[52px] text-start"
              >
                <span className="text-body font-bold text-ink">{edu.title}</span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 text-ink-3">
                  <ChevronDown size={17} aria-hidden="true" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <p className="text-[14px] leading-[22px] text-ink-2">{edu.body}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <EvidenceTierBadge tier="A" interactive={false} />
                        <span className="text-caption text-ink-3">Source: dermatologist-recommended guidance (AAD)</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ── 6 · Footer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
        className="px-5 mt-8"
      >
        <DisclaimerBlock />
        <div className="h-8" aria-hidden="true" />
      </motion.div>
    </div>
  );
}
