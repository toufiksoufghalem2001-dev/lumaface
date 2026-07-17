/**
 * Support — `/support`. Warm, plain-language support + refunds hub:
 *  · category chips (billing / refund / technical / content / other)
 *  · signed in → ticket inserted into `support_tickets` (Supabase REST, RLS:
 *    own rows) and listed under "Your tickets"
 *  · signed out → honest mailto fallback with a prefilled subject/body
 *  · the 48-hour refund-honor policy in plain language (what we honor, how
 *    platform rules apply, how to cancel, what happens to your data)
 * No fake ticketing: when the backend isn't reachable, nothing pretends to
 * have been sent.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, Inbox, LifeBuoy, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useApp } from '@/lib/store';
import { EASE_OUT_SOFT } from '@/lib/theme';
import { BACKEND_ENABLED } from '@/lib/config';
import {
  authFromApp,
  listMyTickets,
  submitSupportTicket,
  type AuthSnapshot,
  type SupportCategory,
  type SupportTicket,
} from '@/lib/billing';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import SectionHeader from '@/components/SectionHeader';
import { Card, Chip, LFButton } from '@/components/ui';

const EASE = EASE_OUT_SOFT;

const SUPPORT_EMAIL = 'care@lumaface.app';

const CATEGORIES: { id: SupportCategory; label: string }[] = [
  { id: 'billing', label: 'Billing' },
  { id: 'refund', label: 'Refund' },
  { id: 'technical', label: 'Technical' },
  { id: 'content', label: 'Content' },
  { id: 'other', label: 'Something else' },
];

const REFUND_POINTS: { title: string; body: string }[] = [
  {
    title: 'Within 48 hours of purchase',
    body: 'Changed your mind? Tell us here (choose “Refund”) within 48 hours of the charge and we honor it — no forms, no retention maze, no hard feelings.',
  },
  {
    title: 'After 48 hours',
    body: 'Refunds follow Stripe / your payment platform’s rules. We’ll still help you navigate them — ask and a person walks it through with you.',
  },
  {
    title: 'How to cancel',
    body: 'Tap the “manage subscription” link in your Stripe receipt email, or write to us here and we’ll do it together. You keep PRO until the paid period ends — canceling stops future charges only.',
  },
  {
    title: 'What happens to your data',
    body: 'Nothing. Photos and plans live on your device, so canceling or refunding changes billing only — your data stays put. Export or delete it anytime in Profile → Privacy.',
  },
];

function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface SupportProps {
  /** Test seam: override the auth snapshot until the store's auth slice lands. */
  authOverride?: AuthSnapshot;
}

export default function Support({ authOverride }: SupportProps = {}) {
  const app = useApp();
  const auth = authOverride ?? authFromApp(app);
  const token = BACKEND_ENABLED && auth.signedIn ? auth.token : null;
  const userId = BACKEND_ENABLED && auth.signedIn ? auth.userId : null;
  const signedIn = Boolean(token && userId);

  const [category, setCategory] = useState<SupportCategory>('billing');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [emailEdited, setEmailEdited] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentNote, setSentNote] = useState<string | null>(null);
  const [errorNote, setErrorNote] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null); // null = loading
  const [ticketsFailed, setTicketsFailed] = useState(false);

  /* Prefill the reply email once auth resolves, unless the user typed
     (React "adjust state during render" pattern — no effect needed). */
  if (!emailEdited && auth.email && email !== auth.email) {
    setEmail(auth.email);
  }

  const [reloadNonce, setReloadNonce] = useState(0);

  /* Load own tickets (RLS-scoped) whenever auth is ready / "Try again" fires. */
  useEffect(() => {
    if (!token || !userId) return;
    let cancelled = false;
    listMyTickets({ token, userId }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setTickets(res.data);
        setTicketsFailed(false);
      } else {
        setTickets([]);
        setTicketsFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, userId, reloadNonce]);

  function retryLoadTickets() {
    setTickets(null);
    setTicketsFailed(false);
    setReloadNonce((n) => n + 1);
  }

  async function submit() {
    const text = message.trim();
    if (!text || sending) return;
    setSentNote(null);
    setErrorNote(null);

    /* Signed out → honest mailto fallback, prefilled. */
    if (!token || !userId) {
      const subject = encodeURIComponent(`[LumaFace] ${categoryLabel(category)}`);
      const body = encodeURIComponent(
        `${text}\n\n— sent from the LumaFace app (not signed in)${email.trim() ? `\nReply to: ${email.trim()}` : ''}`,
      );
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      setSentNote('Opening your email app — everything is prefilled.');
      return;
    }

    setSending(true);
    const res = await submitSupportTicket(
      { category, message: text, email: email.trim() || auth.email },
      { token, userId },
    );
    setSending(false);
    if (res.ok) {
      setMessage('');
      setTickets((t) => [res.data, ...(t ?? [])]);
      setSentNote('Got it — a person replies within 2 days.');
    } else if (res.error.kind === 'unauthenticated') {
      setErrorNote('Your session expired — sign in again, or send by email instead.');
    } else if (res.error.kind === 'network') {
      setErrorNote('No connection — your message stayed right here. Try again.');
    } else {
      setErrorNote(`Could not send right now — please try again, or email ${SUPPORT_EMAIL}.`);
    }
  }

  return (
    <div className="pb-8">
      {/* ── Header ── */}
      <header className="px-5 pt-4">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-eyebrow uppercase text-ink-2">
          Support & refunds
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1, ease: EASE }} className="font-display text-display-lg text-ink mt-1">
          We’re here — a <em>person</em> answers.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.18, ease: EASE }} className="text-body text-ink-2 mt-2 max-w-[34ch]">
          Billing, refunds, technical hiccups, content questions — within 2 days, from a human who knows the app.
        </motion.p>
      </header>

      {/* ── Category chips ── */}
      <SectionHeader eyebrow="What is this about?" className="px-5" />
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="px-5 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>
            {c.label}
          </Chip>
        ))}
      </motion.section>

      {/* ── Message form ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: EASE }} className="px-5 mt-4">
        <Card className="p-4">
          <label htmlFor="support-message" className="text-label text-ink">
            Tell us what happened
          </label>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={
              category === 'refund'
                ? 'Order date (roughly) and what went wrong — that’s all we need.'
                : 'The more specific, the faster we can help.'
            }
            className="mt-2 w-full resize-none rounded-[16px] border border-hairline bg-cream px-4 py-3 text-body text-ink placeholder:text-ink-3 focus:outline-none focus:border-rose"
          />
          <label htmlFor="support-email" className="mt-3 block text-label text-ink">
            Reply-to email <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="support-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmailEdited(true);
              setEmail(e.target.value);
            }}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-[16px] border border-hairline bg-cream px-4 py-3 text-body text-ink placeholder:text-ink-3 focus:outline-none focus:border-rose"
          />
          {!signedIn && (
            <p className="mt-3 text-caption text-ink-2">
              You’re not signed in — tapping send opens your email app with everything prefilled.
            </p>
          )}
          <LFButton className="mt-4" onClick={submit} disabled={!message.trim() || sending}>
            {sending ? 'Sending…' : signedIn ? 'Send to support' : 'Send by email'}
          </LFButton>
          {sentNote && (
            <p role="status" className="mt-3 flex items-center gap-1.5 text-caption" style={{ color: '#4A6B43' }}>
              <Check size={14} aria-hidden="true" /> {sentNote}
            </p>
          )}
          {errorNote && (
            <p role="alert" className="mt-3 text-caption text-rose-deep">
              {errorNote}
            </p>
          )}
        </Card>
      </motion.section>

      {/* ── 48-hour refund-honor policy ── */}
      <SectionHeader eyebrow="In plain language" title="The 48-hour refund promise." className="px-5" />
      <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, ease: EASE }} className="px-5">
        <div className="rounded-card border-[1.5px] border-ink/25 bg-card p-[18px]">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-petal bg-cream-2 text-ink-2" aria-hidden="true">
              <ShieldCheck size={24} strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-title text-ink">We’d rather refund you than keep you grudgingly.</h2>
          </div>
          <div className="mt-4 flex flex-col gap-3.5">
            {REFUND_POINTS.map((p) => (
              <div key={p.title} className="flex items-start gap-3">
                <span className="mt-[7px] size-2 shrink-0 rounded-full bg-rose" aria-hidden="true" />
                <span>
                  <span className="block text-body font-bold text-ink">{p.title}</span>
                  <span className="block text-caption text-ink-2 mt-0.5">{p.body}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Your tickets (signed in only) ── */}
      {signedIn && (
        <>
          <SectionHeader
            eyebrow="Your tickets"
            title="Replies land here."
            actionLabel={ticketsFailed ? 'Try again' : undefined}
            onAction={ticketsFailed ? retryLoadTickets : undefined}
            className="px-5"
          />
          <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, ease: EASE }} className="px-5 flex flex-col gap-3">
            {tickets === null ? (
              <Card className="flex items-center gap-3 p-4">
                <RefreshCw size={16} className="animate-spin text-ink-3" aria-hidden="true" />
                <span className="text-body text-ink-2">Loading your tickets…</span>
              </Card>
            ) : ticketsFailed ? (
              <Card className="p-4">
                <p className="text-body text-ink-2">Couldn’t load your tickets — check your connection and try again.</p>
              </Card>
            ) : tickets.length === 0 ? (
              <Card className="flex items-center gap-3.5 p-4">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
                  <Inbox size={19} strokeWidth={1.75} />
                </span>
                <p className="text-body text-ink-2">No tickets yet — this is where our replies will appear.</p>
              </Card>
            ) : (
              tickets.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-label text-ink">
                      <LifeBuoy size={14} className="text-ink-2" aria-hidden="true" />
                      {categoryLabel(t.category)}
                    </span>
                    <span className="text-caption text-ink-3">
                      {shortDate(t.created_at)}
                      {shortDate(t.created_at) ? ' · ' : ''}
                      {t.status || 'new'}
                    </span>
                  </div>
                  <p className="mt-2 text-body text-ink-2">{t.message}</p>
                </Card>
              ))
            )}
          </motion.section>
        </>
      )}

      {/* ── Direct email row ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: EASE }} className="px-5 mt-8">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="block">
          <Card tappable className="flex items-center gap-3.5 p-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
              <Mail size={19} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-bold text-ink">Prefer email?</span>
              <span className="block text-caption text-ink-2 mt-0.5">{SUPPORT_EMAIL} — a person replies within 2 days.</span>
            </span>
            <ChevronRight size={17} className="shrink-0 text-ink-3" aria-hidden="true" />
          </Card>
        </a>
      </motion.section>

      {/* ── Footer ── */}
      <div className="px-5 mt-8">
        <DisclaimerBlock />
      </div>
    </div>
  );
}
