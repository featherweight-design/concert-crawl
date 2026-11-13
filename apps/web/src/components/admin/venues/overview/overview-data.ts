import { z } from 'zod';
import type {
  CrawlRunReason,
  CrawlStatus,
  NeedsYouKind,
} from '@concert-crawl/types';

/**
 * The boundary checks on the Overview's three fetches. Each keeps only the
 * fields the cards read; a response that doesn't hold to them takes the same
 * path as a failed fetch (the card's Couldn't load), never a wrong card.
 */

const RUN_STATUSES = [
  'success',
  'failed',
  'partial',
  'skipped',
  'in_progress',
] as const satisfies readonly (CrawlStatus | 'in_progress')[];

const RUN_REASONS = [
  'page_unchanged',
  'crawl_paused',
  'robots_unreachable',
  'robots_disallowed',
  'robots_crawl_delay',
  'timeout',
  'blocked_http',
  'no_events_found',
  'calendar_not_found',
  'llm_account',
  'error',
] as const satisfies readonly CrawlRunReason[];

const NEEDS_YOU_KINDS = [
  'show-dropped',
  'show-moved',
  'venue-failing',
  'venue-blocked',
  'artist',
  'event-low-confidence',
  'price-check',
  'price-batch',
  'bug',
] as const satisfies readonly NeedsYouKind[];

/** `GET /v1/admin/crawl/runs?venueId=&limit=14`, newest first. */
const runsSchema = z.array(
  z.object({
    id: z.string(),
    status: z.enum(RUN_STATUSES),
    // A reason this build doesn't know yet reads as none, not a failed card.
    reason: z.enum(RUN_REASONS).nullable().catch(null),
    createdAt: z.string(),
  }),
);
export type OverviewRun = z.infer<typeof runsSchema>[number];

/** `GET /v1/admin/needs-you?venueId=`: this venue's open items. */
const needsYouSchema = z.array(
  z.object({
    key: z.string(),
    kind: z.enum(NEEDS_YOU_KINDS),
    title: z.string(),
  }),
);
export type OverviewNeedsYouItem = z.infer<typeof needsYouSchema>[number];

/** `GET /v1/admin/needs-you/snoozes?venueId=`: its Not useful snoozes. */
const snoozesSchema = z.array(
  z.object({
    id: z.string(),
    kind: z.enum(NEEDS_YOU_KINDS),
    reason: z.string().nullable(),
    createdAt: z.string(),
    createdByName: z.string(),
  }),
);
export type OverviewSnooze = z.infer<typeof snoozesSchema>[number];

const parseWith =
  <T>(schema: z.ZodType<T>) =>
  (raw: unknown): T | null => {
    const parsed = schema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  };

export const parseOverviewRuns = parseWith(runsSchema);
export const parseOverviewNeedsYou = parseWith(needsYouSchema);
export const parseOverviewSnoozes = parseWith(snoozesSchema);

/** What the page fetched for the Overview; null where a fetch failed. */
export interface OverviewData {
  runs: OverviewRun[] | null;
  needsYou: OverviewNeedsYouItem[] | null;
  snoozes: OverviewSnooze[] | null;
}
