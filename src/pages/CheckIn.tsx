/**
 * Weekly Check-in — `/checkin` (design/checkin.md).
 * The adaptive heart of LumaFace: comfort → irritation (safety gate,
 * SAFE-IRR-01 barrier-reset branch) → adherence → optional consent-gated
 * comparable photo → "Your week, adjusted" summary where the visible
 * PlanDiff is the reward. Immersive flow (no tab bars), Rose Petal accents.
 * The check-in itself is always free — it is a safety feature.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarCheck,
  Camera,
  Check,
  ClipboardCheck,
  Cloud,
  CloudRain,
  Droplets,
  FolderLock,
  Hand,
  Image,
  Info,
  LifeBuoy,
  Pause,
  Sparkles,
  Sun,
  Waves,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp, type Capture } from '@/lib/store';
import { COLORS, EASE_OUT_SOFT, EASE_SIGNATURE, RESERVED_TINTS, SPRING_CHECK } from '@/lib/theme';
import type { PlanDiff } from '@/lib/plan';
import PetalConfetti from '@/components/PetalConfetti';
import PlanDiffCard from '@/components/PlanDiffCard';
import SafetyBox from '@/components/SafetyBox';
import Sheet from '@/components/Sheet';
import { LFButton } from '@/components/ui';
import { checkInDayFor } from '@/pages/program/checkInState';
import { capturesComparable, processPhotoFile } from '@/pages/progress/photo';
import QualityChips from '@/pages/progress/QualityChips';

const EASE = EASE_OUT_SOFT;
const DEEP = RESERVED_TINTS.rosePetal.deep;
const TINT = RESERVED_TINTS.rosePetal.tint;
const HUE = RESERVED_TINTS.rosePetal.hue;

/** Answers draft — kept on-device so leaving early never loses them (checkin.md). */
const DRAFT_KEY = 'lf_checkin_draft';

interface Draft {
  day: number;
  step: number;
  comfort: 1 | 2 | 3 | null;
  irritation: boolean | null;
  adherence: 'all' | 'most' | 'some' | 'few' | null;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

/* ── Step transition wrapper (checkin.md — onboarding language) ────────── */

function StepView({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.28, ease: EASE_SIGNATURE } }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ── Step 0 — Comfort (checkin.md §0, ComfortPrompt patterns) ──────────── */

const COMFORT_OPTIONS = [
  { rating: 1 as const, icon: Sun, label: 'Comfortable', sub: 'Easy, pleasant, sometimes I forgot I was doing it' },
  { rating: 2 as const, icon: Cloud, label: 'Mostly good', sub: 'A few moments felt like effort' },
  { rating: 3 as const, icon: CloudRain, label: 'Uncomfortable', sub: 'Something stung, pulled, or felt wrong' },
];

function ComfortStep({ value, onSelect }: { value: 1 | 2 | 3 | null; onSelect: (r: 1 | 2 | 3) => void }) {
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="font-display text-display-md text-ink">
        How did your skin <em className="italic">feel</em> this week?
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: EASE }} className="text-body text-ink-2 mt-2">
        Overall — not just today. There are no wrong answers; honest ones make your plan better.
      </motion.p>
      <div className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Comfort this week">
        {COMFORT_OPTIONS.map(({ rating, icon: Icon, label, sub }, i) => {
          const selected = value === rating;
          return (
            <motion.button
              key={rating}
              type="button"
              role="radio"
              aria-checked={selected}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: EASE }}
              onClick={() => onSelect(rating)}
              className={cn(
                'relative w-full rounded-[18px] border p-4 flex items-center gap-4 text-start min-h-[76px] transition-colors',
                selected ? 'border-[1.5px]' : 'border-hairline bg-card',
              )}
              style={selected ? { borderColor: DEEP, backgroundColor: TINT } : undefined}
            >
              <span
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-petal"
                style={{ backgroundColor: selected ? HUE + '55' : COLORS.cream2, color: selected ? DEEP : COLORS.ink2 }}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-bold text-ink">{label}</span>
                <span className="block text-caption text-ink-2 mt-0.5">{sub}</span>
              </span>
              {selected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={SPRING_CHECK}
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: DEEP, color: '#fff' }}
                  aria-hidden="true"
                >
                  <Check size={12} strokeWidth={3} />
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 1 — Irritation safety gate (checkin.md §1) ───────────────────── */

function IrritationStep({
  value,
  onSelect,
  onContinue,
}: {
  value: boolean | null;
  onSelect: (v: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="font-display text-display-md text-ink">
        Any <em className="italic">stinging</em>, burning, or lasting redness?
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: EASE }} className="text-body text-ink-2 mt-2">
        A quick safety question — this one changes your plan immediately.
      </motion.p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { v: false, icon: Check, label: 'No, all good', color: COLORS.sageDeep, bg: COLORS.sage + '1E' },
          { v: true, icon: Hand, label: 'Yes, something', color: COLORS.ink, bg: COLORS.cream2 },
        ].map(({ v, icon: Icon, label, color, bg }, i) => {
          const selected = value === v;
          return (
            <motion.button
              key={label}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.12 + i * 0.06, ease: EASE }}
              onClick={() => onSelect(v)}
              aria-pressed={selected}
              className={cn(
                'h-[120px] rounded-[18px] border flex flex-col items-center justify-center gap-2 transition-colors',
                selected ? 'border-[1.5px]' : 'border-hairline bg-card',
              )}
              style={selected ? { borderColor: DEEP, backgroundColor: TINT } : undefined}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full" style={{ backgroundColor: bg, color }} aria-hidden="true">
                <Icon size={19} strokeWidth={1.75} />
              </span>
              <span className="text-label text-ink">{label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {value === false && (
          <motion.p
            key="no"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="text-caption text-ink-2 overflow-hidden"
          >
            <span className="block pt-3">Good — plan stays its gentle course.</span>
          </motion.p>
        )}

        {value === true && (
          /* Barrier-reset branch — rule SAFE-IRR-01 (checkin.md §1) */
          <motion.div
            key="yes"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <SafetyBox title="Your skin is asking for a quieter week." items={[]}>
                <p className="text-[13px] leading-[19px] text-ink-2 mt-3">
                  That's normal, and it's useful information — not a setback. Here's what we'll do together:
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {[
                    { icon: Pause, text: 'Strong actives pause (if any were in your routine)' },
                    { icon: Waves, text: 'Massage and movement step back to pure relaxation' },
                    { icon: Droplets, text: 'Cleanse, moisturize, SPF — the calm trio carries your week' },
                  ].map(({ icon: Icon, text }, i) => (
                    <motion.div
                      key={text}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: EASE }}
                      className="flex items-center gap-3"
                    >
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
                        <Icon size={15} strokeWidth={1.75} />
                      </span>
                      <span className="text-[13px] leading-[19px] text-ink">{text}</span>
                    </motion.div>
                  ))}
                </div>
              </SafetyBox>
              <p className="mt-3 flex items-start gap-2 text-caption text-ink-2">
                <LifeBuoy size={14} className="shrink-0 mt-[1px]" aria-hidden="true" />
                If symptoms persist beyond a week, feel severe, or worry you — please see a qualified professional.
                Guidance is always in Help.
              </p>
              <LFButton className="mt-4" onClick={onContinue}>
                Adjust my plan
              </LFButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Step 2 — Adherence (checkin.md §2) ────────────────────────────────── */

const ADHERENCE_OPTIONS = [
  { id: 'all' as const, label: 'Every day', response: 'Beautifully steady.' },
  { id: 'most' as const, label: 'Most days', response: "That's a real habit forming." },
  { id: 'some' as const, label: 'Some days', response: "Completely normal — we'll lighten the load." },
  { id: 'few' as const, label: 'Barely', response: "Thank you for saying so. Let's make next week smaller, not harder." },
];

function AdherenceStep({
  value,
  week,
  onSelect,
  onContinue,
}: {
  value: 'all' | 'most' | 'some' | 'few' | null;
  week: number;
  onSelect: (v: 'all' | 'most' | 'some' | 'few') => void;
  onContinue: () => void;
}) {
  const light = value === 'some' || value === 'few';
  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="font-display text-display-md text-ink">
        How did the ritual <em className="italic">fit</em> your week?
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: EASE }} className="text-body text-ink-2 mt-2">
        Be honest — "barely" is data, not failure.
      </motion.p>

      <div className="mt-6 flex flex-col gap-2.5" role="radiogroup" aria-label="How the ritual fit your week">
        {ADHERENCE_OPTIONS.map(({ id, label, response }, i) => {
          const selected = value === id;
          return (
            <motion.div key={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 + i * 0.05, ease: EASE }}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(id)}
                className={cn(
                  'w-full h-11 rounded-full text-label transition-colors px-4 text-center',
                  selected ? 'bg-ink text-cream' : 'border border-hairline text-ink-2 bg-transparent',
                )}
              >
                {label}
              </button>
              {selected && <p className="text-caption text-ink-2 text-center pt-1.5">{response}</p>}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {value && (
          <motion.div
            key="response"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-tile bg-cream-2 p-4">
              <p className="text-[13px] leading-[19px] text-ink">
                {light
                  ? "We'll trim next week toward your 3-minute essentials. A ritual you keep beats a routine you quit."
                  : `Week ${Math.min(week + 1, 4)} keeps its shape, with one small new moment.`}
              </p>
            </div>
            <LFButton className="mt-4" onClick={onContinue}>
              Continue
            </LFButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Step 3 — Optional comparable photo (checkin.md §3) ────────────────── */

const CAPTURE_CHECKLIST = [
  'Same window light as last time',
  'Device at eye level, arm’s length',
  'Relaxed, neutral face — hair away',
  'No beauty filter',
];

function PhotoStep({ onSkip, onSaved }: { onSkip: () => void; onSaved: (captureId: string) => void }) {
  const { consents, setConsent, photos, pro, addPhoto } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [saved, setSaved] = useState<Capture | null>(null);
  const [comparable, setComparable] = useState(true);

  const consentOn = consents.photoSave;
  // §11.1 — one baseline capture is free; weekly history is a PRO kindness.
  const historyLocked = !pro.active && photos.length >= 1;
  const baseline = photos[0];

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      const { dataUrl, quality } = await processPhotoFile(file);
      const capture = addPhoto(dataUrl, quality);
      setSaved(capture);
      setComparable(baseline ? capturesComparable(baseline, capture) : true);
    } catch {
      // unreadable file — stay on the capture card, no copy shames the user
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="font-display text-display-md text-ink">
        A <em className="italic">same-conditions</em> photo, if you'd like.
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.06, ease: EASE }} className="text-body text-ink-2 mt-2">
        Weekly captures under matched light are the only fair way to compare — and they're completely optional.
        Habits count even with zero photos.
      </motion.p>

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

      {!consentOn ? (
        /* Consent off — ConsentToggle-style explainer (§3) */
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }} className="mt-6 bg-card rounded-card shadow-card p-5">
          <span className="inline-flex size-11 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
            <FolderLock size={20} strokeWidth={1.75} />
          </span>
          <p className="text-body font-bold text-ink mt-3">On-device photos, only if you want them</p>
          <p className="text-caption text-ink-2 mt-1.5">
            Progress photos save only on this device, and you can delete any of them, anytime.
          </p>
          <LFButton className="mt-4" onClick={() => setConsent('photoSave', true)}>
            Allow on-device photos
          </LFButton>
          <LFButton variant="ghost" className="mt-1" onClick={onSkip}>
            Skip — habits are enough
          </LFButton>
        </motion.div>
      ) : historyLocked && !saved ? (
        /* Free tier — baseline already used (spec §11.1) */
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }} className="mt-6 bg-card rounded-card shadow-card p-5 text-center">
          <span className="mx-auto inline-flex size-11 items-center justify-center rounded-full bg-violet-tint text-violet" aria-hidden="true">
            <Sparkles size={20} strokeWidth={1.75} />
          </span>
          <p className="text-body font-bold text-ink mt-3">Your baseline is safe on this device</p>
          <p className="text-caption text-ink-2 mt-1.5">
            Weekly same-conditions captures are a PRO kindness. Skipping changes nothing about your plan.
          </p>
          <LFButton className="mt-4" onClick={() => navigate('/paywall')}>
            Unlock weekly captures
          </LFButton>
          <LFButton variant="ghost" className="mt-1" onClick={onSkip}>
            Skip — habits are enough
          </LFButton>
        </motion.div>
      ) : saved ? (
        /* Saved — quality chips + comparability honesty (§3) */
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }} className="mt-6 bg-card rounded-card shadow-card p-5">
          <div className="flex items-start gap-4">
            <img
              src={saved.dataUrl}
              alt="Your capture, saved on this device only"
              className="w-20 h-24 object-cover rounded-arch border border-hairline"
            />
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: COLORS.sageDeep }}>
                <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                Saved to this device only
              </p>
              <QualityChips quality={saved.qualityMetrics} className="mt-2.5" />
            </div>
          </div>
          {!comparable && (
            <p className="mt-3.5 rounded-tile bg-cream-2 p-3 text-caption text-ink-2">
              This one's lighting differs from your baseline — we've saved it, but won't use it for side-by-side
              comparison.
            </p>
          )}
          <LFButton className="mt-4" onClick={() => onSaved(saved.captureId)}>
            Continue
          </LFButton>
        </motion.div>
      ) : (
        /* Capture card (§3) */
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE }} className="mt-6 bg-card rounded-card shadow-card p-5">
          <div className="mx-auto w-40 aspect-[4/5] rounded-arch border-2 border-dashed border-ink-3 flex flex-col items-center justify-center gap-2 text-ink-3">
            <Camera size={26} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-caption">{processing ? 'Checking light…' : 'This week’s capture'}</span>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {CAPTURE_CHECKLIST.map((row, i) => (
              <motion.p
                key={row}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + i * 0.06, ease: EASE }}
                className="flex items-center gap-2.5 text-caption text-ink-2"
              >
                <span className="inline-flex size-4 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.sage + '1E', color: COLORS.sageDeep }} aria-hidden="true">
                  <Check size={10} strokeWidth={3} />
                </span>
                {row}
              </motion.p>
            ))}
          </div>
          <LFButton className="mt-4" disabled={processing} onClick={() => fileRef.current?.click()}>
            Take this week's photo
          </LFButton>
          <LFButton variant="ghost" className="mt-1" onClick={onSkip}>
            Skip — habits are enough
          </LFButton>
        </motion.div>
      )}
    </div>
  );
}

/* ── Step 4 — "Your week, adjusted" (checkin.md §4 — the reward) ───────── */

function SummaryStep({
  week,
  comfort,
  adherence,
  photoSaved,
  diff,
  isPro,
}: {
  week: number;
  comfort: 1 | 2 | 3;
  adherence: 'all' | 'most' | 'some' | 'few';
  photoSaved: boolean;
  diff: PlanDiff;
  isPro: boolean;
}) {
  const navigate = useNavigate();
  const [petals, setPetals] = useState(true);
  const comfortOpt = COMFORT_OPTIONS.find((o) => o.rating === comfort) ?? COMFORT_OPTIONS[0];
  const adherenceOpt = ADHERENCE_OPTIONS.find((o) => o.id === adherence) ?? ADHERENCE_OPTIONS[0];
  const ComfortIcon = comfortOpt.icon;

  const rows = [
    { icon: ComfortIcon, label: comfortOpt.label },
    { icon: CalendarCheck, label: adherenceOpt.label },
    { icon: Image, label: photoSaved ? 'Photo saved on device' : 'Photo skipped — all good' },
  ];

  return (
    <div className="relative">
      <PetalConfetti active={petals} count={8} accentColor={HUE} onDone={() => setPetals(false)} />

      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="text-eyebrow uppercase" style={{ color: DEEP }}>
        Check-in complete · Week {week}
      </motion.p>
      <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }} className="font-display text-display-lg text-ink mt-1.5">
        Your week, <em className="italic">adjusted</em>.
      </motion.h1>

      {/* Reflection card (§4.3) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }} className="mt-5 bg-card rounded-card shadow-card p-[18px]">
        {rows.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 + i * 0.06, ease: EASE }}
            className={cn('flex items-center gap-3 py-2', i > 0 && 'border-t border-hairline')}
          >
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: TINT, color: DEEP }} aria-hidden="true">
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <span className="text-label text-ink">{label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* PlanDiffCard — the visible reward (§4.4 + §6.10 morph) */}
      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease: EASE }}>
        <PlanDiffCard diff={diff} className="mt-4" />
        {!isPro && (diff.paused.length > 0 || diff.added.length > 0) && (
          <p className="text-caption text-ink-2 mt-2 px-1">
            Your adjusted days beyond Day 3 unlock with PRO — the changes above are yours to see either way.
          </p>
        )}
      </motion.div>

      {/* Footer honesty line (§4.5) */}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.55 }} className="mt-4 flex items-start gap-2 text-caption text-ink-2">
        <Info size={14} className="shrink-0 mt-[1px]" aria-hidden="true" />
        Changes come only from your answers and your safety profile — never from appearance analysis.
      </motion.p>

      {/* CTA stack (§4.6) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7, ease: EASE }} className="mt-6">
        <LFButton onClick={() => navigate('/program')}>
          {week < 4 ? `See Week ${week + 1}` : 'See your program'}
        </LFButton>
        <LFButton variant="ghost" className="mt-1" onClick={() => navigate('/')}>
          Back to today
        </LFButton>
      </motion.div>
    </div>
  );
}

/* ── Flow shell ────────────────────────────────────────────────────────── */

export default function CheckIn() {
  const app = useApp();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  // Frozen at flow start — after saveCheckIn the record exists, so a live
  // lookup would skip ahead to the NEXT check-in day and mislabel the summary.
  const [day] = useState(() => checkInDayFor(app.checkIns, app.currentDay));
  const week = Math.min(Math.ceil(day / 7), 4);

  // Restore a kept draft (checkin.md — "answers so far are kept")
  const [initial] = useState<Draft | null>(() => {
    const d = loadDraft();
    return d && d.day === day ? d : null;
  });
  const [step, setStep] = useState(() => Math.min(initial?.step ?? 0, 3));
  const [comfort, setComfort] = useState<1 | 2 | 3 | null>(initial?.comfort ?? null);
  const [irritation, setIrritation] = useState<boolean | null>(initial?.irritation ?? null);
  const [adherence, setAdherence] = useState<'all' | 'most' | 'some' | 'few' | null>(initial?.adherence ?? null);
  const [diff, setDiff] = useState<PlanDiff | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const savedRef = useRef(false);

  // Keep the draft while the flow is unfinished.
  useEffect(() => {
    if (step >= 4) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ day, step, comfort, irritation, adherence } satisfies Draft));
    } catch {
      /* storage full — the flow still works in memory */
    }
  }, [day, step, comfort, irritation, adherence]);

  const finish = (captureId?: string) => {
    if (savedRef.current) return;
    savedRef.current = true;
    const d = app.saveCheckIn({
      day,
      comfortRating: comfort ?? 2,
      irritationFlag: irritation ?? false,
      adherenceSelfReport: adherence ?? 'most',
      optionalCaptureId: captureId,
    });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDiff(d);
    setPhotoSaved(!!captureId);
    setStep(4);
  };

  const stepContent = [
    <ComfortStep
      key="s0"
      value={comfort}
      onSelect={(r) => {
        setComfort(r);
        window.setTimeout(() => setStep(1), 350); // §0 auto-advance
      }}
    />,
    <IrritationStep
      key="s1"
      value={irritation}
      onSelect={(v) => {
        setIrritation(v);
        if (!v) window.setTimeout(() => setStep(2), 650); // §1 "No" soft-continues
      }}
      onContinue={() => setStep(2)}
    />,
    <AdherenceStep key="s2" value={adherence} week={week} onSelect={setAdherence} onContinue={() => setStep(3)} />,
    <PhotoStep key="s3" onSkip={() => finish()} onSaved={(id) => finish(id)} />,
  ];

  return (
    <motion.div
      className="min-h-[100dvh] pb-12"
      initial={false}
      animate={{ backgroundColor: step === 4 ? TINT : COLORS.cream }}
      transition={reduceMotion ? { duration: 0.2 } : { duration: 0.7, ease: EASE_SIGNATURE }}
    >
      {/* Header — close X (always) + 4-segment progress (hidden on summary) */}
      <div className="px-5 pt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setLeaveOpen(true)}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 bg-card/60"
          aria-label="Close check-in"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
        {step < 4 ? (
          <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={4} aria-label={`Check-in step ${step + 1} of 4`}>
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-8 rounded-full"
                initial={false}
                animate={{ backgroundColor: i <= step ? DEEP : COLORS.hairline }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <span className="text-eyebrow uppercase" style={{ color: DEEP }}>
            Week {week}
          </span>
        )}
        <span className="size-10" aria-hidden="true" />
      </div>

      {/* Steps */}
      <div className="px-5 pt-7">
        <AnimatePresence mode="wait" initial={false}>
          {step < 4 ? (
            <StepView key={step} step={step}>
              {stepContent[step]}
            </StepView>
          ) : (
            <StepView key="s4" step={4}>
              {diff ? (
                <SummaryStep
                  week={week}
                  comfort={comfort ?? 2}
                  adherence={adherence ?? 'most'}
                  photoSaved={photoSaved}
                  diff={diff}
                  isPro={app.pro.active}
                />
              ) : (
                <div className="flex items-center gap-2 text-ink-2 text-body">
                  <Sparkles size={16} className="animate-dot-pulse" aria-hidden="true" />
                  Adjusting your plan…
                </div>
              )}
            </StepView>
          )}
        </AnimatePresence>

        {step < 4 && (
          <p className="mt-8 text-caption text-ink-3 text-center flex items-center justify-center gap-1.5">
            <ClipboardCheck size={13} aria-hidden="true" />
            Week {week} check-in · Day {day} · always free
          </p>
        )}
      </div>

      {/* Leave confirmation (checkin.md — answers are kept) */}
      <Sheet open={leaveOpen} onClose={() => setLeaveOpen(false)} ariaLabel="Finish your check-in later?">
        <h3 className="font-display text-display-md text-ink mt-1">Finish your check-in later?</h3>
        <p className="text-body text-ink-2 mt-2">
          Your answers so far stay on this device — pick up right where you left off.
        </p>
        <LFButton
          className="mt-5"
          onClick={() => {
            setLeaveOpen(false);
            navigate('/program');
          }}
        >
          Leave — I'll come back
        </LFButton>
        <LFButton variant="ghost" className="mt-1" onClick={() => setLeaveOpen(false)}>
          Continue check-in
        </LFButton>
      </Sheet>
    </motion.div>
  );
}
