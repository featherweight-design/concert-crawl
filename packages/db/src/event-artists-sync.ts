import { and, eq, inArray, sql } from 'drizzle-orm';
import { canonicalizeArtist } from '@concert-crawl/types';
import type { Database } from './client.js';
import {
  artists,
  eventArtists,
  events,
  type EventArtistRole,
} from './schema/index.js';

/**
 * Admin 4a-2: the one writer of `event_artists`.
 *
 * During the expand phase `event_artists` is a PROJECTION of the four artist
 * arrays on `events`, which stay the source of truth (plan
 * `docs/superpowers/plans/2026-11-13-admin-4a-events-data.md`, Decision 5).
 * `syncEventArtists` rebuilds an event's rows from those arrays, so the table
 * and the arrays cannot disagree:
 *
 * - Headliners come in `headliners` DISPLAY order, each run through
 *   `canonicalizeArtist` and looked up by `artists.canonical_name`.
 *   `canonical_headliners` is sorted, so it never decides position.
 * - Supports follow, from `supporting_artists` the same way.
 * - When `canonical_headliners` is NULL (the ladder never ruled),
 *   `canonical_artist` is the lone headliner, mirroring `billsCanonicalName`.
 * - An artist billed twice keeps its headliner row.
 * - A name with no `artists` row gets no row: there is nothing to link to. It
 *   keeps its place in the lineup, so `position` has a gap there, and the next
 *   sync after `projectArtists` (or the backfill) creates the artist fills it
 *   without moving anyone else.
 *
 * `position` runs across the whole lineup, headliners first, so ordering by it
 * alone gives the bill.
 *
 * The lineup lock (`lineup_edited_at`) and shows added by hand are honoured
 * upstream: every writer of the arrays (the crawl upsert, Repair, the
 * duplicate-night fill) already leaves a locked bill alone, so a rebuild from
 * the arrays reproduces the admin's lineup rather than the venue's.
 *
 * Idempotent and diff-based: a row already right is never rewritten, so a
 * re-run writes nothing. Runs on whatever executor it is handed, so a caller
 * holding a transaction passes `tx` and the rebuild commits or rolls back with
 * its own write.
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
  canonicalArtist: string;
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
      ? [source.canonicalArtist]
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
 * and how many billed names had no artist. Pure.
 */
export const desiredEventArtists = (
  eventId: string,
  lineup: readonly LineupSlot[],
  artistIdByCanonical: ReadonlyMap<string, string>,
): { rows: EventArtistRow[]; unmatched: number } => {
  const rows: EventArtistRow[] = [];
  const linked = new Set<string>();
  let unmatched = 0;
  for (const slot of lineup) {
    const artistId = artistIdByCanonical.get(slot.canonicalName);
    if (artistId === undefined) {
      unmatched += 1;
      continue;
    }
    // Two spellings can fold to one artist only through an admin rename; the
    // first (headliner-most) slot keeps it, as the primary key requires.
    if (linked.has(artistId)) continue;
    linked.add(artistId);
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
    const sources = await executor
      .select({
        id: events.id,
        headliners: events.headliners,
        supportingArtists: events.supportingArtists,
        canonicalHeadliners: events.canonicalHeadliners,
        canonicalSupporting: events.canonicalSupporting,
        canonicalArtist: events.canonicalArtist,
      })
      .from(events)
      .where(inArray(events.id, ids));
    if (sources.length === 0) continue;
    result.events += sources.length;

    const lineups = sources.map((source) => ({
      eventId: source.id,
      lineup: plannedLineup(source),
    }));

    const names = [
      ...new Set(
        lineups.flatMap(({ lineup }) =>
          lineup.map((slot) => slot.canonicalName),
        ),
      ),
    ];
    const artistIdByCanonical = new Map<string, string>();
    for (const nameChunk of chunks(names)) {
      const found = await executor
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
      result.unmatched += planned.unmatched;
    }

    const existing = await executor
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
    result.inserted += diff.insert.length;
    result.updated += diff.update.length;
    result.deleted += diff.delete.length;
    if (options.dryRun) continue;

    const staleByEvent = new Map<string, string[]>();
    for (const row of diff.delete) {
      staleByEvent.set(row.eventId, [
        ...(staleByEvent.get(row.eventId) ?? []),
        row.artistId,
      ]);
    }
    for (const [eventId, artistIds] of staleByEvent) {
      await executor
        .delete(eventArtists)
        .where(
          and(
            eq(eventArtists.eventId, eventId),
            inArray(eventArtists.artistId, artistIds),
          ),
        );
    }

    // Inserts and updates go through one upsert: a concurrent sync of the
    // same event (two crawls overlapping) lands on the primary key and
    // converges instead of failing.
    for (const writeChunk of chunks([...diff.insert, ...diff.update])) {
      await executor
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
  }

  return result;
};
