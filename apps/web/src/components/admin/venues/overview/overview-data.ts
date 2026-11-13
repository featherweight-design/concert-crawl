import { z } from 'zod';
import type {
  CrawlRunReason,
  CrawlStatus,
  NeedsYouKind,
} from '@concert-crawl/types';

/**
 * The boundary checks on the Overview's three fetches. Each keeps only the
 * fields the cards read. A body that isn't a list takes the same path as a
 * failed fetch (the card's Couldn't load), never a wrong card; a row this
 * build can't read (a status or kind added since) is dropped on its own.
 */

// Only settled runs are stored: `in_progress` is never persisted.
export const RUN_STATUSES = [
  'success',
  'failed',
  'partial',
  'skipped',
] as const satisfies readonly CrawlStatus[];

export const RUN_REASONS = [
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

/**
 * `GET /v1/admin/crawl/runs?venueId=&limit=`, newest first. The page asks
 * once for the Runs tab's first page too; Last 14 runs reads the newest 14.
 */
const runSchema = z.object({
  id: z.string(),
  status: z.enum(RUN_STATUSES),
  // A reason this build doesn't know yet reads as none, not a failed card.
  reason: z.enum(RUN_REASONS).nullable().catch(null),
  createdAt: z.string(),
});
export type OverviewRun = z.infer<typeof runSchema>;

/** `GET /v1/admin/needs-you?venueId=`: this venue's open items. */
const needsYouItemSchema = z.object({
  key: z.string(),
  kind: z.enum(NEEDS_YOU_KINDS),
  title: z.string(),
});
export type OverviewNeedsYouItem = z.infer<typeof needsYouItemSchema>;

/** `GET /v1/admin/needs-you/snoozes?venueId=`: its Not useful snoozes. */
const snoozeSchema = z.object({
  id: z.string(),
  kind: z.enum(NEEDS_YOU_KINDS),
  reason: z.string().nullable(),
  createdAt: z.string(),
  createdByName: z.string(),
});
export type OverviewSnooze = z.infer<typeof snoozeSchema>;

const rowsSchema = z.array(z.unknown());

/**
 * A list of rows: null when the body isn't a list; otherwise the rows that
 * hold to `row`, so one row this build can't read never costs the card.
 */
export const parseRows =
  <T>(row: z.ZodType<T>) =>
  (raw: unknown): T[] | null => {
    const list = rowsSchema.safeParse(raw);
    if (!list.success) return null;
    const rows: T[] = [];
    for (const item of list.data) {
      const parsed = row.safeParse(item);
      if (parsed.success) rows.push(parsed.data);
    }
    return rows;
  };

export const parseOverviewRuns = parseRows(runSchema);
export const parseOverviewNeedsYou = parseRows(needsYouItemSchema);
export const parseOverviewSnoozes = parseRows(snoozeSchema);

/** What the page fetched for the Overview; null where a fetch failed. */
export interface OverviewData {
  runs: OverviewRun[] | null;
  needsYou: OverviewNeedsYouItem[] | null;
  snoozes: OverviewSnooze[] | null;
}
