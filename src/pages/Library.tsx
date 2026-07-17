/**
 * Library — `/library` (design/library.md).
 * The complete 24-activity catalog: 6 signature-tinted category sections,
 * evidence-tier badges on every card, free/PRO locks, live search + filter
 * chips, and a "Good first weeks" start-here strip. Safety content is never
 * paywalled; tapping a locked card wiggles its lock, then opens the paywall.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Droplets,
  Eye,
  Hand,
  Leaf,
  Lock,
  PersonStanding,
  Search,
  Smile,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/store';
import {
  CATEGORY_ORDER,
  CATEGORY_THEME,
  EASE_OUT_SOFT,
  SPRING_TAP,
  formatMinutes,
  type ActivityCategoryId,
} from '@/lib/theme';
import { ACTIVITIES, getActivity, type Activity } from '@/data/activities';
import { GOALS } from '@/data/content';
import ActivityRow from '@/components/ActivityRow';
import EvidenceTierBadge from '@/components/EvidenceTierBadge';
import SectionHeader from '@/components/SectionHeader';
import Sheet from '@/components/Sheet';
import { Chip, LFButton } from '@/components/ui';
import { EmptyPhotos, FaceIllo } from '@/components/illos';

const EASE = EASE_OUT_SOFT;

const CATEGORY_ICONS: Record<ActivityCategoryId, typeof Droplets> = {
  skincare: Droplets,
  massage: Hand,
  movement: Smile,
  'eye-forehead': Eye,
  'neck-posture': PersonStanding,
  relaxation: Leaf,
};

/* ── Filters ───────────────────────────────────────────────────────────── */

type FilterId = 'all' | 'free' | ActivityCategoryId | 'tier-a' | 'tier-b' | 'tier-c' | 'gentle' | 'no-tools';

const CATEGORY_ID_SET = new Set<string>(CATEGORY_ORDER);

const FILTER_CHIPS: { id: FilterId; label: string; dot?: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  ...CATEGORY_ORDER.map((c) => ({ id: c as FilterId, label: CATEGORY_THEME[c].name, dot: CATEGORY_THEME[c].hue })),
  { id: 'tier-a', label: 'Tier A' },
  { id: 'tier-b', label: 'Tier B' },
  { id: 'tier-c', label: 'Tier C' },
  { id: 'gentle', label: 'Gentle' },
  { id: 'no-tools', label: 'No tools' },
];

function matchesFilter(a: Activity, filter: FilterId): boolean {
  switch (filter) {
    case 'all': return true;
    case 'free': return a.free;
    case 'tier-a': return a.evidenceTier === 'A';
    case 'tier-b': return a.evidenceTier === 'B';
    case 'tier-c': return a.evidenceTier === 'C';
    case 'gentle': return a.difficulty === 'Gentle';
    case 'no-tools': return a.equipment === 'none';
    default: return a.category === filter;
  }
}

const GOAL_NAME_BY_ID = new Map(GOALS.map((g) => [g.id, g.name.toLowerCase()]));

function matchesSearch(a: Activity, q: string): boolean {
  const haystack = [
    a.title,
    CATEGORY_THEME[a.category].name,
    a.frequency,
    a.equipment,
    `tier ${a.evidenceTier}`,
    ...a.goalIds.map((g) => GOAL_NAME_BY_ID.get(g) ?? g),
  ]
    .join(' ')
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/* ── "Good first weeks" collections (library.md §2) ────────────────────── */

interface Collection {
  id: string;
  name: string;
  category: ActivityCategoryId;
  meta: string;
  activityIds: string[];
  /** PRO collections show the lock chip; tap → paywall for free users */
  pro: boolean;
}

const COLLECTIONS: Collection[] = [
  { id: 'morning-basics', name: 'Morning Basics', category: 'skincare', meta: '3 steps · 2 min · Tier A', activityIds: ['am-gentle-cleanse', 'am-moisturizer', 'daily-sunscreen'], pro: false },
  { id: 'unclench', name: 'Unclench', category: 'relaxation', meta: '3 moves · 3 min · relaxation', activityIds: ['neutral-jaw-rest', 'smile-release', 'lower-face-release'], pro: false },
  { id: 'depuff-morning', name: 'De-Puff Morning', category: 'massage', meta: '2 moves · 4 min · Tier B', activityIds: ['morning-depuff-glide', 'cool-compress-depuff'], pro: true },
  { id: 'desk-break', name: 'Desk Break', category: 'neck-posture', meta: '2 moves · 2 min · posture', activityIds: ['shoulder-reset', 'side-neck-stretch'], pro: true },
];

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function Library() {
  const navigate = useNavigate();
  const { isActivityLocked } = useApp();

  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [wigglingId, setWigglingId] = useState<string | null>(null);
  const [openCollection, setOpenCollection] = useState<Collection | null>(null);

  const sectionRefs = useRef<Partial<Record<ActivityCategoryId, HTMLElement | null>>>({});

  /* 150ms debounce on the search field (library.md §1) */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => window.clearTimeout(t);
  }, [query]);

  const filtered = useMemo(
    () => ACTIVITIES.filter((a) => matchesFilter(a, filter) && (!debouncedQuery || matchesSearch(a, debouncedQuery))),
    [filter, debouncedQuery],
  );

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        items: filtered.filter((a) => a.category === cat),
      })).filter((s) => s.items.length > 0),
    [filtered],
  );

  /** Locked-card tap: lock wiggle (-6°→6°→0, 0.4s), paywall after 0.45s. */
  const openActivity = (a: Activity) => {
    if (isActivityLocked(a.activityId)) {
      setWigglingId(a.activityId);
      window.setTimeout(() => navigate('/paywall'), 450);
      return;
    }
    navigate(`/activity/${a.activityId}`, { state: { origin: '/library' } });
  };

  const selectCategoryChip = (cat: ActivityCategoryId) => {
    setFilter(cat);
    // scroll the section into view once the filter has been applied
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        sectionRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    });
  };

  const openCollectionSheet = (c: Collection) => {
    const lockedForUser = c.pro && c.activityIds.some((id) => isActivityLocked(id));
    if (lockedForUser) {
      navigate('/paywall');
      return;
    }
    setOpenCollection(c);
  };

  return (
    <div className="pb-10">
      {/* ── 1 · Header ── */}
      <header className="px-5 pt-4">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="font-display text-display-lg text-ink"
        >
          Library
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05, ease: EASE }}
          className="text-caption text-ink-2 mt-1"
        >
          {ACTIVITIES.length} guided activities · every one labeled by evidence
        </motion.p>

        {/* Evidence legend row — tap a badge for the explainer sheet */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: EASE }}
          className="mt-3 flex items-center gap-2 flex-wrap"
        >
          <EvidenceTierBadge tier="A" mini />
          <EvidenceTierBadge tier="B" mini />
          <EvidenceTierBadge tier="C" mini />
          <span className="text-caption text-ink-2">A established · B limited/temporary · C preliminary</span>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          className="mt-3.5 relative"
        >
          <Search size={17} className="absolute start-4 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search an activity or goal…"
            aria-label="Search an activity or goal"
            className="w-full h-12 rounded-full bg-cream-2 ps-11 pe-11 text-body text-ink placeholder:text-ink-3 border border-transparent focus:border-rose focus:outline-none focus:ring-[1.5px] focus:ring-rose transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search text"
              className="absolute end-2 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-ink-3"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      </header>

      {/* Filter chips — sticky under the condensed TopBrandBar (54px) */}
      <div className="sticky top-[54px] z-30 mt-3.5 bg-cream/90 backdrop-blur-[10px] py-2 -mx-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar snap-x px-5" role="group" aria-label="Filter activities">
          {FILTER_CHIPS.map((chip, i) => (
            <motion.span
              key={chip.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.16 + i * 0.04, ease: EASE }}
              className="snap-start shrink-0"
            >
              <Chip
                selected={filter === chip.id}
                dotColor={chip.dot}
                onClick={() => (CATEGORY_ID_SET.has(chip.id) ? selectCategoryChip(chip.id as ActivityCategoryId) : setFilter(chip.id))}
              >
                {chip.label}
              </Chip>
            </motion.span>
          ))}
        </div>
      </div>

      {/* ── 2 · "Good first weeks" strip (unfiltered) ── */}
      <section aria-label="Good first weeks">
        <SectionHeader eyebrow="Little rituals" title="Good first weeks" className="px-5" />
        <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x px-5 pb-1">
          {COLLECTIONS.map((c, i) => {
            const theme = CATEGORY_THEME[c.category];
            const lockedForUser = c.pro && c.activityIds.some((id) => isActivityLocked(id));
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => openCollectionSheet(c)}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: EASE }}
                whileTap={SPRING_TAP}
                className="snap-start shrink-0 w-[220px] rounded-[20px] p-4 text-start shadow-card"
                style={{ backgroundColor: theme.tint }}
                aria-label={`${c.name} collection — ${c.meta}${lockedForUser ? ' — PRO' : ''}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display font-semibold text-[18px] leading-[23px]" style={{ color: theme.deep }}>
                    {c.name}
                  </span>
                  {lockedForUser && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-tint px-2 py-1 text-[10px] font-bold text-violet shrink-0">
                      <Lock size={10} strokeWidth={2.25} aria-hidden="true" />
                      PRO
                    </span>
                  )}
                </span>
                <span className="block text-caption mt-0.5" style={{ color: theme.deep, opacity: 0.8 }}>
                  {c.meta}
                </span>
                <span className="mt-3 flex items-center justify-between">
                  <span className="flex" aria-hidden="true">
                    {c.activityIds.slice(0, 3).map((id, j) => {
                      const a = getActivity(id);
                      return (
                        <span
                          key={id}
                          className={cn('size-9 overflow-hidden rounded-arch border-2 border-card', j > 0 && '-ms-2.5')}
                          style={{ backgroundColor: theme.hue }}
                        >
                          {a && <FaceIllo name={a.media.illustration} className="size-9" />}
                        </span>
                      );
                    })}
                  </span>
                  <ArrowRight size={17} style={{ color: theme.deep }} className="rtl:-scale-x-100" aria-hidden="true" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── 3 · Category sections ── */}
      {sections.length === 0 ? (
        /* Empty-search state (library.md) */
        <div className="px-5 pt-10 pb-6 flex flex-col items-center text-center">
          <EmptyPhotos className="w-40" />
          <h2 className="font-display text-title text-ink mt-4">Nothing matches</h2>
          <p className="text-body text-ink-2 mt-1.5 max-w-[30ch]">Try 'jaw', 'puffiness', or 'SPF'.</p>
          <LFButton
            variant="ghost"
            fullWidth={false}
            className="mt-3 underline underline-offset-4"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Clear search
          </LFButton>
        </div>
      ) : (
        sections.map(({ cat, items }) => {
          const theme = CATEGORY_THEME[cat];
          const Icon = CATEGORY_ICONS[cat];
          return (
            <motion.section
              key={cat}
              ref={(el) => {
                sectionRefs.current[cat] = el;
              }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mt-6 rounded-[28px] px-5 py-6 scroll-mt-[104px]"
              style={{ backgroundColor: theme.tint }}
              aria-label={theme.name}
            >
              {/* Section header */}
              <div className="flex items-center gap-2.5">
                <Icon size={20} strokeWidth={1.75} style={{ color: theme.deep }} aria-hidden="true" />
                <h2 className="font-display text-title" style={{ color: theme.deep }}>
                  {theme.name}
                </h2>
              </div>
              <p className="text-caption mt-1" style={{ color: theme.deep, opacity: 0.75 }}>
                {theme.honestLine} · {items.length} {items.length === 1 ? 'activity' : 'activities'}
              </p>

              {/* Activity cards */}
              <div className="mt-4 flex flex-col gap-3">
                {items.map((a, i) => {
                  const locked = isActivityLocked(a.activityId);
                  const wiggling = wigglingId === a.activityId;
                  return (
                    <motion.button
                      key={a.activityId}
                      type="button"
                      onClick={() => openActivity(a)}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.55, delay: i * 0.07, ease: EASE }}
                      whileTap={SPRING_TAP}
                      className="w-full bg-card rounded-[20px] shadow-card p-3.5 flex items-center gap-3 text-start hover:shadow-pop transition-shadow"
                      aria-label={`${a.title} — ${formatMinutes(a.durationSeconds)}, evidence tier ${a.evidenceTier}${locked ? ', locked with PRO' : ''}`}
                    >
                      <span
                        className="w-[72px] h-[88px] shrink-0 overflow-hidden rounded-arch flex items-end justify-center"
                        style={{ backgroundColor: theme.hue }}
                        aria-hidden="true"
                      >
                        <FaceIllo name={a.media.illustration} className="w-[72px] h-[88px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-semibold text-[17px] leading-[22px] text-ink">{a.title}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-caption text-ink-2 flex-wrap">
                          <span>{formatMinutes(a.durationSeconds)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{a.difficulty}</span>
                          <EvidenceTierBadge tier={a.evidenceTier} mini interactive={false} className="ms-0.5" />
                        </span>
                        <span className="block text-caption text-ink-2 mt-1 leading-[16px]">
                          {a.expectedOutcome.split('. ')[0]}.
                        </span>
                      </span>
                      {locked ? (
                        <motion.span
                          animate={wiggling ? { rotate: [-6, 6, 0] } : undefined}
                          transition={{ duration: 0.4 }}
                          className="shrink-0 inline-flex"
                          aria-hidden="true"
                        >
                          <Lock size={17} className="text-ink-3" />
                        </motion.span>
                      ) : (
                        <ChevronRight size={18} className="shrink-0 text-ink-3 rtl:-scale-x-100" aria-hidden="true" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          );
        })
      )}

      {/* ── Collection quick-view sheet ── */}
      <Sheet open={openCollection !== null} onClose={() => setOpenCollection(null)} ariaLabel={openCollection ? `${openCollection.name} collection` : 'Collection'}>
        {openCollection && (
          <>
            <p className="text-eyebrow uppercase mt-1" style={{ color: CATEGORY_THEME[openCollection.category].deep }}>
              Good first weeks
            </p>
            <h3 className="font-display text-display-md text-ink mt-1">{openCollection.name}</h3>
            <p className="text-caption text-ink-2 mt-1">{openCollection.meta}</p>
            <div className="mt-4 flex flex-col gap-3.5">
              {openCollection.activityIds.map((id) => {
                const a = getActivity(id);
                if (!a) return null;
                const locked = isActivityLocked(id);
                return (
                  <ActivityRow
                    key={id}
                    activity={a}
                    locked={locked}
                    onClick={() => {
                      setOpenCollection(null);
                      if (locked) navigate('/paywall');
                      else navigate(`/activity/${id}`, { state: { origin: '/library' } });
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
