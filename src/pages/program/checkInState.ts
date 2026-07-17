/**
 * Shared check-in scheduling helpers (program.md §4 + checkin.md).
 * Check-in days are 7/14/21/28; the check-in itself is never paywalled
 * (it is a safety feature) — free users run the Day-7 check-in with the
 * starter plan, while the adjusted Week 2+ day cells stay PRO-locked.
 */

import { CHECK_IN_DAYS } from '@/data/program';
import type { CheckInRecord } from '@/lib/store';

/** The check-in day this flow should collect now. */
export function checkInDayFor(checkIns: CheckInRecord[], currentDay: number): number {
  const recorded = new Set(checkIns.map((c) => c.day));
  const due = (CHECK_IN_DAYS as readonly number[]).find((d) => !recorded.has(d) && d <= currentDay);
  if (due !== undefined) return due;
  // nothing due yet (early tap, or free starter before day 7) → next pending
  return (CHECK_IN_DAYS as readonly number[]).find((d) => !recorded.has(d)) ?? 28;
}

/** True when a check-in for `day` is pending and the user has reached it. */
export function isCheckInDue(checkIns: CheckInRecord[], currentDay: number, day: number): boolean {
  return !checkIns.some((c) => c.day === day) && currentDay >= day;
}

/** The check-in record whose adjustment shaped program week `week` (1–4). */
export function adjustmentForWeek(checkIns: CheckInRecord[], week: number): CheckInRecord | undefined {
  if (week <= 1) return undefined;
  return checkIns.find((c) => c.day === (week - 1) * 7);
}
