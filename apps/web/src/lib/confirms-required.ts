import { SP_POLICY } from '@concert-crawl/types';
import { denverTodayUtcMs } from '@/lib/time';

/**
 * How many confirms a pending price needs, from the show's date, so the
 * imminent-show bump (`SP_POLICY.confirmsRequiredImminent`) is applied the same
 * way everywhere. The price block, the pending cards and the submit sheet's
 * done screen all read it, so none of them hard-codes "2" (#835 Copilot R3).
 *
 * The date math mirrors the server-side `isImminentEvent()` in
 * apps/api/src/lib/time.ts: both sides pin to UTC midnight (the date is a
 * YYYY-MM-DD string in the events.date column), so a same-day evening show
 * stays imminent once the day starts in UTC. Keeping the client and server in
 * step avoids a strip reading "1 of 2" while the server enforces 3 (#835
 * Copilot R4).
 */
export function corroborationConfirmsRequired(eventDate: string): number {
  const parts = eventDate.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year == null || month == null || day == null) {
    return SP_POLICY.confirmsRequired;
  }
  const eventMs = Date.UTC(year, month - 1, day);
  const todayMs = denverTodayUtcMs();
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24);
  const isImminent =
    diffDays >= 0 && diffDays <= SP_POLICY.imminentThresholdDays;
  return isImminent
    ? SP_POLICY.confirmsRequiredImminent
    : SP_POLICY.confirmsRequired;
}
