/**
 * Profile — `/profile` (design/profile.md). Account, plan, reminders,
 * privacy & consent controls (the trust center), data rights (export /
 * delete-all double-confirm), legal hub, help entry, quiet danger zone.
 * No dark patterns: cancel/manage is visible in Section 1, reminder
 * defaults off, every consent toggle is a light switch, the safe choice is
 * always the visually primary one.
 *
 * Local-only preferences (reminders, avatar tint, sounds/haptics, reduced
 * motion, hide-compare) persist under `lf_prefs` — wiped together with the
 * store's lf_* keys on delete-all.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Bot,
  CalendarHeart,
  Check,
  ChevronRight,
  CircleDot,
  Clock,
  CloudSun,
  Download,
  Droplets,
  EyeOff,
  Feather,
  FileText,
  FlaskConical,
  Info,
  LifeBuoy,
  Mail,
  Palette,
  RotateCcw,
  ScrollText,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Vibrate,
  Volume2,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import { EMPTY_SAFETY_ANSWERS, type SafetyAnswers } from '@/lib/rules';
import { EASE_OUT_SOFT, TIER_THEME } from '@/lib/theme';
import { GOALS, SAFETY_QUESTIONS, INVENTORY_OPTIONS, REACT_HISTORY_OPTIONS, AI_DISCLOSURE } from '@/data/content';
import { WEEKS, weekOfDay } from '@/data/program';
import ConsentToggle from '@/components/ConsentToggle';
import DisclaimerBlock from '@/components/DisclaimerBlock';
import Sheet from '@/components/Sheet';
import { Card, LFButton } from '@/components/ui';

const EASE = EASE_OUT_SOFT;

/* ═══════════════════════ Local preferences (lf_prefs) ═════════════════ */

interface Prefs {
  avatarTint: number;
  reminderEnabled: boolean;
  reminderHour: string;
  reminderMinute: string;
  reminderMeridiem: 'AM' | 'PM';
  reminderDays: string[];
  reminderWindow: 'Morning' | 'Midday' | 'Evening' | null;
  soundTimer: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  hideCompare: boolean;
}

const DEFAULT_PREFS: Prefs = {
  avatarTint: 0,
  reminderEnabled: false, // default off — no dark opt-in
  reminderHour: '7',
  reminderMinute: '30',
  reminderMeridiem: 'AM',
  reminderDays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
  reminderWindow: 'Morning',
  soundTimer: true,
  haptics: true,
  reducedMotion: false,
  hideCompare: false,
};

const PREFS_KEY = 'lf_prefs';

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

const CALM_STYLE_ID = 'lf-calm-motion-style';
const CALM_CSS =
  'html.lf-calm-motion *, html.lf-calm-motion *::before, html.lf-calm-motion *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }';

/** Apply/remove the app-level "calmer animations" override (CSS layer). */
function applyCalmMotion(on: boolean) {
  if (on && !document.getElementById(CALM_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = CALM_STYLE_ID;
    style.textContent = CALM_CSS;
    document.head.appendChild(style);
  }
  document.documentElement.classList.toggle('lf-calm-motion', on);
  try {
    window.dispatchEvent(new CustomEvent('lf-prefs-changed'));
  } catch {
    /* noop */
  }
}

const AVATAR_TINTS = [
  { bg: '#F7E7E6', fg: '#A8465A' },
  { bg: '#F0F5EC', fg: '#4A6B43' },
  { bg: '#F7F0E2', fg: '#7A5A24' },
  { bg: '#F4EFF8', fg: '#6B4E80' },
] as const;

const GOAL_ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Droplets,
  Sun,
  CircleDot,
  Palette,
  Feather,
  Waves,
  CloudSun,
  CalendarHeart,
};

/* ═══════════════════════ Small shared pieces ══════════════════════════ */

/** 46×28 spring toggle (same language as ConsentToggle). */
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn('relative h-7 w-[46px] shrink-0 rounded-full transition-colors duration-200', value ? 'bg-sage' : 'bg-cream-2')}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn('absolute top-[3px] size-[22px] rounded-full bg-white shadow-card', value ? 'end-[3px]' : 'start-[3px]')}
      />
    </button>
  );
}

/** 52px chevron settings row. */
function SettingRow({
  icon: Icon,
  title,
  value,
  onClick,
  to,
  first = false,
}: {
  icon: LucideIcon;
  title: string;
  value?: string;
  onClick?: () => void;
  to?: string;
  first?: boolean;
}) {
  const inner = (
    <>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold text-ink">{title}</span>
        {value && <span className="block truncate text-caption text-ink-2">{value}</span>}
      </span>
      <ChevronRight size={16} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
    </>
  );
  const cls = cn('flex min-h-[52px] w-full items-center gap-3 py-2 text-start', !first && 'border-t border-hairline');
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Inline toggle row (sounds, haptics, reduced motion, hide compare). */
function ToggleRow({
  icon: Icon,
  title,
  description,
  value,
  onChange,
  first = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  first?: boolean;
}) {
  return (
    <div className={cn('flex min-h-[52px] items-center gap-3 py-2', !first && 'border-t border-hairline')}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-ink-2" aria-hidden="true">
        <Icon size={17} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-bold text-ink">{title}</span>
        {description && <span className="block text-caption text-ink-2 line-clamp-2">{description}</span>}
      </span>
      <Toggle value={value} onChange={onChange} label={title} />
    </div>
  );
}

/** Tap-and-hold confirm button (rose-deep fill progress, 1.2s). */
function HoldToConfirm({ label, onConfirm, holdMs = 1200 }: { label: string; onConfirm: () => void; holdMs?: number }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function start() {
    setHolding(true);
    timer.current = window.setTimeout(() => {
      setHolding(false);
      onConfirm();
    }, holdMs);
  }
  function cancel() {
    setHolding(false);
    if (timer.current) window.clearTimeout(timer.current);
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onKeyDown={(e) => e.key === 'Enter' && start()}
      onKeyUp={cancel}
      className="relative min-h-[52px] w-full overflow-hidden rounded-full bg-rose-deep text-label text-white select-none"
      aria-label={`${label} — press and hold to confirm`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 bg-white/25"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${holdMs}ms linear` : 'width 150ms ease-out' }}
      />
      <span className="relative">{holding ? 'Keep holding…' : label}</span>
    </button>
  );
}

/** Simple snap-scroll "wheel" column for the reminder picker. */
function Wheel({ options, value, onChange, ariaLabel }: { options: string[]; value: string; onChange: (v: string) => void; ariaLabel: string }) {
  return (
    <div className="no-scrollbar lf-scroll h-[132px] snap-y snap-mandatory overflow-y-auto rounded-tile border border-hairline" role="listbox" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="option"
          aria-selected={o === value}
          onClick={() => onChange(o)}
          className={cn(
            'flex h-[44px] w-full snap-center items-center justify-center font-display text-[24px]',
            o === value ? 'bg-cream-2 font-semibold text-ink' : 'text-ink-3',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Multi-select goals grid (max 3), reused by plan + goals sheets. */
function GoalsGrid({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {GOALS.map((g) => {
        const Icon = GOAL_ICONS[g.icon] ?? Sparkles;
        const on = selected.includes(g.id);
        const disabled = !on && selected.length >= 3;
        return (
          <button
            key={g.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(g.id)}
            className={cn(
              'flex min-h-[76px] flex-col justify-center gap-1 rounded-tile border-[1.5px] p-3 text-start transition-colors duration-150',
              on ? 'border-ink bg-cream-2' : 'border-hairline',
              disabled && 'opacity-40',
            )}
          >
            <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
              <Icon size={15} className="shrink-0 text-ink-2" aria-hidden="true" />
              {g.name}
              {on && <Check size={14} className="ms-auto text-sage-deep" aria-hidden="true" />}
            </span>
            <span className="text-[11px] leading-[15px] text-ink-2">{g.descriptor}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 3-option segmented control (3 / 5 / 10 minutes). */
function TimeSegmented({ value, onChange }: { value: 3 | 5 | 10; onChange: (v: 3 | 5 | 10) => void }) {
  return (
    <div className="flex rounded-full bg-cream-2 p-1" role="radiogroup" aria-label="Daily ritual time">
      {([3, 5, 10] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={cn('min-h-[44px] flex-1 rounded-full text-label transition-colors duration-150', value === t ? 'bg-ink text-cream' : 'text-ink-2')}
        >
          {t} min
        </button>
      ))}
    </div>
  );
}

function SheetHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <p className="text-eyebrow uppercase text-ink-2 mt-1">{eyebrow}</p>
      <h3 className="font-display text-display-md text-ink mt-1">{title}</h3>
    </>
  );
}

/* ═══════════════════════ Main page ════════════════════════════════════ */

type SheetId =
  | 'plan'
  | 'time'
  | 'goals'
  | 'safety'
  | 'inventory'
  | 'reminder'
  | 'manage'
  | 'signin'
  | 'export'
  | 'delete1'
  | 'delete2'
  | 'reset'
  | 'evidence'
  | 'disclaimer'
  | 'privacy'
  | 'terms'
  | 'ai'
  | null;

export default function Profile() {
  const {
    profile,
    plan,
    pro,
    consents,
    safety,
    inventory,
    currentDay,
    setProfile,
    setSafetyAnswers,
    setInventory,
    clearPro,
    setConsent,
    exportData,
    deleteAllData,
  } = useApp();
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [sheet, setSheet] = useState<SheetId>(null);
  /* toast (may be handed over from a reset via sessionStorage) */
  const [toast, setToast] = useState<string | null>(() => {
    const handed = sessionStorage.getItem('lf_profile_toast');
    if (handed) sessionStorage.removeItem('lf_profile_toast');
    return handed;
  });
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const toastTimer = useRef<number | null>(null);

  /* sheet-local working state */
  const [draftGoals, setDraftGoals] = useState<string[]>([]);
  const [draftTime, setDraftTime] = useState<3 | 5 | 10>(5);
  const [draftSafety, setDraftSafety] = useState<Record<string, boolean>>({});
  const [draftInventory, setDraftInventory] = useState<string[]>([]);
  const [draftReacts, setDraftReacts] = useState<string | null>(null);
  const [cancelArmed, setCancelArmed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  useEffect(() => {
    applyCalmMotion(prefs.reducedMotion);
  }, [prefs.reducedMotion]);

  /* toast timer cleanup */
  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }

  function patchPrefs(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
  }

  /* ── derived ── */
  const name = profile?.name?.trim() || 'Friend';
  const initial = (name[0] ?? 'F').toUpperCase();
  const tint = AVATAR_TINTS[prefs.avatarTint % AVATAR_TINTS.length];
  const goalDefs = (profile?.goals ?? []).map((id) => GOALS.find((g) => g.id === id)).filter(Boolean);
  const week = WEEKS.find((w) => w.week === weekOfDay(currentDay));
  const routineTime = profile?.routineTime ?? 5;
  const isAnnual = pro.planLabel?.toLowerCase().includes('annual') ?? false;
  const renewalDate = useMemo(() => {
    const d = new Date();
    if (isAnnual) d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [isAnnual]);

  const reminderValue = prefs.reminderEnabled ? `${prefs.reminderHour}:${prefs.reminderMinute} ${prefs.reminderMeridiem}` : 'Off';
  const inventoryCount = inventory?.products.length ?? 0;

  /* ── sheet openers (prefill drafts) ── */
  function openPlanSheet() {
    setDraftGoals([...(profile?.goals ?? [])]);
    setDraftTime((profile?.routineTime ?? 5) as 3 | 5 | 10);
    setSheet('plan');
  }
  function openGoalsSheet() {
    setDraftGoals([...(profile?.goals ?? [])]);
    setSheet('goals');
  }
  function openTimeSheet() {
    setDraftTime((profile?.routineTime ?? 5) as 3 | 5 | 10);
    setSheet('time');
  }
  function openSafetySheet() {
    setDraftSafety({ ...(safety?.answers ?? EMPTY_SAFETY_ANSWERS) } as Record<string, boolean>);
    setSheet('safety');
  }
  function openInventorySheet() {
    setDraftInventory([...(inventory?.products ?? [])]);
    setDraftReacts(inventory?.reactsToNew ?? null);
    setSheet('inventory');
  }
  function openManageSheet() {
    setCancelArmed(false);
    setSheet('manage');
  }

  function toggleDraftGoal(id: string) {
    setDraftGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : prev.length >= 3 ? prev : [...prev, id]));
  }

  /* ── destructive flows ── */
  function confirmDeleteAll() {
    try {
      localStorage.removeItem(PREFS_KEY);
    } catch {
      /* noop */
    }
    try {
      window.history.replaceState(null, '', '/onboarding');
    } catch {
      /* noop */
    }
    deleteAllData(); // wipes every lf_* key, then reloads to a fresh state
  }

  function confirmResetProgress() {
    for (const k of ['lf_progress', 'lf_checkins', 'lf_plan']) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* noop */
      }
    }
    sessionStorage.setItem('lf_profile_toast', 'Progress reset — a fresh page, kept kindly.');
    window.location.reload();
  }

  async function shareApp() {
    const text = "I've started a gentle, evidence-honest facial care ritual — join me on LumaFace 🌸";
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'LumaFace', text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      showToast('Link copied — share the calm');
    } catch {
      /* user canceled — no guilt */
    }
  }

  const reminderTimeLabel = `${prefs.reminderHour}:${prefs.reminderMinute} ${prefs.reminderMeridiem}`;

  return (
    <div className="pb-8">
      {/* ── Header ── */}
      <header className="px-5 pt-4">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-eyebrow uppercase text-ink-2">
          Account & care
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06, ease: EASE }} className="font-display text-display-lg text-ink mt-1">
          Profile
        </motion.h1>
      </header>

      {/* ── Section 1 — Member card ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }} className="px-5 mt-4">
        <Card className="rounded-[24px] shadow-pop p-5">
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              onClick={() => patchPrefs({ avatarTint: prefs.avatarTint + 1 })}
              aria-label="Change avatar color"
              className="inline-flex size-16 shrink-0 items-center justify-center rounded-full font-display text-[26px] font-semibold"
              style={{ backgroundColor: tint.bg, color: tint.fg }}
            >
              {initial}
            </motion.button>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setProfile({ name: nameInput.trim() || undefined });
                    setEditingName(false);
                    showToast('Saved — you can change this anytime.');
                  }}
                >
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={24}
                    aria-label="Your name"
                    className="h-[40px] min-w-0 flex-1 rounded-full bg-cream-2 px-3.5 text-body text-ink focus:outline-none focus:ring-[1.5px] focus:ring-rose"
                  />
                  <button type="submit" aria-label="Save name" className="inline-flex size-[40px] items-center justify-center rounded-full bg-ink text-cream">
                    <Check size={16} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(profile?.name ?? '');
                    setEditingName(true);
                  }}
                  className="text-start"
                  aria-label="Edit name"
                >
                  <span className="font-display text-title text-ink">{name}</span>
                  <span className="block text-caption text-ink-3">Tap to edit</span>
                </button>
              )}
            </div>
            {pro.active ? (
              <motion.span initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="shrink-0 rounded-full bg-gold/15 px-3 py-1.5 text-[12px] font-bold" style={{ color: '#8a6d10' }}>
                PRO · {isAnnual ? 'Annual' : 'Monthly'}
              </motion.span>
            ) : (
              <span className="shrink-0 rounded-full bg-cream-2 px-3 py-1.5 text-[12px] font-medium text-ink-2">Free member</span>
            )}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2">
            <p className="text-caption text-ink-2">
              {pro.active ? (
                <>
                  Renews {renewalDate} ·{' '}
                  <button type="button" onClick={openManageSheet} className="underline underline-offset-2 text-ink font-medium">
                    Manage
                  </button>
                </>
              ) : (
                'The free tier is yours, fully, forever.'
              )}
            </p>
            {!pro.active && (
              <button type="button" onClick={() => navigate('/paywall')} className="shrink-0 text-label text-rose min-h-[36px]">
                Go PRO
              </button>
            )}
          </div>

          <div className="mt-3 border-t border-hairline pt-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {goalDefs.length > 0 ? (
                goalDefs.map((g) => (
                  <span key={g!.id} className="rounded-full bg-cream-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">
                    {g!.name}
                  </span>
                ))
              ) : (
                <span className="text-caption text-ink-3">No goals chosen yet</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-caption text-ink-2">
                {routineTime} min/day{plan && week ? ` · Week ${week.week} — ${week.name}` : ' · no plan yet'}
              </p>
              <button type="button" onClick={openPlanSheet} className="text-label text-rose min-h-[36px]">
                Edit
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2.5 border-t border-hairline pt-3.5">
            <UserRound size={15} className="mt-[1px] shrink-0 text-ink-3" aria-hidden="true" />
            <p className="flex-1 text-caption text-ink-2">You're browsing as a guest — create an account to sync across devices.</p>
            <button type="button" onClick={() => setSheet('signin')} className="shrink-0 text-label text-rose min-h-[36px]">
              Sign in
            </button>
          </div>
        </Card>
      </motion.section>

      {/* ── Section 2 — Ritual settings ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: EASE }} className="px-5 mt-6">
        <p className="text-eyebrow uppercase text-ink-2 mb-2">Ritual settings</p>
        <Card className="p-3.5">
          <SettingRow icon={Bell} title="Daily reminder" value={reminderValue} onClick={() => setSheet('reminder')} first />
          <SettingRow icon={Clock} title="Session length" value={`${routineTime} min`} onClick={openTimeSheet} />
          <SettingRow
            icon={Sparkles}
            title="My goals"
            value={goalDefs.length > 0 ? goalDefs.map((g) => g!.name).join(' · ') : 'Choose up to 3'}
            onClick={openGoalsSheet}
          />
          <SettingRow icon={ShieldCheck} title="Safety answers" value="7 questions" onClick={openSafetySheet} />
          <SettingRow icon={ShoppingBag} title="Routine inventory" value={`${inventoryCount} categories`} onClick={openInventorySheet} />
          <div className="border-t border-hairline mt-1 pt-1">
            <ToggleRow icon={Volume2} title="Timer chime" value={prefs.soundTimer} onChange={(v) => patchPrefs({ soundTimer: v })} first />
            <ToggleRow icon={Vibrate} title="Haptics" description="Light ticks on phase changes — never on paywall or delete." value={prefs.haptics} onChange={(v) => patchPrefs({ haptics: v })} />
            <ToggleRow icon={Feather} title="Reduced motion" description="Calmer animations throughout" value={prefs.reducedMotion} onChange={(v) => patchPrefs({ reducedMotion: v })} />
          </div>
        </Card>
      </motion.section>

      {/* ── Section 3 — Privacy & consent (the trust center) ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12, ease: EASE }} className="px-5 mt-6">
        <p className="text-eyebrow uppercase text-ink-2 mb-2">Your data, your rules</p>
        <Card className="p-3.5">
          <ConsentToggle consentKey="cameraCoach" value={consents.cameraCoach} onChange={(v) => setConsent('cameraCoach', v)} onSaved={() => showToast('Saved — you can change this anytime.')} />
          <div className="border-t border-hairline" />
          <ConsentToggle consentKey="photoSave" value={consents.photoSave} onChange={(v) => setConsent('photoSave', v)} onSaved={() => showToast('Saved — you can change this anytime.')} />
          <div className="border-t border-hairline" />
          <ConsentToggle consentKey="analytics" value={consents.analytics} onChange={(v) => setConsent('analytics', v)} onSaved={() => showToast('Saved — you can change this anytime.')} />
          <div className="border-t border-hairline" />
          <ConsentToggle consentKey="coachChat" value={consents.coachChat} onChange={(v) => setConsent('coachChat', v)} onSaved={() => showToast('Saved — you can change this anytime.')} />
          <div className="border-t border-hairline" />
          <ToggleRow
            icon={EyeOff}
            title="Hide photo comparison"
            description="Focus on habits only; the diary collapses app-wide."
            value={(profile as unknown as { hideComparison?: boolean } | null)?.hideComparison ?? prefs.hideCompare}
            onChange={(v) => { patchPrefs({ hideCompare: v }); setProfile({ hideComparison: v } as unknown as Parameters<typeof setProfile>[0]); }}
          />

          <div className="border-t border-hairline mt-1 pt-1">
            <SettingRow icon={Download} title="Export my data" value="Download everything as JSON" onClick={() => setSheet('export')} first />
            <SettingRow icon={Trash2} title="Delete all my data" value="Everything on this device, gone" onClick={() => setSheet('delete1')} />
          </div>
        </Card>
      </motion.section>

      {/* ── Section 4 — Help & legal ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16, ease: EASE }} className="px-5 mt-6">
        <p className="text-eyebrow uppercase text-ink-2 mb-2">Help & legal</p>
        <Card className="p-3.5">
          <SettingRow icon={LifeBuoy} title="When to see a professional" value="Pause conditions, in plain words" to="/help" first />
          <SettingRow icon={FlaskConical} title="How LumaFace rates evidence" value="Tiers A · B · C, honestly" onClick={() => setSheet('evidence')} />
          <SettingRow icon={Info} title="FAQ" value="Straight answers" to="/help#faq" />
          <SettingRow icon={Mail} title="Contact us" value="Replies within 2 days" onClick={() => (window.location.href = 'mailto:care@lumaface.app')} />
          <SettingRow icon={ShieldCheck} title="Wellness disclaimer (full text)" onClick={() => setSheet('disclaimer')} />
          <SettingRow icon={FileText} title="Privacy policy" value="Plain-language summary" onClick={() => setSheet('privacy')} />
          <SettingRow icon={ScrollText} title="Terms & subscription terms" onClick={() => setSheet('terms')} />
          <SettingRow icon={Bot} title="AI disclosure" value="What the coach is — and isn't" onClick={() => setSheet('ai')} />
          <SettingRow icon={RotateCcw} title="Restore purchase" onClick={() => showToast('No store purchase found — this is a demo build')} />
          <div className="flex min-h-[44px] items-center justify-between border-t border-hairline pt-2 text-caption text-ink-3">
            <span>LumaFace 1.0.0</span>
            <span>made with care</span>
          </div>
        </Card>
      </motion.section>

      {/* ── Section 5 — Share & love ── */}
      <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }} className="px-5 mt-6">
        <div className="rounded-card bg-rose-tint p-5">
          <h2 className="font-display text-title text-ink">Share the calm</h2>
          <p className="text-body text-ink-2 mt-1">Know someone who'd love a kinder routine?</p>
          <LFButton className="mt-4" onClick={shareApp}>
            <Share2 size={16} aria-hidden="true" />
            Share LumaFace
          </LFButton>
        </div>
      </motion.section>

      {/* ── Section 6 — Danger zone (quiet) ── */}
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.24 }} className="px-5 mt-6 flex justify-center">
        <button type="button" onClick={() => setSheet('reset')} className="min-h-[44px] text-caption text-ink-3 underline underline-offset-2">
          Reset my progress
        </button>
      </motion.section>

      <div className="px-5 mt-6">
        <DisclaimerBlock />
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit max-w-[85%] rounded-full bg-ink px-5 py-3 text-center text-caption text-cream shadow-pop"
            role="status"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ Sheets ═══════════════ */}

      {/* Member card Edit — goals + time (onboarding steps 1 & 4, prefilled) */}
      <Sheet open={sheet === 'plan'} onClose={() => setSheet(null)} ariaLabel="Edit goals and routine time">
        <SheetHeader eyebrow="Your plan" title="Goals & daily time" />
        <p className="text-body text-ink-2 mt-2">Up to 3 goals, and a ritual small enough to keep. Saving rebuilds your 28-day plan.</p>
        <div className="mt-4">
          <GoalsGrid selected={draftGoals} onToggle={toggleDraftGoal} />
        </div>
        <p className="text-eyebrow uppercase text-ink-2 mt-5 mb-2">Daily time</p>
        <TimeSegmented value={draftTime} onChange={setDraftTime} />
        <LFButton
          className="mt-5"
          onClick={() => {
            setProfile({ goals: draftGoals, routineTime: draftTime });
            setSheet(null);
            showToast('Saved — your plan was rebuilt around you.');
          }}
        >
          Save changes
        </LFButton>
      </Sheet>

      {/* Session length */}
      <Sheet open={sheet === 'time'} onClose={() => setSheet(null)} ariaLabel="Session length">
        <SheetHeader eyebrow="Ritual settings" title="Session length" />
        <p className="text-body text-ink-2 mt-2">A ritual small enough to keep every day. Your 3-minute essentials always count as a full day.</p>
        <div className="mt-4">
          <TimeSegmented value={draftTime} onChange={setDraftTime} />
        </div>
        <LFButton
          className="mt-5"
          onClick={() => {
            setProfile({ routineTime: draftTime });
            setSheet(null);
            showToast('Saved — your plan was rebuilt around you.');
          }}
        >
          Save
        </LFButton>
      </Sheet>

      {/* My goals */}
      <Sheet open={sheet === 'goals'} onClose={() => setSheet(null)} ariaLabel="My goals">
        <SheetHeader eyebrow="Ritual settings" title="My goals" />
        <p className="text-body text-ink-2 mt-2">Choose up to 3 — they shape your plan, never judge your face.</p>
        <div className="mt-4">
          <GoalsGrid selected={draftGoals} onToggle={toggleDraftGoal} />
        </div>
        <LFButton
          className="mt-5"
          onClick={() => {
            setProfile({ goals: draftGoals });
            setSheet(null);
            showToast('Saved — your plan was rebuilt around you.');
          }}
        >
          Save goals
        </LFButton>
      </Sheet>

      {/* Safety answers — prefilled, re-runs the rules engine on save */}
      <Sheet open={sheet === 'safety'} onClose={() => setSheet(null)} ariaLabel="Safety answers">
        <SheetHeader eyebrow="Answered with care" title="Safety answers" />
        <p className="text-body text-ink-2 mt-2">These keep your plan conservative where it matters. Kind notes, never judgment.</p>
        <div className="mt-4 flex flex-col">
          {SAFETY_QUESTIONS.map((q, i) => {
            const on = Boolean(draftSafety[q.key]);
            return (
              <div key={q.key} className={cn('py-2.5', i > 0 && 'border-t border-hairline')}>
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-bold text-ink">{q.title}</span>
                    <span className="block text-caption text-ink-2">{q.helper}</span>
                  </span>
                  <Toggle value={on} onChange={(v) => setDraftSafety((s) => ({ ...s, [q.key]: v }))} label={q.title} />
                </div>
                {on && q.onNote && <p className="mt-1.5 rounded-tile bg-cream-2 px-3 py-2 text-caption text-ink-2">{q.onNote}</p>}
              </div>
            );
          })}
        </div>
        <LFButton
          className="mt-5"
          onClick={() => {
            setSafetyAnswers({ ...EMPTY_SAFETY_ANSWERS, ...draftSafety } as SafetyAnswers);
            setSheet(null);
            showToast('Plan updated — your safety profile guides every suggestion.');
          }}
        >
          Save answers
        </LFButton>
        <p className="text-caption text-ink-2 mt-3">Saving re-runs the rules engine and rebuilds your plan around your answers.</p>
      </Sheet>

      {/* Routine inventory */}
      <Sheet open={sheet === 'inventory'} onClose={() => setSheet(null)} ariaLabel="Routine inventory">
        <SheetHeader eyebrow="Categories, never brands" title="Routine inventory" />
        <p className="text-body text-ink-2 mt-2">What's already on your shelf? This tunes cautions and pacing — it never sells you anything.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INVENTORY_OPTIONS.map((o) => {
            const on = draftInventory.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDraftInventory((prev) => (on ? prev.filter((p) => p !== o.id) : [...prev, o.id]))}
                className={cn('min-h-[40px] rounded-full border-[1.5px] px-4 text-label', on ? 'border-ink bg-ink text-cream' : 'border-hairline text-ink-2')}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="text-eyebrow uppercase text-ink-2 mt-5 mb-2">Your skin with new products</p>
        <div className="flex gap-2">
          {REACT_HISTORY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={draftReacts === o.id}
              onClick={() => setDraftReacts(o.id)}
              className={cn('min-h-[40px] flex-1 rounded-full border-[1.5px] px-2 text-label', draftReacts === o.id ? 'border-ink bg-ink text-cream' : 'border-hairline text-ink-2')}
            >
              {o.label}
            </button>
          ))}
        </div>
        <LFButton
          className="mt-5"
          onClick={() => {
            setInventory({ products: draftInventory, reactsToNew: (draftReacts as 'usually-fine' | 'sometimes-reacts' | 'often-reacts' | null) ?? null });
            setSheet(null);
            showToast('Saved — your plan stays in step with your shelf.');
          }}
        >
          Save inventory
        </LFButton>
      </Sheet>

      {/* Daily reminder — default off, gentle by design */}
      <Sheet open={sheet === 'reminder'} onClose={() => setSheet(null)} ariaLabel="Daily reminder">
        <SheetHeader eyebrow="A gentle nudge, never guilt" title="Daily reminder" />
        <div className="mt-4 flex items-center justify-between rounded-tile bg-cream-2 px-4 py-3">
          <span className="text-body font-bold text-ink">Remind me</span>
          <Toggle value={prefs.reminderEnabled} onChange={(v) => patchPrefs({ reminderEnabled: v })} label="Remind me" />
        </div>
        {prefs.reminderEnabled && (
          <>
            <p className="text-eyebrow uppercase text-ink-2 mt-4 mb-2">Time</p>
            <div className="grid grid-cols-2 gap-2.5">
              <Wheel ariaLabel="Hour" options={['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']} value={prefs.reminderHour} onChange={(v) => patchPrefs({ reminderHour: v })} />
              <Wheel ariaLabel="Minute" options={['00', '15', '30', '45']} value={prefs.reminderMinute} onChange={(v) => patchPrefs({ reminderMinute: v })} />
            </div>
            <div className="mt-2.5 flex gap-2">
              {(['AM', 'PM'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={prefs.reminderMeridiem === m}
                  onClick={() => patchPrefs({ reminderMeridiem: m })}
                  className={cn('min-h-[40px] flex-1 rounded-full border-[1.5px] text-label', prefs.reminderMeridiem === m ? 'border-ink bg-ink text-cream' : 'border-hairline text-ink-2')}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="text-eyebrow uppercase text-ink-2 mt-4 mb-2">Days</p>
            <div className="flex flex-wrap gap-1.5">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => {
                const on = prefs.reminderDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patchPrefs({ reminderDays: on ? prefs.reminderDays.filter((x) => x !== d) : [...prefs.reminderDays, d] })}
                    className={cn('size-[40px] rounded-full text-[12px] font-medium', on ? 'bg-ink text-cream' : 'border border-hairline text-ink-2')}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="text-eyebrow uppercase text-ink-2 mt-4 mb-2">Or pick a window</p>
            <div className="flex gap-2">
              {(
                [
                  { id: 'Morning', h: '7', m: '30', mer: 'AM' },
                  { id: 'Midday', h: '12', m: '30', mer: 'PM' },
                  { id: 'Evening', h: '8', m: '00', mer: 'PM' },
                ] as const
              ).map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={prefs.reminderWindow === w.id}
                  onClick={() => patchPrefs({ reminderWindow: w.id, reminderHour: w.h, reminderMinute: w.m, reminderMeridiem: w.mer })}
                  className={cn('min-h-[40px] flex-1 rounded-full border-[1.5px] text-label', prefs.reminderWindow === w.id ? 'border-ink bg-ink text-cream' : 'border-hairline text-ink-2')}
                >
                  {w.id}
                </button>
              ))}
            </div>
          </>
        )}
        <LFButton
          className="mt-5"
          onClick={() => {
            setSheet(null);
            showToast(prefs.reminderEnabled ? `Reminder saved — ${reminderTimeLabel}, gently.` : 'Reminder off — your ritual waits patiently.');
          }}
        >
          Save reminder
        </LFButton>
        <p className="text-caption text-ink-2 mt-3">Actual notifications arrive with the native app — this saves your preference on this device. Missing a day is always okay: streaks pause, they don't judge.</p>
      </Sheet>

      {/* Manage PRO (demo) — cancel is a full-width secondary, never hidden */}
      <Sheet open={sheet === 'manage'} onClose={() => setSheet(null)} ariaLabel="Manage subscription">
        <SheetHeader eyebrow="Your subscription" title={`PRO · ${isAnnual ? 'Annual' : 'Monthly'}`} />
        <div className="mt-4 rounded-tile bg-cream-2 p-4">
          <p className="text-body text-ink">{pro.planLabel ?? 'PRO'}</p>
          <p className="text-caption text-ink-2 mt-1">Renews {renewalDate} (simulated in this demo build).</p>
        </div>
        {!cancelArmed ? (
          <LFButton variant="secondary" className="mt-4" onClick={() => setCancelArmed(true)}>
            Cancel subscription
          </LFButton>
        ) : (
          <div className="mt-4 rounded-tile border border-hairline p-4">
            <p className="text-body text-ink">Cancel anytime — you keep PRO until your period ends.</p>
            <div className="mt-3 flex flex-col gap-1.5">
              <LFButton variant="secondary" onClick={() => setCancelArmed(false)}>
                Keep PRO
              </LFButton>
              <LFButton
                variant="ghost"
                className="underline underline-offset-2"
                onClick={() => {
                  clearPro();
                  setSheet(null);
                  showToast('PRO canceled — you keep it until your period ends (demo).');
                }}
              >
                Yes, cancel
              </LFButton>
            </div>
          </div>
        )}
        <p className="text-caption text-ink-2 mt-3">In the store build, "Manage" opens your store subscription settings directly.</p>
      </Sheet>

      {/* Sign in (simulated) */}
      <Sheet open={sheet === 'signin'} onClose={() => setSheet(null)} ariaLabel="Sign in">
        <SheetHeader eyebrow="Optional" title="Create your account" />
        <p className="text-body text-ink-2 mt-2">Sync your ritual across devices. Your photos stay on each device regardless — they never travel.</p>
        <div className="mt-4 flex flex-col gap-2">
          {['Continue with Apple', 'Continue with Google', 'Continue with Email'].map((label) => (
            <LFButton key={label} variant="secondary" onClick={() => showToast('Accounts arrive with the native build — your data stays on this device for now.')}>
              {label}
            </LFButton>
          ))}
        </div>
      </Sheet>

      {/* Export my data */}
      <Sheet open={sheet === 'export'} onClose={() => setSheet(null)} ariaLabel="Export my data">
        <SheetHeader eyebrow="Your data, portable" title="Export everything" />
        <p className="text-body text-ink-2 mt-2">One JSON file with your profile, plan, progress, check-ins, consents, coach threads, and photos (as data-URLs). Everything lives on this device — the file goes straight to your downloads, nowhere else.</p>
        <LFButton
          className="mt-5"
          onClick={() => {
            setSheet(null);
            showToast('Preparing your export…');
            exportData();
          }}
        >
          <Download size={16} aria-hidden="true" />
          Download my data
        </LFButton>
      </Sheet>

      {/* Delete all — step 1: safe choice visually primary */}
      <Sheet open={sheet === 'delete1'} onClose={() => setSheet(null)} ariaLabel="Delete all my data — step 1 of 2">
        <SheetHeader eyebrow="This is permanent" title="Delete everything on this device?" />
        <p className="text-body text-ink-2 mt-2">Profile, plan, progress, photos, coach threads — all gone, unrecoverable. There is no copy anywhere else; your data only ever lived here.</p>
        <LFButton variant="secondary" className="mt-5" onClick={() => setSheet(null)}>
          Keep my data
        </LFButton>
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={() => setSheet('delete2')} className="min-h-[44px] text-caption text-ink-3 underline underline-offset-2">
            I understand, continue
          </button>
        </div>
      </Sheet>

      {/* Delete all — step 2: hold to confirm */}
      <Sheet open={sheet === 'delete2'} onClose={() => setSheet(null)} ariaLabel="Delete all my data — final confirmation">
        <SheetHeader eyebrow="Final step" title="Hold to delete everything" />
        <p className="text-body text-ink-2 mt-2">Press and hold the button for a moment. When it fills, every LumaFace key on this device is erased and the app starts fresh.</p>
        <div className="mt-5">
          <HoldToConfirm label="Hold to delete everything" onConfirm={confirmDeleteAll} />
        </div>
        <LFButton variant="ghost" className="mt-2" onClick={() => setSheet(null)}>
          Go back — keep everything
        </LFButton>
      </Sheet>

      {/* Reset progress (danger zone) */}
      <Sheet open={sheet === 'reset'} onClose={() => setSheet(null)} ariaLabel="Reset my progress">
        <SheetHeader eyebrow="A fresh page" title="Reset progress only?" />
        <p className="text-body text-ink-2 mt-2">Sessions, streaks, minutes, badges, check-ins and your plan are wiped. Your profile, goals, consents and photos stay exactly as they are.</p>
        <div className="mt-5">
          <HoldToConfirm label="Hold to reset progress" onConfirm={confirmResetProgress} />
        </div>
        <LFButton variant="ghost" className="mt-2" onClick={() => setSheet(null)}>
          Keep my progress
        </LFButton>
      </Sheet>

      {/* Evidence explainer */}
      <Sheet open={sheet === 'evidence'} onClose={() => setSheet(null)} ariaLabel="How LumaFace rates evidence">
        <SheetHeader eyebrow="Honest labels" title="How we read the evidence" />
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              { tier: 'A' as const, body: 'Established guidance — the strongest evidence we have, like daily sun protection and gentle cleansing. Dermatologist-recommended guidance.' },
              { tier: 'B' as const, body: 'Limited evidence — may help temporarily, like massage easing the look of morning puffiness. Effects vary and fade.' },
              { tier: 'C' as const, body: 'Preliminary evidence — early research only, like face movement. Enjoy as gentle practice; no structural change is promised.' },
            ]
          ).map(({ tier, body }) => (
            <div key={tier} className="flex items-start gap-3 rounded-tile border border-hairline p-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full font-display font-semibold" style={{ color: TIER_THEME[tier].fg, backgroundColor: TIER_THEME[tier].bg }}>
                {tier}
              </span>
              <div>
                <p className="text-body font-bold text-ink">{TIER_THEME[tier].label}</p>
                <p className="text-caption text-ink-2 mt-0.5">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="font-display italic text-[17px] leading-[24px] text-ink mt-4">“Some ideas are popular long before science catches up. We'd rather under-promise.”</p>
        <p className="text-caption text-ink-2 mt-2">Tier-D claims we never make: no beauty scores, no face reshaping, no spot fat-loss.</p>
        <DisclaimerBlock className="mt-4" />
      </Sheet>

      {/* Wellness disclaimer (full text) */}
      <Sheet open={sheet === 'disclaimer'} onClose={() => setSheet(null)} ariaLabel="Wellness disclaimer">
        <SheetHeader eyebrow="Read us plainly" title="Wellness disclaimer" />
        <DisclaimerBlock className="mt-4" />
        <p className="text-body text-ink-2 mt-4">
          LumaFace provides cosmetic wellness education only. It does not diagnose, prevent, monitor or treat any disease, and it is not a substitute for professional care. Always seek the advice of a qualified health provider with any question about a medical condition, and never delay professional care because of anything in this app.
        </p>
      </Sheet>

      {/* Privacy policy */}
      <Sheet open={sheet === 'privacy'} onClose={() => setSheet(null)} ariaLabel="Privacy policy summary">
        <SheetHeader eyebrow="Your data, your rules" title="Privacy, in plain language" />
        <p className="text-body text-ink mt-3">
          Photos stay on your device. Live camera frames never leave your device. No account needed. No sale of personal data. No facial analysis for advertising or identity.
        </p>
        <p className="text-body text-ink-2 mt-3">
          In this preview build everything — profile, plan, progress, photos, coach threads — is stored only in this device's local storage. Export it or erase it anytime from Profile → Privacy &amp; consent; both work fully offline. The full policy ships with the store release.
        </p>
      </Sheet>

      {/* Terms */}
      <Sheet open={sheet === 'terms'} onClose={() => setSheet(null)} ariaLabel="Terms and subscription terms">
        <SheetHeader eyebrow="Plain and short" title="Terms & subscription terms" />
        <p className="text-body text-ink mt-3">
          Annual: $49.99/year after a 7-day free trial; the trial converts to the annual plan unless canceled at least 24 hours before it ends. Monthly: $9.99/month, no trial. Subscriptions renew automatically at the stated price and interval until canceled — manage or cancel anytime in your store settings (linked above). Refunds are routed through your store. In this demo build no real charge is ever made.
        </p>
        <p className="text-body text-ink-2 mt-3">LumaFace is for adults 18+. It is cosmetic wellness education, never medical advice.</p>
      </Sheet>

      {/* AI disclosure */}
      <Sheet open={sheet === 'ai'} onClose={() => setSheet(null)} ariaLabel="AI disclosure">
        <SheetHeader eyebrow="What the coach is" title="AI disclosure" />
        <p className="text-body text-ink mt-3">{AI_DISCLOSURE}</p>
        <p className="text-body text-ink-2 mt-3">
          In this preview build, responses are simulated locally; no message content leaves your device. When the live coach ships, messages will be processed by our safety-filtered service — sources and uncertainty will remain visible, urgent symptoms will route to professional-care guidance rather than coaching, and chat content is never used for advertising.
        </p>
      </Sheet>
    </div>
  );
}
