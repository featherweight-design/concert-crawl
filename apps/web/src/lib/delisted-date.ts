import { DENVER_TIME_ZONE } from '@/lib/time';

/**
 * The stale sweep's `delisted_at` as a short Mountain Time date ("Nov 10"), or
 * null when absent or unreadable. Shared by the event page's No longer listed
 * card and the Browse row's source line, so the two always print one date.
 */
export const formatDelistedDate = (
  iso: string | null | undefined,
): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TIME_ZONE,
    month: 'short',
    day: 'numeric',
  }).format(date);
};
