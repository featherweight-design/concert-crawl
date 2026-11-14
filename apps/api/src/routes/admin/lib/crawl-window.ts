// The crawl runs and triggers in a time window, in the shape lib/crawl-batches.ts
// groups. Shared by the Crawl runs routes and the Needs you All clear facts.

import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import { crawlRuns, crawlTriggers, db, venues } from '@concert-crawl/db';
import type { BatchRunInput, BatchTriggerInput } from './crawl-batches.js';

// A run row's error text is the whole message the crawl threw; the list only
// needs the start of it, cut in SQL so the rest never leaves the database.
const MAX_ERROR_CHARS = 500;

export interface CrawlWindow {
  runs: BatchRunInput[];
  triggers: BatchTriggerInput[];
}

/**
 * `withErrors: false` leaves every run's error text out (null): a reader that
 * sends no runs, like the batches list, has no use for it.
 */
export const readWindow = async (
  from: Date,
  to: Date,
  { withErrors = true }: { withErrors?: boolean } = {},
): Promise<CrawlWindow> => {
  const [runRows, triggerRows] = await Promise.all([
    db
      .select({
        id: crawlRuns.id,
        venueId: crawlRuns.venueId,
        venueName: venues.name,
        status: crawlRuns.status,
        reason: crawlRuns.reason,
        eventsFound: crawlRuns.eventsFound,
        eventsInserted: crawlRuns.eventsInserted,
        durationMs: crawlRuns.durationMs,
        llmCostUsd: crawlRuns.llmCostUsd,
        // The first of the message only: a run stores everything the crawl threw.
        errorMessage: withErrors
          ? sql<
              string | null
            >`left(${crawlRuns.errorMessage}, ${MAX_ERROR_CHARS})`
          : sql<string | null>`null`,
        createdAt: crawlRuns.createdAt,
      })
      .from(crawlRuns)
      .leftJoin(venues, eq(venues.id, crawlRuns.venueId))
      .where(and(gte(crawlRuns.createdAt, from), lt(crawlRuns.createdAt, to)))
      .orderBy(desc(crawlRuns.createdAt)),
    db
      .select({
        id: crawlTriggers.id,
        venueId: crawlTriggers.venueId,
        venueName: venues.name,
        triggeredBy: crawlTriggers.triggeredBy,
        status: crawlTriggers.status,
        crawlRunId: crawlTriggers.crawlRunId,
        createdAt: crawlTriggers.createdAt,
      })
      .from(crawlTriggers)
      .leftJoin(venues, eq(venues.id, crawlTriggers.venueId))
      .where(
        and(
          gte(crawlTriggers.createdAt, from),
          lt(crawlTriggers.createdAt, to),
        ),
      ),
  ]);
  return {
    runs: runRows,
    triggers: triggerRows,
  };
};

/**
 * Any run or trigger older than `before`: the list has history left to page.
 * Neither table has a created_at index (crawl_runs' leads with venue_id), so
 * each read is an unordered LIMIT 1: Postgres stops at the first old row,
 * and rows are stored oldest first, so with history that is near the start.
 */
export const hasRowsBefore = async (before: Date): Promise<boolean> => {
  const [run, trigger] = await Promise.all([
    db
      .select({ id: crawlRuns.id })
      .from(crawlRuns)
      .where(lt(crawlRuns.createdAt, before))
      .limit(1),
    db
      .select({ id: crawlTriggers.id })
      .from(crawlTriggers)
      .where(lt(crawlTriggers.createdAt, before))
      .limit(1),
  ]);
  return run.length > 0 || trigger.length > 0;
};
