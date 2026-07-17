/**
 * Onboarding Step 7 — Personalized plan reveal (onboarding.md). Warm Ochre
 * full-bleed tint: headline composed from answers, Today (Day 1) card with
 * quick-view Sheets, Week 1 card with day dots, "Why these" rows tied to the
 * user's actual answers, engine warnings shown kindly, and the honest-
 * expectations card. Safety content is never paywalled here.
 */

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HeartHandshake, Info, Sparkles, Wind } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ACTIVITY_BY_ID, type Activity } from '@/data/activities';
import { GOALS } from '@/data/content';
import { WEEKS } from '@/data/program';
import { CATEGORY_THEME, EASE_OUT_SOFT, formatMinutes, type EvidenceTierId } from '@/lib/theme';
import ActivityRow from '@/components/ActivityRow';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import Sheet from '@/components/Sheet';
import { FaceIllo } from '@/components/illos';
import { LFButton } from '@/components/ui';
import { useRise } from './shared';

/* ── "Why these" rows — derived from the user's actual answers ─────────── */

interface WhyRow {
  text: string;
  tier: EvidenceTierId;
}

function goalName(id: string): string {
  return GOALS.find((g) => g.id === id)?.name.toLowerCase() ?? id;
}

function buildWhyRows(goals: string[], sensitiveSkin: boolean, reactsOften: boolean): WhyRow[] {
  const goalSet = new Set(goals);
  const rows: WhyRow[] = [];

  const protectionGoal = ['healthy-skin', 'uneven-tone', 'fine-lines', 'dryness-comfort', 'shine', 'blemishes'].find((g) =>
    goalSet.has(g),
  );
  if (protectionGoal) {
    rows.push({
      tier: 'A',
      text: `Daily Sunscreen — because ${goalName(protectionGoal)} was your goal, and protection is the strongest evidence we have.`,
    });
  }
  if (goalSet.has('tension')) {
    rows.push({
      tier: 'B',
      text: 'Neutral Jaw Rest — you mentioned jaw tension; this is pure relaxation, no stretching.',
    });
  }
  if (goalSet.has('puffiness')) {
    rows.push({
      tier: 'B',
      text: 'Morning De-Puff Glide — gentle glides that may temporarily ease the look of puffiness, introduced slowly in Week 2.',
    });
  }
  if (goalSet.has('consistency')) {
    rows.push({
      tier: 'B',
      text: 'Short on purpose — most moments are a single quiet minute, so the ritual stays keepable.',
    });
  }
  if (sensitiveSkin || reactsOften) {
    rows.push({ tier: 'A', text: 'No actives this week — sensitive skin means slow introductions.' });
  }
  // Gentle fallbacks so the card always explains three honest reasons
  rows.push({ tier: 'A', text: 'Morning basics — cleanse, moisturize, protect: the Tier A foundation everything else builds on.' });
  rows.push({ tier: 'B', text: 'A quiet relaxation minute every day — it opens every week, whatever your goals.' });
  rows.push({ tier: 'A', text: 'Nothing aggressive, nothing new all at once — Week 1 is a safe baseline.' });

  return rows.slice(0, 3);
}

/* ── Activity quick-view Sheet ─────────────────────────────────────────── */

function QuickView({ activity, onClose }: { activity: Activity | null; onClose: () => void }) {
  const theme = activity ? CATEGORY_THEME[activity.category] : null;
  return (
    <Sheet open={activity !== null} onClose={onClose} ariaLabel={activity?.title ?? 'Activity quick view'}>
      {activity && theme && (
        <div>
          <div className="flex items-center gap-3 mt-1">
            <span
              className="w-16 h-[72px] shrink-0 overflow-hidden rounded-arch flex items-end justify-center"
              style={{ backgroundColor: theme.hue }}
              aria-hidden="true"
            >
              <FaceIllo name={activity.media.illustration} className="w-16 h-[72px]" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-title text-ink">{activity.title}</h3>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <EvidenceTierBadge tier={activity.evidenceTier} />
                <span className="text-caption text-ink-2">
                  {formatMinutes(activity.durationSeconds)} · {activity.difficulty}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-tile bg-cream-2 p-3.5">
            <p className="text-eyebrow uppercase text-ink-2">What to expect, honestly</p>
            <p className="text-[13px] leading-[19px] text-ink-2 mt-1.5">{activity.expectedOutcome}</p>
          </div>

          <ol className="mt-4 flex flex-col gap-2">
            {activity.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-cream-2 font-display text-[11px] font-semibold text-ink-2 mt-[1px]">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-[19px] text-ink-2">{step}</span>
              </li>
            ))}
          </ol>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption" style={{ backgroundColor: theme.tint, color: theme.deep }}>
            <Wind size={13} strokeWidth={1.75} aria-hidden="true" />
            {activity.breathingCue}
          </p>

          {/* Day-1 items already passed the safety evaluation, so no extra
              warnings are needed here — the plan itself is the safe set. */}
          <p className="mt-4 text-caption text-ink-2">Full guidance, tips and safety notes live in your Library.</p>
        </div>
      )}
    </Sheet>
  );
}

/* ── Step ──────────────────────────────────────────────────────────────── */

export default function StepPlanReveal({ onFinish, onShowPaywall }: { onFinish: () => void; onShowPaywall: () => void }) {
  const { plan, profile, safety, inventory } = useApp();
  const rise = useRise();
  const reduced = useReducedMotion();
  const [quickView, setQuickView] = useState<Activity | null>(null);

  const day1 = plan?.days[0] ?? null;
  const day1Activities = useMemo(
    () => (day1 ? day1.items.map((i) => ACTIVITY_BY_ID.get(i.activityId)).filter((a): a is Activity => Boolean(a)) : []),
    [day1],
  );

  const goals = useMemo(() => profile?.goals ?? plan?.goals ?? [], [profile, plan]);
  const topGoals = goals.slice(0, 2).map(goalName);
  const subline = `${profile?.routineTime ?? 5} quiet minutes a day · built for ${
    topGoals.length > 0 ? topGoals.join(' & ') : 'gentle daily care'
  }`;

  const answers = safety?.answers;
  const reactsOften = inventory?.reactsToNew === 'often-reacts';
  const whyRows = useMemo(
    () => buildWhyRows(goals, answers?.sensitiveSkin === true, reactsOften),
    [goals, answers, reactsOften],
  );

  const warnings = plan?.warnings ?? [];
  const tint = CATEGORY_THEME.skincare.tint;

  return (
    <div className="-mx-5 px-5 pb-4 min-h-[80vh]" style={{ backgroundColor: tint }}>
      <motion.p {...rise(0)} className="text-eyebrow uppercase text-ink-2 pt-2">
        Your plan is ready
      </motion.p>
      <motion.h1 {...rise(0.06)} className="font-display text-display-lg text-ink mt-1">
        Your LumaFace <em className="italic">Ritual</em>
      </motion.h1>
      <motion.p {...rise(0.12)} className="text-body text-ink-2 mt-2 max-w-[34ch]">
        {subline}
      </motion.p>

      {/* Today card */}
      <motion.div {...rise(0.24, 28)} className="mt-5 bg-card rounded-card shadow-pop p-[18px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow uppercase text-ink-2">Today · Day 1</p>
          {day1 && (
            <span className="inline-flex h-[24px] items-center rounded-full bg-cream-2 px-2.5 text-caption text-ink-2">
              ≈ {day1.estimatedMinutes} min
            </span>
          )}
        </div>
        <ul className="mt-3 flex flex-col gap-3">
          {day1Activities.map((a, i) => (
            <motion.li
              key={a.activityId}
              initial={{ opacity: 0, y: reduced ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduced ? 0.2 : 0.45, delay: reduced ? 0 : 0.4 + i * 0.07, ease: EASE_OUT_SOFT }}
            >
              <ActivityRow activity={a} onClick={() => setQuickView(a)} />
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Week 1 card */}
      <motion.div {...rise(0.36, 28)} className="mt-3.5 bg-card rounded-card shadow-card p-[18px]">
        <p className="text-eyebrow uppercase text-ink-2">Week 1 — Reset</p>
        <p className="text-body text-ink-2 mt-2">{WEEKS[0].intent}</p>
        <div className="mt-3.5 flex items-center gap-2" aria-label="Day 1 of 7 highlighted">
          {Array.from({ length: 7 }, (_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24, delay: reduced ? 0 : 0.5 + i * 0.04 }}
              className="size-2.5 rounded-full"
              style={{ backgroundColor: i === 0 ? CATEGORY_THEME.skincare.deep : '#ECE3D6' }}
              aria-hidden="true"
            />
          ))}
          <span className="text-caption text-ink-2 ms-1">D1 today</span>
        </div>
      </motion.div>

      {/* Why these */}
      <motion.div {...rise(0.48, 28)} className="mt-3.5 bg-cream-2 rounded-[20px] p-[18px]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-ink-2" aria-hidden="true">
            <Sparkles size={17} strokeWidth={1.75} />
          </span>
          <p className="text-body font-bold text-ink">Why these, for you</p>
        </div>
        <ul className="mt-3 flex flex-col gap-2.5">
          {whyRows.map((row, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <EvidenceTierBadge tier={row.tier} mini interactive={false} className="mt-[1px]" />
              <span className="text-[13px] leading-[19px] text-ink-2">{row.text}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Engine warnings — shown kindly, never red */}
      {warnings.length > 0 && (
        <motion.div {...rise(0.56, 24)} className="mt-3.5 bg-card rounded-[20px] border border-hairline p-[18px]">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
              <HeartHandshake size={17} strokeWidth={1.75} />
            </span>
            <p className="text-body font-bold text-ink">Kept gentle, on purpose</p>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="size-[6px] rounded-full bg-ink-3 mt-[6px] shrink-0" aria-hidden="true" />
                <span className="text-[13px] leading-[19px] text-ink-2">{w}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Honest expectations */}
      <motion.div {...rise(0.6, 24)} className="mt-3.5 flex items-start gap-2.5 px-1">
        <Info size={16} className="shrink-0 mt-[2px] text-ink-2" aria-hidden="true" />
        <p className="text-[13px] leading-[19px] text-ink-2">
          <span className="font-bold text-ink">What to expect, honestly:</span> Week 1 is about comfort and habit. Skincare
          basics follow established dermatologist guidance. Massage may temporarily ease the look of puffiness. Face
          movement is experimental — evidence is limited and no structural change is guaranteed. Your results are yours
          alone, and slow is normal.
        </p>
      </motion.div>

      {/* CTA stack */}
      <motion.div {...rise(0.7, 24)} className="mt-5">
        <LFButton onClick={onFinish}>Begin Day 1</LFButton>
        <LFButton variant="secondary" onClick={onShowPaywall} className="mt-2.5">
          See my full 28-day plan
        </LFButton>
        <p className="mt-3 text-center text-caption text-ink-2">Free tier forever · No card needed to explore</p>
      </motion.div>

      <QuickView activity={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
