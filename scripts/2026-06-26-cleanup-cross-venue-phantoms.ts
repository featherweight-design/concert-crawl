/**
 * Concert Crawl — cross-venue phantom-row cleanup (issue #826)
 *
 * The 2026-06-26 Cervantes/Mission-Ballroom duplicate incident:
 *
 *   The LLM extractor was stripping listing decoration when populating
 *   `title` ("AEG Presents Connor Price & Nic D AT MISSION BALLROOM" →
 *   "AEG Presents Connor Price & Nic D"), dropping the "AT MISSION
 *   BALLROOM" marker the cross-venue filter (#605) needs. Cervantes'
 *   events page advertises several presale rows for shows physically
 *   hosted at Mission Ballroom; without the marker the filter let
 *   them through and stored them as Cervantes events. End-users saw
 *   duplicate cards on the Denver landing page (one at Cervantes,
 *   one at Mission), with the Cervantes-side tickets link routing to
 *   the Mission show.
 *
 * The forward-going fix (also in this PR) plumbs the verbatim source
 * headline through as `rawTitle` and feeds THAT into the filter, so new
 * crawls drop the phantom rows. This script removes the historical
 * phantoms already in the DB.
 *
 * What it does:
 *   1. Find Cervantes rows whose source_url is the Cervantes events
 *      page AND a same-date row exists at another venue with the same
 *      canonical_title (the canonical-title-based match is what makes
 *      this safe even after the LLM's title-cleaning has occurred —
 *      both rows end up with the same canonical form).
 *   2. For each match, print the candidate pair (Cervantes phantom +
 *      canonical row at the host venue).
 *   3. With --commit: reassign FK rows (user_events, event_reports,
 *      price_submissions, price_retrieval_log) from the phantom to the
 *      canonical row, then delete the phantom. Mirrors the
 *      consolidate-script pattern from
 *      scripts/2026-06-17-event-canonical-artist-consolidate.sql.
 *
 * Run:
 *   pnpm tsx scripts/2026-06-26-cleanup-cross-venue-phantoms.ts            # dry-run
 *   pnpm tsx scripts/2026-06-26-cleanup-cross-venue-phantoms.ts --commit   # mutate
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: re-running after a successful --commit is a no-op (the
 * phantom rows are gone, so the SELECT below returns nothing).
 *
 * Read-only by default. The dry-run prints counts + the candidate list
 * but takes no row-level locks on shared tables.
 */

import { pathToFileURL } from 'node:url'
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import {
  db,
  events,
  venues,
  userEvents,
  eventReports,
  priceSubmissions,
  priceRetrievalLog,
} from '@concert-crawl/db'
import { canonicalizeTitle } from '../packages/crawler-core/src/lib/canonical-title.js'

// The Cervantes events page that aggregates "AT MISSION BALLROOM" /
// "AT OGDEN" / etc. presale listings alongside Cervantes' own shows.
// Hard-coded because this script is venue-specific to the 2026-06-26
// incident — extending it to other partial-aggregator venues should be
// a deliberate audit, not a string-match accident.
const CERVANTES_SOURCE_URL = 'https://cervantesmasterpiece.com/events/'

// Strip "X Presents " / "X Present " promoter prefixes before pairing.
// The 2026-06-26 phantom rows had titles like "AEG Presents Connor Price
// & Nic D" while the canonical Mission row was just "Connor Price & Nic
// D" — without stripping these, canonicalizeTitle would produce different
// keys and the cleanup would miss every paired row. The regex anchors at
// start-of-string and stops at the first "Presents " / "Present "
// occurrence so legitimate uses of the word later in a title (rare) are
// left intact. Multi-promoter strings ("Cervantes' & River Beats Present
// SHIFT…") are handled because we don't restrict the chars between ^ and
// the keyword. Applied to BOTH sides of the pair so the canonical row's
// rare "X Presents" prefix wouldn't desync the match either.
const PROMOTER_PREFIX = /^[^,]{1,60}?\sPresents?\s+/i

function stripPromoterPrefix(title: string): string {
  return title.replace(PROMOTER_PREFIX, '')
}

function pairingKey(date: string, title: string): string {
  return `${date}|${canonicalizeTitle(stripPromoterPrefix(title))}`
}

interface PhantomCandidate {
  /** The Cervantes-stored phantom row. */
  phantomId: string
  phantomTitle: string
  phantomArtist: string
  phantomDate: string
  phantomVenueId: string
  phantomVenueName: string
  /** The canonical row at the actual host venue. */
  canonicalId: string
  canonicalTitle: string
  canonicalArtist: string
  canonicalVenueId: string
  canonicalVenueName: string
  /** Re-canonicalized title used as the match key. */
  matchKey: string
}

interface CleanupSummary {
  candidatesFound: number
  fkReassignments: {
    userEvents: number
    eventReports: number
    priceSubmissions: number
    priceRetrievalLog: number
  }
  phantomsDeleted: number
  committed: boolean
}

export async function runCleanup(opts: {
  commit: boolean
}): Promise<CleanupSummary> {
  // 1. Load all Cervantes rows from the Cervantes events page, plus any
  //    same-date row at any other venue whose canonical_title matches.
  //    Re-run canonicalizeTitle in JS rather than relying on the
  //    canonical_title column directly — that way the match key is
  //    consistent with the current canonicalization rules even if the
  //    column was populated by an older (pre-#821) crawler that left it
  //    empty.
  // events.venue_id is nullable (ON DELETE SET NULL on the FK), so even
  // though the innerJoin filters NULLs in practice, we narrow the select
  // type by re-asserting non-nullness from the join — a `venueId` that
  // didn't match a venue row wouldn't appear in an inner-join result.
  // canonicalTitle column is intentionally not selected: pairingKey()
  // recomputes from `title` (with promoter-prefix strip) so the column's
  // stale value can't desync the match (#836 Copilot R3).
  const cervantesRowsRaw = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      date: events.date,
      venueId: events.venueId,
      venueName: venues.name,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        eq(events.sourceUrl, CERVANTES_SOURCE_URL),
        isNotNull(events.venueId),
      ),
    )

  // Narrow venueId from nullable to string for the rest of the pipeline.
  // The isNotNull above guarantees no nulls in practice; this is the
  // type-system mirror so downstream consumers don't see `string | null`.
  const cervantesRows = cervantesRowsRaw.flatMap((row) =>
    row.venueId === null ? [] : [{ ...row, venueId: row.venueId }],
  )

  console.log(
    `Loaded ${cervantesRows.length} Cervantes rows sourced from ${CERVANTES_SOURCE_URL}`,
  )

  // Build per-(date, promoter-stripped canonical-title) match key.
  // Recompute the key from the live title so a row written before
  // canonical_title was wired up still matches its sibling at the host
  // venue. See pairingKey() — promoter prefixes ("AEG Presents …",
  // "Cervantes' & River Beats Present …") are stripped before
  // canonicalization so the Cervantes phantom row and the canonical row
  // at the host venue end up with matching keys (Copilot R1 on #826).
  const cervantesByKey = new Map<string, (typeof cervantesRows)[number]>()
  for (const row of cervantesRows) {
    const matchKey = pairingKey(row.date, row.title)
    // If multiple Cervantes rows collide on the same key (shouldn't happen
    // post-#608 but defend against it), keep the first one — the duplicate
    // is itself a phantom that will get caught on the next run.
    if (!cervantesByKey.has(matchKey)) {
      cervantesByKey.set(matchKey, row)
    }
  }

  if (cervantesByKey.size === 0) {
    console.log('No Cervantes rows found — nothing to do.')
    return {
      candidatesFound: 0,
      fkReassignments: {
        userEvents: 0,
        eventReports: 0,
        priceSubmissions: 0,
        priceRetrievalLog: 0,
      },
      phantomsDeleted: 0,
      committed: opts.commit,
    }
  }

  // 2. Pull all candidate sibling rows at OTHER venues on the same dates.
  //    Filter further in JS by canonicalizeTitle(row.title) match.
  const allDates = Array.from(
    new Set(Array.from(cervantesByKey.values()).map((row) => row.date)),
  )
  const cervantesVenueIds = Array.from(
    new Set(Array.from(cervantesByKey.values()).map((row) => row.venueId)),
  )

  // Same rationale as the Cervantes-side query — pairingKey recomputes
  // from `title`, so `events.canonical_title` would only add wire weight
  // and confuse with PhantomCandidate.canonicalTitle (the canonical row's
  // verbatim title, not the column).
  const siblingRowsRaw = await db
    .select({
      id: events.id,
      title: events.title,
      artist: events.artist,
      date: events.date,
      venueId: events.venueId,
      venueName: venues.name,
    })
    .from(events)
    .innerJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        inArray(events.date, allDates),
        isNotNull(events.venueId),
        // Exclude same-venue rows so we don't try to consolidate a
        // Cervantes row with itself. The cleanup only re-homes
        // Cervantes-stored rows onto canonical rows at OTHER venues.
        sql`${events.venueId} NOT IN (${sql.join(
          cervantesVenueIds.map((vid) => sql`${vid}`),
          sql`, `,
        )})`,
      ),
    )

  const siblingRows = siblingRowsRaw.flatMap((row) =>
    row.venueId === null ? [] : [{ ...row, venueId: row.venueId }],
  )

  const candidates: PhantomCandidate[] = []
  for (const sibling of siblingRows) {
    const matchKey = pairingKey(sibling.date, sibling.title)
    const phantom = cervantesByKey.get(matchKey)
    if (!phantom) continue
    // Skip if we've already paired this phantom (a Cervantes row could in
    // theory match multiple siblings, e.g. if two host-venue duplicates
    // exist; #608 should have cleaned those up, but defend anyway by
    // taking the first sibling and leaving the rest to a future pass).
    if (candidates.some((cand) => cand.phantomId === phantom.id)) continue
    candidates.push({
      phantomId: phantom.id,
      phantomTitle: phantom.title,
      phantomArtist: phantom.artist,
      phantomDate: phantom.date,
      phantomVenueId: phantom.venueId,
      phantomVenueName: phantom.venueName,
      canonicalId: sibling.id,
      canonicalTitle: sibling.title,
      canonicalArtist: sibling.artist,
      canonicalVenueId: sibling.venueId,
      canonicalVenueName: sibling.venueName,
      matchKey,
    })
  }

  console.log(
    `Found ${candidates.length} phantom→canonical pairs (Cervantes → host venue).`,
  )

  if (candidates.length === 0) {
    return {
      candidatesFound: 0,
      fkReassignments: {
        userEvents: 0,
        eventReports: 0,
        priceSubmissions: 0,
        priceRetrievalLog: 0,
      },
      phantomsDeleted: 0,
      committed: opts.commit,
    }
  }

  // 3. Per-candidate dry-run log — operator-readable so the spot-check
  //    is fast.
  for (const cand of candidates) {
    console.log(
      [
        '---',
        `phantom (will be deleted):`,
        `  id          = ${cand.phantomId}`,
        `  venue       = ${cand.phantomVenueName}`,
        `  title       = ${cand.phantomTitle}`,
        `  artist      = ${cand.phantomArtist}`,
        `  date        = ${cand.phantomDate}`,
        `canonical (will receive FK rows):`,
        `  id          = ${cand.canonicalId}`,
        `  venue       = ${cand.canonicalVenueName}`,
        `  title       = ${cand.canonicalTitle}`,
        `  artist      = ${cand.canonicalArtist}`,
        `match key     = ${cand.matchKey}`,
      ].join('\n'),
    )
  }

  // 4. Count FK rows pointing at each phantom so the dry-run shows the
  //    blast radius. Done in a single query per table for efficiency.
  const phantomIds = candidates.map((cand) => cand.phantomId)
  const [ueCount, erCount, psCount, prlCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userEvents)
      .where(inArray(userEvents.eventId, phantomIds)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventReports)
      .where(inArray(eventReports.eventId, phantomIds)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceSubmissions)
      .where(inArray(priceSubmissions.eventId, phantomIds)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(priceRetrievalLog)
      .where(inArray(priceRetrievalLog.eventId, phantomIds)),
  ])

  const fkCounts = {
    userEvents: ueCount[0]?.count ?? 0,
    eventReports: erCount[0]?.count ?? 0,
    priceSubmissions: psCount[0]?.count ?? 0,
    priceRetrievalLog: prlCount[0]?.count ?? 0,
  }

  console.log('---')
  console.log(
    `FK rows to reassign before delete: user_events=${fkCounts.userEvents}, event_reports=${fkCounts.eventReports}, price_submissions=${fkCounts.priceSubmissions}, price_retrieval_log=${fkCounts.priceRetrievalLog}`,
  )

  if (!opts.commit) {
    console.log(
      'Dry-run mode — no rows touched. Re-run with --commit to apply.',
    )
    return {
      candidatesFound: candidates.length,
      fkReassignments: fkCounts,
      phantomsDeleted: 0,
      committed: false,
    }
  }

  // 5. --commit path. One transaction per pair so a single bad pair
  //    rolls back independently; the consolidate.sql approach (one big
  //    transaction across all clusters) is fine for schema-uniform work
  //    but here every pair is independently auditable from the dry-run
  //    log, and partial progress is preferable to all-or-nothing if a
  //    surprise FK constraint fires mid-batch.
  let deletedCount = 0
  const writtenFkCounts = {
    userEvents: 0,
    eventReports: 0,
    priceSubmissions: 0,
    priceRetrievalLog: 0,
  }
  for (const cand of candidates) {
    await db.transaction(async (tx) => {
      // 5a. user_events — dedupe per (user_id, canonical) before redirecting.
      //     If a user already watched both phantom and canonical rows, the
      //     UNIQUE index on (user_id, event_id) would reject the redirect
      //     UPDATE. The user already has a watch on the canonical event
      //     either way, so always delete the phantom-side row in that case
      //     regardless of which created_at is newer (Copilot R2 on #826:
      //     the prior `>=` clause left the phantom row in place when the
      //     phantom watch was newer, then the UPDATE below tripped the
      //     unique index).
      const dupeUserRows = await tx.execute<{ id: string }>(
        sql`
          SELECT ue_phantom.id
          FROM ${userEvents} AS ue_phantom
          WHERE ue_phantom.event_id = ${cand.phantomId}
            AND EXISTS (
              SELECT 1 FROM ${userEvents} AS ue_canonical
              WHERE ue_canonical.event_id = ${cand.canonicalId}
                AND ue_canonical.user_id = ue_phantom.user_id
            )
        `,
      )
      const dupeIds = dupeUserRows.map((row) => row.id)
      if (dupeIds.length > 0) {
        await tx.delete(userEvents).where(inArray(userEvents.id, dupeIds))
      }

      const ueRes = await tx
        .update(userEvents)
        .set({ eventId: cand.canonicalId })
        .where(eq(userEvents.eventId, cand.phantomId))
        .returning({ id: userEvents.id })
      writtenFkCounts.userEvents += ueRes.length

      const erRes = await tx
        .update(eventReports)
        .set({ eventId: cand.canonicalId })
        .where(eq(eventReports.eventId, cand.phantomId))
        .returning({ id: eventReports.id })
      writtenFkCounts.eventReports += erRes.length

      const psRes = await tx
        .update(priceSubmissions)
        .set({ eventId: cand.canonicalId })
        .where(eq(priceSubmissions.eventId, cand.phantomId))
        .returning({ id: priceSubmissions.id })
      writtenFkCounts.priceSubmissions += psRes.length

      const prlRes = await tx
        .update(priceRetrievalLog)
        .set({ eventId: cand.canonicalId })
        .where(eq(priceRetrievalLog.eventId, cand.phantomId))
        .returning({ id: priceRetrievalLog.id })
      writtenFkCounts.priceRetrievalLog += prlRes.length

      // 5b. Delete the phantom. FK rows are reassigned by this point so
      //     CASCADE has nothing to chase.
      await tx.delete(events).where(eq(events.id, cand.phantomId))
    })
    // Increment AFTER db.transaction() resolves so a rollback or commit
    // failure doesn't leave the in-memory count out of sync with the DB
    // (#836 Copilot R4).
    deletedCount += 1
    console.log(
      `Reassigned + deleted phantom ${cand.phantomId} → canonical ${cand.canonicalId}`,
    )
  }

  console.log('---')
  console.log(
    `Committed. Deleted ${deletedCount} phantoms. FK reassignments: user_events=${writtenFkCounts.userEvents}, event_reports=${writtenFkCounts.eventReports}, price_submissions=${writtenFkCounts.priceSubmissions}, price_retrieval_log=${writtenFkCounts.priceRetrievalLog}`,
  )

  return {
    candidatesFound: candidates.length,
    fkReassignments: writtenFkCounts,
    phantomsDeleted: deletedCount,
    committed: true,
  }
}

// CLI entrypoint guard so the module can also be imported by a future
// test without auto-running. Compares import.meta.url against the
// invoked script URL.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  runCleanup({ commit })
    .then((summary) => {
      console.log('---')
      console.log(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('Cleanup failed:', err)
      process.exit(1)
    })
}
