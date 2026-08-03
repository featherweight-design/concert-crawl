/**
 * SQL fragments for the co-headliner backfill (#1203).
 *
 * Deliberately separate from the main script: this imports the `events` table
 * definition only, never `packages/db/src/index.js`, whose barrel constructs a
 * Postgres client at module load. That keeps the render tests free of open
 * handles — the same reason the sibling `-helpers.ts` file exists.
 */

import { sql, type SQL } from 'drizzle-orm'
import { events } from '../packages/db/src/schema/events.js'

/**
 * Optimistic-lock clause asserting `supporting_artists` still holds exactly
 * what our SELECT saw.
 *
 * The array MUST go through `sql.param`. Interpolating a bare JS array into a
 * `sql` template makes Drizzle expand it as a comma-separated value list, so an
 * empty array renders as `()` — a Postgres syntax error that took the whole
 * `--commit` transaction down on its first row. `sql.param` binds it as one
 * `text[]` parameter instead, which round-trips `null`, `{}` and populated
 * arrays alike.
 */
export function supportingArtistsUnchanged(observed: string[] | null): SQL {
  return sql`${events.supportingArtists} IS NOT DISTINCT FROM ${sql.param(observed)}::text[]`
}
