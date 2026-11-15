import { asc, gt } from 'drizzle-orm';
import type { Database } from '../client.js';
import {
  syncEventArtists,
  type SyncEventArtistsResult,
} from '../event-artists-sync.js';
import { events } from '../schema/index.js';

/**
 * Admin 4a-2: fill `event_artists` for every event already stored, by running
 * `syncEventArtists` over the whole table in id order. TypeScript rather than
 * SQL in the migration, because canonicalisation parity between SQL and JS has
 * cost a prod bug before (`artists.ts` header).
 *
 * Idempotent: the sync is diff-based, so a second run writes nothing, and an
 * interrupted run resumes by simply running again. Each batch commits in its
 * own transaction, so a failure part-way keeps the batches before it.
 *
 * The CLI entry, its flags and the prod-host guard are in
 * `run-backfill-event-artists.ts`.
 */

export const BACKFILL_BATCH_SIZE = 500;

export interface BackfillEventArtistsOptions {
  dryRun: boolean;
  batchSize?: number;
  /** Called after each batch, for progress output. */
  onBatch?: (batch: SyncEventArtistsResult, total: BackfillTotals) => void;
}

export interface BackfillTotals extends SyncEventArtistsResult {
  batches: number;
}

export const emptyTotals = (): BackfillTotals => ({
  batches: 0,
  events: 0,
  inserted: 0,
  updated: 0,
  deleted: 0,
  unmatched: 0,
});

/** Fold one batch's counts into the running totals. Pure. */
export const addBatch = (
  totals: BackfillTotals,
  batch: SyncEventArtistsResult,
): BackfillTotals => ({
  batches: totals.batches + 1,
  events: totals.events + batch.events,
  inserted: totals.inserted + batch.inserted,
  updated: totals.updated + batch.updated,
  deleted: totals.deleted + batch.deleted,
  unmatched: totals.unmatched + batch.unmatched,
});

/** The one-line summary a run prints. Pure. */
export const formatTotals = (totals: BackfillTotals, dryRun: boolean): string =>
  `${dryRun ? 'DRY RUN, nothing written: would ' : ''}` +
  `insert=${totals.inserted} update=${totals.updated} delete=${totals.deleted} ` +
  `(events=${totals.events} batches=${totals.batches} unmatched-names=${totals.unmatched})`;

export const backfillEventArtists = async (
  database: Database,
  options: BackfillEventArtistsOptions,
): Promise<BackfillTotals> => {
  const batchSize = options.batchSize ?? BACKFILL_BATCH_SIZE;
  let totals = emptyTotals();
  let cursor: string | null = null;
  for (;;) {
    const page: { id: string }[] = await database
      .select({ id: events.id })
      .from(events)
      .where(cursor === null ? undefined : gt(events.id, cursor))
      .orderBy(asc(events.id))
      .limit(batchSize);
    const last = page.at(-1);
    if (last === undefined) break;
    cursor = last.id;
    const ids = page.map((row) => row.id);

    const batch = options.dryRun
      ? await syncEventArtists(database, ids, { dryRun: true })
      : await database.transaction((tx) => syncEventArtists(tx, ids));
    totals = addBatch(totals, batch);
    options.onBatch?.(batch, totals);
  }
  return totals;
};
