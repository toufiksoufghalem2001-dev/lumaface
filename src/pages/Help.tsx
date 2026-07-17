/**
 * Help — `/help` (design/help.md). The professional-care compass + honest
 * FAQ. Warm plain language, zero alarm styling: "urgent" is communicated
 * by words and layout order, never by red UI. The coach's safety-redirect
 * card and onboarding's referral note deep-link to Section 2 (#pause);
 * Profile's FAQ row deep-links to #faq.
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bandage,
  Check,
  ChevronDown,
  CircleAlert,
  Droplets,
  Eye,
  Flame,
  HeartHandshake,
  Info,
  Mail,
  NotebookPen,
  PauseCircle,
  Syringe,
  Thermometer,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EASE_OUT_SOFT } from '@/lib/theme';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import SectionHeader from '@/components/SectionHeader';
import { Card, LFButton } from '@/components/ui';

const EASE = EASE_OUT_SOFT;

/* ── Section 2 data — the referral conditions (§2.2) ───────────────────── */

const CONDITIONS: { icon: LucideIcon; title: string; why: string }[] = [
  { icon: Zap, title: 'Sudden facial weakness or drooping', why: 'Especially one-sided. This is urgent — seek emergency care now, not an appointment later.' },
  { icon: CircleAlert, title: 'One-sided or unexplained swelling', why: "Swelling that arrives suddenly or without clear cause deserves a clinician's eyes." },
  { icon: TriangleAlert, title: 'Severe pain', why: 'Face, jaw, or eye pain that is strong, new, or worsening.' },
  { icon: Eye, title: 'Vision changes or eye injury', why: 'Any change in how you see, or a recent knock to the eye.' },
  { icon: Thermometer, title: 'Signs of infection', why: "Spreading redness, warmth, pus, fever, or a wound that isn't healing." },
  { icon: Bandage, title: 'Open wounds or severe/scarring acne', why: 'These need treatment, not cosmetic care — a dermatologist can genuinely help.' },
  { icon: Flame, title: 'Persistent burning or an allergic reaction', why: "Stinging that doesn't settle after stopping products, hives, or swelling of lips/eyelids." },
  { icon: Syringe, title: 'Symptoms after a recent procedure', why: 'Anything unusual after injectables, peels, or surgery — contact your practitioner first.' },
];

/* ── Section 3 data — gentle interim guidance ──────────────────────────── */

const MEANWHILE: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Droplets, title: 'The calm trio is always safe-ish', body: 'Plain cleanse, simple moisturizer, SPF. When in doubt, do less.' },
  { icon: PauseCircle, title: 'Pause anything that stings', body: "Burning is never 'working'. Stop first, ask questions second." },
  { icon: NotebookPen, title: 'Note what happened', body: 'When it started, what you used, a photo if you like — clinicians love specifics.' },
];

/* ── Section 4 data — FAQ ──────────────────────────────────────────────── */

const FAQ_GROUPS: { label: string; items: { q: string; a: string }[] }[] = [
  {
    label: 'Evidence honesty',
    items: [
      {
        q: 'Does face yoga really work?',
        a: "The honest answer: evidence is limited and preliminary — research reviews say we can't claim facial reshaping. That's why movement is Tier C in LumaFace: enjoy it as gentle practice and relaxation. The strongest evidence in your routine is unglamorous: cleanse, moisturize, sunscreen (Tier A). Massage sits between (Tier B): possible temporary changes in the look of puffiness.",
      },
      {
        q: 'What do the Tier A/B/C badges mean?',
        a: "A = established dermatologist guidance. B = limited evidence, temporary effects. C = preliminary, experimental — no guaranteed change. And there's a Tier D you'll never see: claims like beauty scores or face reshaping. We don't make them, full stop.",
      },
      {
        q: 'When will I see results?',
        a: 'Comfort and habit come first — often within 2 weeks. Temporary de-puffing can be same-day. Anything structural, if it happens at all, is slow and personal. We track your habits and how your skin feels, because those are real.',
      },
      {
        q: 'Is this safe with fillers, Botox, or after a procedure?',
        a: 'Pause massage and movement until your practitioner clears you (tell us in safety answers and your plan does this automatically). Skincare basics usually continue — confirm your specifics with your clinician.',
      },
    ],
  },
  {
    label: 'Subscriptions',
    items: [
      {
        q: 'How do I cancel?',
        a: 'Settings → your store subscriptions → LumaFace → cancel. You keep PRO until the period ends. No emails, no retention maze — the same steps are linked from Profile.',
      },
      {
        q: 'How does the 7-day trial work?',
        a: "Free for 7 days, then $49.99/year unless you cancel before day 7. We remind you on day 5. Monthly ($9.99) has no trial. We don't offer weekly plans — they exist to confuse, so we skipped them.",
      },
      {
        q: 'Will I be charged if I delete the app?',
        a: "Deleting the app doesn't cancel a subscription — cancel in store settings first. (Deleting your in-app data is separate and always available in Profile → Privacy.)",
      },
    ],
  },
  {
    label: 'Privacy',
    items: [
      {
        q: 'Where are my photos?',
        a: 'Only on your device, only if you opted in, deletable one by one in Progress. Nothing is uploaded — not to us, not to any cloud.',
      },
      {
        q: 'What does the camera actually do?',
        a: 'In this preview build: nothing live — camera coaching is simulated. When it ships: on-device centering and form cues; frames are analyzed on your phone and discarded. LumaFace never infers beauty, age, ethnicity, emotion, or health from your face.',
      },
      {
        q: 'What does the coach do with my messages?',
        a: 'In this build, everything is simulated locally. When the live coach ships, messages are answered from our approved library through a safety-filtered service; message content is never used for advertising, and urgent symptoms route to professional-care guidance, not coaching.',
      },
      {
        q: 'How do I export or delete my data?',
        a: 'Profile → Privacy & consent → Export my data (JSON download) or Delete all my data (hold-to-confirm). Both work fully, in-app, anytime.',
      },
      {
        q: 'Is LumaFace for teenagers?',
        a: 'No — LumaFace is designed and priced for adults 18+. Facial appearance pressure is real enough without apps marketing to minors.',
      },
    ],
  },
];

/* ── FAQ accordion item ────────────────────────────────────────────────── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-hairline first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 py-2.5 text-start"
      >
        <span className="text-body font-bold text-ink">{q}</span>
        <ChevronDown size={17} className={cn('shrink-0 text-ink-3 transition-transform duration-300', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-3.5 pe-6 text-body text-ink-2">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */

export default function Help() {
  const { hash } = useLocation();
  const [copied, setCopied] = useState(false);

  /* Deep links: /help#pause → referral card, /help#faq → FAQ. */
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => {
      const el = document.getElementById(hash.slice(1));
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => window.clearTimeout(t);
  }, [hash]);

  async function saveList() {
    const text = ['When to pause and see a professional — LumaFace:', ...CONDITIONS.map((c) => `• ${c.title} — ${c.why}`)].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the list stays on screen */
    }
  }

  return (
    <div className="pb-8">
      {/* ── Section 1 — Header ── */}
      <header className="px-5 pt-4">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-eyebrow uppercase text-ink-2">
          Help & professional care
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: EASE }} className="font-display text-display-lg text-ink mt-1">
          When to <em>pause</em> — and who to call.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: EASE }} className="text-body text-ink-2 mt-2 max-w-[34ch]">
          LumaFace is a wellness companion, not a clinician. Some moments deserve a qualified professional — and noticing them early is a win, not a worry.
        </motion.p>
      </header>

      {/* ── Section 2 — The referral card ── */}
      <motion.section
        id="pause"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
        className="px-5 mt-5 scroll-mt-4"
      >
        <div className="rounded-card border-[1.5px] border-ink/25 bg-card p-[18px]">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
              <HeartHandshake size={24} strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-title text-ink">Pause LumaFace and seek qualified care if you notice:</h2>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            {CONDITIONS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.06, ease: EASE }}
                className="flex items-start gap-3"
              >
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink" aria-hidden="true">
                  <c.icon size={15} strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-body font-bold text-ink">{c.title}</span>
                  <span className="block text-caption text-ink-2 mt-0.5">{c.why}</span>
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 border-t border-hairline pt-3.5">
            <Info size={14} className="mt-[1px] shrink-0 text-ink-2" aria-hidden="true" />
            <p className="flex-1 text-caption text-ink-2">
              LumaFace never attempts emergency diagnosis. When any of these appear — in the coach, at check-in, or anytime — coaching pauses and points here.
            </p>
          </div>
          <button type="button" onClick={saveList} className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-label text-ink-2 underline underline-offset-2">
            {copied ? <Check size={14} className="text-sage-deep" aria-hidden="true" /> : null}
            {copied ? 'Saved to clipboard' : 'Save this list'}
          </button>
        </div>
      </motion.section>

      {/* ── Section 3 — While you wait ── */}
      <SectionHeader eyebrow="Meanwhile" title="Being kind until your appointment." className="px-5" />
      <section className="px-5 flex flex-col gap-3">
        {MEANWHILE.map((m, i) => (
          <motion.div key={m.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}>
            <Card className="flex items-start gap-3.5 p-4">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
                <m.icon size={19} strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-body font-bold text-ink">{m.title}</span>
                <span className="block text-caption text-ink-2 mt-0.5">{m.body}</span>
              </span>
            </Card>
          </motion.div>
        ))}
      </section>

      {/* ── Section 4 — FAQ ── */}
      <div id="faq" className="scroll-mt-4">
        <SectionHeader eyebrow="Straight answers" title="Questions, answered honestly." className="px-5" />
        <section className="px-5 flex flex-col gap-5">
          {FAQ_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-eyebrow uppercase text-ink-3 mb-2">{group.label}</p>
              <Card className="px-4 py-1.5">
                {group.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </Card>
            </div>
          ))}
        </section>
      </div>

      {/* ── Section 5 — Contact card ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: EASE }} className="px-5 mt-8">
        <div className="rounded-[20px] bg-cream-2 p-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-ink-2" aria-hidden="true">
              <Mail size={19} strokeWidth={1.75} />
            </span>
            <p className="text-body font-bold text-ink">Still stuck? Write to us.</p>
          </div>
          <p className="text-caption text-ink-2 mt-3">
            A person replies within 2 days. For anything medical, please contact a professional first — then tell us how we can support your routine around their advice.
          </p>
          <LFButton variant="secondary" className="mt-4" onClick={() => (window.location.href = 'mailto:care@lumaface.app')}>
            Email support
          </LFButton>
        </div>
      </motion.section>

      {/* ── Section 6 — Footer ── */}
      <div className="px-5 mt-8">
        <DisclaimerBlock />
      </div>
    </div>
  );
}
