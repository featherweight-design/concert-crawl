import { z } from 'zod';
import type { NeedsYouKind } from '@concert-crawl/types';
import { apiClient } from '@/lib/api';
import { batchesPath } from '@/components/admin/crawl-runs/batch-data';
import type { NightlyBatch } from './health-model';

/**
 * Health's two optional reads, checked at the boundary. Each degrades its own
 * line: a failed or unreadable read returns null, never throws, so the tiles
 * fall back to what they drew before (no Missed pill, no Needs you sentence).
 */

const nightlySchema = z.object({
  kind: z.literal('nightly'),
  night: z.string().nullable(),
  didntStart: z.boolean(),
});

/** The newest row of `GET /v1/admin/crawl/batches?kind=nightly&limit=1`. */
export const parseNewestNightly = (raw: unknown): NightlyBatch | null => {
  const list = z.array(z.unknown()).safeParse(raw);
  if (!list.success || list.data.length === 0) return null;
  const newest = nightlySchema.safeParse(list.data[0]);
  return newest.success
    ? { night: newest.data.night, didntStart: newest.data.didntStart }
    : null;
};

/** The Needs you kinds that put a venue in Needs you (1c Q5). */
const VENUE_KINDS = [
  'venue-failing',
  'venue-blocked',
] as const satisfies readonly NeedsYouKind[];

const venueItemSchema = z.object({
  kind: z.string(),
  venueId: z.string().nullable(),
});

/**
 * The venues with an open venue-failing or venue-blocked item, split by kind
 * from one unfiltered `GET /v1/admin/needs-you` (the API loads the whole queue
 * for any `?kind=`, so one read is the cheap one). An item this build can't
 * read is dropped on its own; a body that isn't a list is null.
 */
export const parseNeedsYouVenueIds = (raw: unknown): Set<string> | null => {
  const list = z.array(z.unknown()).safeParse(raw);
  if (!list.success) return null;
  const ids = new Set<string>();
  for (const item of list.data) {
    const parsed = venueItemSchema.safeParse(item);
    if (
      parsed.success &&
      parsed.data.venueId !== null &&
      VENUE_KINDS.some((kind) => kind === parsed.data.kind)
    ) {
      ids.add(parsed.data.venueId);
    }
  }
  return ids;
};

const quietly = async <T>(
  what: string,
  read: () => Promise<T | null>,
): Promise<T | null> => {
  try {
    const value = await read();
    if (value === null) console.error(`[admin] Health: unreadable ${what}`);
    return value;
  } catch (err) {
    console.error(`[admin] Health failed to load ${what}:`, err);
    return null;
  }
};

export const fetchNewestNightly = (token: string) =>
  quietly('the newest nightly', async () =>
    parseNewestNightly(
      await apiClient.get<unknown>(batchesPath('nightly', 1, null), token),
    ),
  );

export const fetchNeedsYouVenueIds = (token: string) =>
  quietly('the Needs you venues', async () =>
    parseNeedsYouVenueIds(
      await apiClient.get<unknown>('/v1/admin/needs-you', token),
    ),
  );
