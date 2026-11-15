import { asc, inArray, sql } from 'drizzle-orm';
import { canonicalizeArtist } from '@concert-crawl/types';
import type { Database } from './client.js';
import {
  artists,
  eventArtists,
  events,
  type EventArtistRole,
} from './schema/index.js';

/**
 * Admin 4a-2: rebuilds `event_artists` from an event's artist arrays.
 *
 * During the expand phase `event_artists` is a PROJECTION of the four artist
 * arrays on `events`, which stay the source of truth (plan
 * `docs/superpowers/plans/2026-11-13-admin-4a-events-data.md`, Decision 5).
 * This module is the only code that writes the table. It is NOT called by
 * every writer of the arrays, so the table can lag them:
 *
 * - Synced: the crawl (rows it upserted, and unchanged rows naming an artist
 *   it just created), Repair event artists (rows it rewrote, after they
 *   commit) and the duplicate-night cleanup (the survivor, after its fill).
 * - Not synced: one-off scripts that write the arrays, an admin hiding a show,
 *   and anything else outside those three. Such a row is brought up to date
 *   the next time the crawl rewrites it, or by the backfill.
 *
 * The rules, read off the arrays:
 *
 * - Headliners come in `headliners` DISPLAY order, each run through
 *   `canonicalizeArtist` and looked up by `artists.canonical_name`.
 *   `canonical_headliners` is sorted, so it never decides position.
 * - When `canonical_headliners` is NULL (the ladder never ruled), there are no
 *   headliners. `canonical_artist` is often a title, so it is never used as
 *   one; that matches `projectArtists`, which projects nothing on NULL.
 * - Supports follow, from `supporting_artists` the same way.
 * - An artist billed twice keeps its headliner row.
 * - A show hidden from consumers (not a concert, or hidden by an admin) has no
 *   rows, matching what `projectArtists` and the artists backfill project.
 * - A name with no `artists` row gets no row: there is nothing to link to. Its
 *   text stays in the arrays, and it keeps its place in the lineup, so
 *   `position` has a gap there that a later sync fills without moving anyone.
 *
 * `position` runs across the whole lineup, headliners first, so ordering by it
 * alone gives the bill.
 *
 * The lineup lock (`lineup_edited_at`) and shows added by hand are honoured
 * upstream: the writers of the arrays leave a locked bill alone, so a rebuild
 * reproduces the admin's lineup rather than the venue's.
 *
 * Idempotent and diff-based: a row already right is never rewritten, so a
 * re-run writes nothing. Each chunk reads the arrays and writes its rows in
 * one transaction with the event rows locked (a savepoint inside a caller's
 * transaction), so it always projects the arrays as committed.
 */

/** `db` itself, or the `tx` a `db.transaction` callback receives. */
export type DbExecutor =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0];

/** The columns of `events` a lineup is rebuilt from. */
export interface LineupSource {
  headliners: string[] | null;
  supportingArtists: string[] | null;
  canonicalHeadliners: string[] | null;
  canonicalSupporting: string[] | null;
}

export interface LineupSlot {
  canonicalName: string;
  role: EventArtistRole;
  position: number;
}

export interface EventArtistRow {
  eventId: string;
  artistId: string;
  role: EventArtistRole;
  position: number;
}

export interface EventArtistsDiff {
  insert: EventArtistRow[];
  update: EventArtistRow[];
  delete: { eventId: string; artistId: string }[];
}

export interface SyncEventArtistsResult {
  /** Events that exist among those asked for. */
  events: number;
  inserted: number;
  updated: number;
  deleted: number;
  /** Billed names with no `artists` row, so no `event_artists` row. */
  unmatched: number;
}

export interface SyncEventArtistsOptions {
  /** Count what would change and write nothing. */
  dryRun?: boolean;
}

// Keeps every `IN (...)` list well under Postgres' bind-parameter ceiling.
const CHUNK = 500;

const chunks = <T>(items: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let start = 0; start < items.length; start += CHUNK) {
    out.push(items.slice(start, start + CHUNK));
  }
  return out;
};

/**
 * The event's lineup as canonical names, in bill order, headliners first. Pure.
 */
export const plannedLineup = (source: LineupSource): LineupSlot[] => {
  const headlinerNames =
    source.canonicalHeadliners === null
      ? []
      : (source.headliners?.map(canonicalizeArtist) ??
        source.canonicalHeadliners);
  const supportNames =
    source.supportingArtists?.map(canonicalizeArtist) ??
    source.canonicalSupporting ??
    [];

  const slots: LineupSlot[] = [];
  const seen = new Set<string>();
  const add = (names: readonly string[], role: EventArtistRole): void => {
    for (const name of names) {
      if (name === '' || seen.has(name)) continue;
      seen.add(name);
      slots.push({ canonicalName: name, role, position: slots.length });
    }
  };
  add(headlinerNames, 'headliner');
  add(supportNames, 'support');
  return slots;
};

/**
 * The rows an event should have, given the artist ids known by canonical name,
 * and how many billed names had no artist. The lineup is already one slot per
 * canonical name, and `artists.canonical_name` is unique, so each artist
 * appears once. Pure.
 */
export const desiredEventArtists = (
  eventId: string,
  lineup: readonly LineupSlot[],
  artistIdByCanonical: ReadonlyMap<string, string>,
): { rows: EventArtistRow[]; unmatched: number } => {
  const rows: EventArtistRow[] = [];
  let unmatched = 0;
  for (const slot of lineup) {
    const artistId = artistIdByCanonical.get(slot.canonicalName);
    if (artistId === undefined) {
      unmatched += 1;
      continue;
    }
    rows.push({ eventId, artistId, role: slot.role, position: slot.position });
  }
  return { rows, unmatched };
};

const rowKey = (row: { eventId: string; artistId: string }): string =>
  `${row.eventId}|${row.artistId}`;

/**
 * What turns `existing` into `desired`. A row whose role and position already
 * match is left alone. Pure, and what a dry run counts.
 */
export const diffEventArtists = (
  desired: readonly EventArtistRow[],
  existing: readonly EventArtistRow[],
): EventArtistsDiff => {
  const existingByKey = new Map(existing.map((row) => [rowKey(row), row]));
  const desiredKeys = new Set(desired.map(rowKey));
  const diff: EventArtistsDiff = { insert: [], update: [], delete: [] };
  for (const row of desired) {
    const current = existingByKey.get(rowKey(row));
    if (current === undefined) diff.insert.push(row);
    else if (current.role !== row.role || current.position !== row.position) {
      diff.update.push(row);
    }
  }
  for (const row of existing) {
    if (!desiredKeys.has(rowKey(row))) {
      diff.delete.push({ eventId: row.eventId, artistId: row.artistId });
    }
  }
  return diff;
};

/** One chunk: read the arrays under a row lock, then write the difference. */
const syncChunk = async (
  tx: DbExecutor,
  ids: string[],
  options: SyncEventArtistsOptions,
): Promise<SyncEventArtistsResult> => {
  const counts: SyncEventArtistsResult = {
    events: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unmatched: 0,
  };
  const sourceQuery = tx
    .select({
      id: events.id,
      headliners: events.headliners,
      supportingArtists: events.supportingArtists,
      canonicalHeadliners: events.canonicalHeadliners,
      canonicalSupporting: events.canonicalSupporting,
      hiddenFromConsumer: events.hiddenFromConsumer,
    })
    .from(events)
    .where(inArray(events.id, ids))
    // Id order, so two syncs over overlapping events cannot deadlock.
    .orderBy(asc(events.id));
  // A dry run writes nothing, so it has no write to protect.
  const sources = options.dryRun
    ? await sourceQuery
    : await sourceQuery.for('update');
  if (sources.length === 0) return counts;
  counts.events = sources.length;

  const lineups = sources.map((source) => ({
    eventId: source.id,
    lineup: source.hiddenFromConsumer ? [] : plannedLineup(source),
  }));

  const names = [
    ...new Set(
      lineups.flatMap(({ lineup }) => lineup.map((slot) => slot.canonicalName)),
    ),
  ];
  const artistIdByCanonical = new Map<string, string>();
  for (const nameChunk of chunks(names)) {
    const found = await tx
      .select({ id: artists.id, canonicalName: artists.canonicalName })
      .from(artists)
      .where(inArray(artists.canonicalName, nameChunk));
    for (const artist of found) {
      artistIdByCanonical.set(artist.canonicalName, artist.id);
    }
  }

  const desired: EventArtistRow[] = [];
  for (const { eventId, lineup } of lineups) {
    const planned = desiredEventArtists(eventId, lineup, artistIdByCanonical);
    desired.push(...planned.rows);
    counts.unmatched += planned.unmatched;
  }

  const existing = await tx
    .select({
      eventId: eventArtists.eventId,
      artistId: eventArtists.artistId,
      role: eventArtists.role,
      position: eventArtists.position,
    })
    .from(eventArtists)
    .where(
      inArray(
        eventArtists.eventId,
        sources.map((source) => source.id),
      ),
    );

  const diff = diffEventArtists(desired, existing);
  counts.inserted = diff.insert.length;
  counts.updated = diff.update.length;
  counts.deleted = diff.delete.length;
  if (options.dryRun) return counts;

  // One statement per chunk of stale pairs, matched as row values.
  for (const staleChunk of chunks(diff.delete)) {
    await tx.delete(eventArtists).where(
      sql`(${eventArtists.eventId}, ${eventArtists.artistId}) IN (${sql.join(
        staleChunk.map(
          (row) => sql`(${row.eventId}::uuid, ${row.artistId}::uuid)`,
        ),
        sql`, `,
      )})`,
    );
  }

  // Inserts and updates go through one upsert, keyed on the primary key.
  for (const writeChunk of chunks([...diff.insert, ...diff.update])) {
    await tx
      .insert(eventArtists)
      .values(writeChunk)
      .onConflictDoUpdate({
        target: [eventArtists.eventId, eventArtists.artistId],
        set: {
          role: sql`excluded.role`,
          position: sql`excluded.position`,
        },
      });
  }
  return counts;
};

/**
 * Rebuild `event_artists` for these events from their artist arrays. See the
 * file header for the rules. Returns what changed (or, on a dry run, what
 * would).
 */
export const syncEventArtists = async (
  executor: DbExecutor,
  eventIds: readonly string[],
  options: SyncEventArtistsOptions = {},
): Promise<SyncEventArtistsResult> => {
  const result: SyncEventArtistsResult = {
    events: 0,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unmatched: 0,
  };
  for (const ids of chunks([...new Set(eventIds)])) {
    // One transaction per chunk (a savepoint when the caller already holds
    // one), with its event rows locked from the read to the write. A
    // concurrent writer of the arrays (Repair, the duplicate-night fill, an
    // admin lineup save) either commits before the read, and is projected, or
    // waits until this commits: a stale read never writes an old lineup back.
    const counts = await executor.transaction((tx) =>
      syncChunk(tx, ids, options),
    );
    result.events += counts.events;
    result.inserted += counts.inserted;
    result.updated += counts.updated;
    result.deleted += counts.deleted;
    result.unmatched += counts.unmatched;
  }
  return result;
};

/**
 * Remove every `event_artists` row of these events, one statement per chunk.
 * For a show the crawl now reads as not a concert: its listing bill names
 * nobody, whatever its stored arrays say.
 */
export const clearEventArtists = async (
  executor: DbExecutor,
  eventIds: readonly string[],
): Promise<number> => {
  let deleted = 0;
  for (const ids of chunks([...new Set(eventIds)])) {
    const removed = await executor
      .delete(eventArtists)
      .where(inArray(eventArtists.eventId, ids))
      .returning({ eventId: eventArtists.eventId });
    deleted += removed.length;
  }
  return deleted;
};
