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
 *   This script runs ONLY the venue upsert, with the same values as seed(),
 *   so the seed file stays authoritative for venues without dragging the
 *   synthetic data along.
 *
 * This script is CREATE-ONLY by default (#1337). Onboarding a new venue is
 * the seed's job; ongoing edits belong to the admin UI, which is where the
 * crawl tuning (`crawlMode`, `crawlWaitForSelector`, `crawlDelayMs`,
 * `crawlWaitUntil`) and `about` copy are actually maintained. A prod dry-run
 * on 2026-08-02 showed a blanket update would have nulled the AXS wait
 * selectors on six working venues and reverted two hand-set crawl modes.
 * Drift is still reported so an operator can see it — it just is not written.
 *
 * `--only <slug,...>` is the deliberate escape hatch: it narrows the run to
 * the named venues AND enables the update path for exactly those rows, so
 * pushing a seed edit to prod is an explicit, scoped act.
 *
 * Run:
 *   pnpm tsx scripts/sync-venues.ts                          # dry-run: diff only
 *   pnpm tsx scripts/sync-venues.ts --commit                 # create missing venues
 *   pnpm tsx scripts/sync-venues.ts --only globe-hall        # dry-run, scoped
 *   pnpm tsx scripts/sync-venues.ts --only globe-hall --commit  # scoped upsert
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
  parseOnly,
  type ColumnDefaults,
} from './sync-venues-helpers.js'

// The `set` block used ONLY on the `--only` path. On the default path
// nothing is updated at all, so this never runs unscoped.
//
// Follows seed()'s venue upsert, with one deliberate divergence: the three
// operationally-managed flags are create-only here.
//
// `active`, `featured` and `verified` describe what has happened to a venue
// in the environment, not what the venue is. The crawler auto-pauses a
// venue by setting `active = false` on its third consecutive non-block
// failure (packages/crawler-core/src/crawl.ts), and all three are editable
// from the admin UI; `featured` is additionally exclusive, so writing it
// would clear whichever venue an admin had promoted. Carrying
// `excluded.<col>` into the UPDATE branch would let a routine sync silently
// un-pause a broken venue and undo admin curation.
//
// Omitting them from the `set` block leaves the existing values untouched
// on conflict while still seeding them on insert — which is what we want.
// seed() can afford to clobber them because it targets a throwaway local
// DB; this script targets prod.
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
  only: string[] | null
  seedVenueCount: number
  existingVenueCount: number
  toCreate: string[]
  toUpdate: string[]
  unchanged: string[]
}

export const runSync = async ({
  commit,
  only,
}: {
  commit: boolean
  only?: string[]
}): Promise<SyncSummary> => {
  const scoped = only !== undefined
  if (scoped && only.length === 0) {
    throw new Error('--only was given no slugs')
  }

  const seedVenues = scoped
    ? SEED_VENUES.filter((venue) => only.includes(venue.slug))
    : SEED_VENUES

  if (scoped) {
    const unknown = only.filter(
      (slug) => !SEED_VENUES.some((venue) => venue.slug === slug),
    )
    if (unknown.length > 0) {
      throw new Error(
        `--only names slugs absent from SEED_VENUES: ${unknown.join(', ')}`,
      )
    }
  }

  const existing = await db.select().from(venues)
  const { toCreate, toUpdate, unchanged } = diffVenues(
    seedVenues,
    existing,
    columnDefaults,
  )

  console.warn(`SEED_VENUES entries: ${SEED_VENUES.length}`)
  console.warn(`Venues currently in the target DB: ${existing.length}`)
  if (scoped) {
    console.warn(`Scoped by --only to: ${only.join(', ')}`)
  }
  console.warn(
    `\nWill CREATE (${toCreate.length}): ${toCreate.join(', ') || '—'}`,
  )
  console.warn(
    `${scoped ? 'Will UPDATE' : 'Drift, NOT written'} (${toUpdate.length}): ${toUpdate.join(', ') || '—'}`,
  )
  console.warn(
    `Unchanged  (${unchanged.length}): ${unchanged.join(', ') || '—'}`,
  )
  if (!scoped && toUpdate.length > 0) {
    console.warn(
      '\nThis script is create-only. To push a seed edit to an existing venue,\n' +
        `re-run scoped: --only ${toUpdate.join(',')} --commit`,
    )
  }

  const summary: SyncSummary = {
    committed: commit,
    only: scoped ? only : null,
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

  // Scoped: every conflicting row in the scope is re-updated, including the
  // ones the summary reported as unchanged — Postgres runs the UPDATE
  // regardless without a WHERE. That is deliberate. The rewrite is
  // unobservable: `venues` carries no triggers and UPSERT_SET does not touch
  // `updatedAt`. Gating it would mean restating the whole comparison as a SQL
  // predicate — a second source of truth to keep in sync with UPSERT_SET,
  // which is the exact drift this script exists to prevent.
  //
  // Unscoped: DO NOTHING, so an existing row keeps its admin-owned values.
  const insert = db.insert(venues).values(seedVenues)
  await (scoped
    ? insert.onConflictDoUpdate({ target: venues.slug, set: UPSERT_SET })
    : insert.onConflictDoNothing({ target: venues.slug }))

  console.warn(
    scoped
      ? `\nUpserted ${seedVenues.length} venue(s): ${only.join(', ')}.`
      : `\nCreated ${toCreate.length} venue(s); ${existing.length} existing rows left untouched.`,
  )

  return summary
}

const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  const commit = process.argv.includes('--commit')
  const only = parseOnly(process.argv)
  runSync({ commit, only })
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
