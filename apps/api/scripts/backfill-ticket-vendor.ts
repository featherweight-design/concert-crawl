/**
 * One-time backfill: detect and set ticket_vendor for all venues where it is NULL.
 *
 * Run from the monorepo root:
 *   env $(grep -v '^#' apps/api/.env.local | grep -v '^$' | xargs) \
 *     npx tsx apps/api/scripts/backfill-ticket-vendor.ts
 */
import { eq, isNull } from 'drizzle-orm'
import { db, venues } from '@concert-crawl/db'
import { detectTicketVendor } from '../src/lib/detect-ticket-vendor.js'

const DELAY_MS = 2_000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const rows = await db
  .select({ id: venues.id, name: venues.name, websiteUrl: venues.websiteUrl })
  .from(venues)
  .where(isNull(venues.ticketVendor))

console.log(`Backfilling ${rows.length} venue(s)...`)

for (const row of rows) {
  process.stdout.write(`  ${row.name} (${row.websiteUrl}) → `)
  const vendor = await detectTicketVendor(row.websiteUrl)
  await db
    .update(venues)
    .set({ ticketVendor: vendor })
    .where(eq(venues.id, row.id))
  console.log(vendor)
  await sleep(DELAY_MS)
}

console.log('Done.')
