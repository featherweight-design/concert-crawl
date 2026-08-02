/**
 * Concert Crawl — venue-only sync from SEED_VENUES.
 *
 * Why this exists:
 *
 *   `packages/db/seed.ts` is the source of truth for venues, but it is a
 *   LOCAL/STAGING script. Past its venue block it also inserts fake users,
 *   synthetic events, feedback, audit-log rows, event reports and price
 *   submissions, and it carries no environment guard. It must never be
 *   pointed at production.
 *
 *   That left venue onboarding with no prod path at all. Venue PRs merged
 *   across 2026-08-01/02 — Oriental Theater, Globe Hall, Lost Lake Lounge,
 *   Meow Wolf Denver — and none of them created a row, because nothing in
 *   CI or the Render deploy runs a seed. The venues were "shipped" and
 *   invisible.
 *
 *   This script runs ONLY the venue upsert, with the same values and the
 *   same onConflictDoUpdate column set as seed(), so the seed file stays
 *   authoritative for venues without dragging the synthetic data along.
 *
 * Run:
 *   pnpm tsx scripts/sync-venues.ts            # dry-run: diff only
 *   pnpm tsx scripts/sync-venues.ts --commit   # upsert
 *
 * Against staging/prod set DATABASE_URL accordingly.
 *
 * Idempotent: a no-op re-run reports every venue as unchanged.
 */

import { pathToFileURL } from 'node:url'
import { sql } from 'drizzle-orm'
import { db, venues } from '@concert-crawl/db'
import { SEED_VENUES } from '../packages/db/seed.js'
import {
  COMPARED_FIELDS,
  diffVenues,
  type ColumnDefaults,
} from './sync-venues-helpers.js'

// Mirrors the `set` block in seed()'s venue upsert. Kept deliberately
// column-for-column identical: if the two drift, a venue means one thing
// locally and another in prod, which is the class of bug this script was
// written to end.
const UPSERT_SET = {
  name: sql`excluded.name`,
  websiteUrl: sql`excluded.website_url`,
  address: sql`COALESCE(venues.address, excluded.address)`,
  capacity: sql`excluded.capacity`,
  venueType: sql`excluded.venue_type`,
  neighborhood: sql`excluded.neighborhood`,
  about: sql`excluded.about`,
  lat: sql`excluded.lat`,
  lng: sql`excluded.lng`,
  ticketVendor: sql`excluded.ticket_vendor`,
  crawlMode: sql`excluded.crawl_mode`,
  crawlWaitUntil: sql`excluded.crawl_wait_until`,
  crawlWaitForSelector: sql`excluded.crawl_wait_for_selector`,
  crawlDelayMs: sql`excluded.crawl_delay_ms`,
  featured: sql`excluded.featured`,
  active: sql`excluded.active`,
  verified: sql`excluded.verified`,
}

// Read from the Drizzle table rather than hardcoded, so a schema default
// change can't silently make the dry-run disagree with the commit.
const columnDefaults: ColumnDefaults = Object.fromEntries(
  COMPARED_FIELDS.filter((field) => venues[field].hasDefault).map((field) => [
    field,
    venues[field].default,
  ]),
)

export interface SyncSummary {
  committed: boolean
  seedVenueCount: number
  existingVenueCount: number
  toCreate: string[]
  toUpdate: string[]
  unchanged: string[]
}

export const runSync = async ({
  commit,
}: {
  commit: boolean
}): Promise<SyncSummary> => {
  const existing = await db.select().from(venues)
  const { toCreate, toUpdate, unchanged } = diffVenues(
    SEED_VENUES,
    existing,
    columnDefaults,
  )

  console.warn(`SEED_VENUES entries: ${SEED_VENUES.length}`)
  console.warn(`Venues currently in the target DB: ${existing.length}`)
  console.warn(
    `\nWill CREATE (${toCreate.length}): ${toCreate.join(', ') || '—'}`,
  )
  console.warn(
    `Will UPDATE (${toUpdate.length}): ${toUpdate.join(', ') || '—'}`,
  )
  console.warn(
    `Unchanged  (${unchanged.length}): ${unchanged.join(', ') || '—'}`,
  )

  const summary: SyncSummary = {
    committed: commit,
    seedVenueCount: SEED_VENUES.length,
    existingVenueCount: existing.length,
    toCreate,
    toUpdate,
    unchanged,
  }

  if (!commit) {
    console.warn('\nDry-run — nothing written. Re-run with --commit to apply.')
    return summary
  }

  await db
    .insert(venues)
    .values(SEED_VENUES)
    .onConflictDoUpdate({ target: venues.slug, set: UPSERT_SET })

  console.warn(`\nUpserted ${SEED_VENUES.length} venues.`)

  return summary
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  runSync({ commit })
    .then((summary) => {
      console.warn('---')
      console.warn(JSON.stringify(summary, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('Venue sync failed:', err)
      process.exit(1)
    })
}
