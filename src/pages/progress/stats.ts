/**
 * Progress stats helpers — pure functions behind `/progress` (progress.md):
 * month grid, streak math, comfort echo, badge progress, milestones.
 * Everything derives from habit data (dailyLog / comfortLog / badges) —
 * never from appearance.
 */

import type { CheckInRecord, ComfortEntry, ProgressState } from '@/lib/store';
import { BADGES } from '@/data/content';

export interface MonthCell {
  /** YYYY-MM-DD */
  key: string;
  day: number;
  future: boolean;
  today: boolean;
}

/** Monday-first month cells (null = leading blank), local-time based. */
export function monthCells(year: number, month: number, todayKeyStr: string): (MonthCell | null)[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) {
    const m = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const key = `${year}-${m}-${dd}`;
    cells.push({ key, day: d, future: key > todayKeyStr, today: key === todayKeyStr });
  }
  return cells;
}

/** Ritual intensity for the heatmap (progress.md §2). */
export function dayIntensity(itemCount: number): 'none' | 'partial' | 'full' {
  if (itemCount <= 0) return 'none';
  // 3 AM basics + at least one guided moment = the full ritual
  return itemCount >= 4 ? 'full' : 'partial';
}

/** Longest consecutive-days run with any ritual activity. */
export function longestStreak(dailyLog: Record<string, string[]>): number {
  const days = Object.keys(dailyLog)
    .filter((k) => (dailyLog[k]?.length ?? 0) > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of days) {
    const t = new Date(k + 'T00:00:00').getTime();
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    if (run > best) best = run;
    prev = t;
  }
  return best;
}

const COMFORT_LABEL: Record<number, string> = { 1: 'comfortable', 2: 'a little much', 3: 'uncomfortable' };

/** "This month you mostly felt: comfortable (82% of sessions)" (§2 comfort echo). */
export function comfortEcho(comfortLog: ComfortEntry[], year: number, month: number): { label: string; pct: number } | null {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const entries = comfortLog.filter((e) => e.date.startsWith(prefix));
  if (entries.length === 0) return null;
  const counts = [0, 0, 0, 0];
  for (const e of entries) counts[e.comfortLevel]++;
  const level = counts[1] >= counts[2] && counts[1] >= counts[3] ? 1 : counts[2] >= counts[3] ? 2 : 3;
  return { label: COMFORT_LABEL[level], pct: Math.round((counts[level] / entries.length) * 100) };
}

export function comfortLabelFor(level: number): string {
  return COMFORT_LABEL[level] ?? 'comfortable';
}

/* ── Badges (§3 — habits only) ─────────────────────────────────────────── */

export interface BadgeProgress {
  current: number;
  target: number;
  unit: string;
}

export function badgeProgress(badgeId: string, p: ProgressState): BadgeProgress {
  switch (badgeId) {
    case 'first-light':
      return { current: Math.min(p.sessions, 1), target: 1, unit: 'session' };
    case 'three-day-rhythm':
      return { current: Math.min(p.streak, 3), target: 3, unit: 'days' };
    case 'diamond-week':
      return { current: Math.min(p.streak, 7), target: 7, unit: 'days' };
    case 'full-circle':
      return { current: Math.min(p.completedDays.length, 28), target: 28, unit: 'program days' };
    case 'century-of-care':
      return { current: Math.min(p.sessions, 100), target: 100, unit: 'sessions' };
    case 'early-ritual':
      return { current: Math.min(p.earlySessions, 5), target: 5, unit: 'early sessions' };
    default:
      return { current: 0, target: 1, unit: '' };
  }
}

/* ── Milestones (§5 — habit/safety events only) ────────────────────────── */

export interface Milestone {
  /** sortable ISO/ymd date */
  date: string;
  text: string;
  tone: 'gold' | 'sage';
}

export function buildMilestones(
  progress: ProgressState,
  checkIns: CheckInRecord[],
  photoCount: number,
  firstPhotoAt?: string,
): Milestone[] {
  const out: Milestone[] = [];
  const firstDay = Object.keys(progress.dailyLog)
    .filter((k) => (progress.dailyLog[k]?.length ?? 0) > 0)
    .sort()[0];
  if (firstDay) out.push({ date: firstDay, text: 'Day 1 — Your ritual began', tone: 'sage' });
  for (const c of checkIns) {
    out.push({ date: c.date, text: `Week ${Math.ceil(c.day / 7)} check-in — plan adjusted`, tone: 'sage' });
  }
  for (const b of BADGES) {
    const at = progress.badges[b.id];
    if (at) out.push({ date: at, text: `${b.name} earned`, tone: 'gold' });
  }
  if (photoCount > 0 && firstPhotoAt) {
    out.push({ date: firstPhotoAt, text: 'First photo saved on this device', tone: 'gold' });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
