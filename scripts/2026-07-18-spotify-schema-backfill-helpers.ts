/**
 * Pure planning helpers for the #763 PR 1 canonicalization backfills:
 *
 *   - scripts/2026-07-18-follows-canonical-name-backfill.ts
 *   - scripts/2026-07-18-events-canonical-supporting-backfill.ts
 *
 * Canonicalization lives ONLY in JS (canonicalizeArtist /
 * canonicalizeSupporting from @concert-crawl/crawler-core) — never
 * re-implemented in SQL (Ø/ø parity rule). These helpers turn selected rows
 * into the minimal update set so the runner scripts stay thin and the
 * skip/update logic is unit-testable without a DB.
 */

import {
  canonicalizeArtist,
  canonicalizeSupporting,
} from '@concert-crawl/crawler-core'

export interface FollowRow {
  id: string
  artistName: string
  canonicalName: string
}

export interface FollowUpdate {
  id: string
  canonicalName: string
}

export function planFollowBackfill(rows: FollowRow[]): FollowUpdate[] {
  const updates: FollowUpdate[] = []
  for (const row of rows) {
    const canonical = canonicalizeArtist(row.artistName)
    if (canonical !== row.canonicalName) {
      updates.push({ id: row.id, canonicalName: canonical })
    }
  }
  return updates
}

export interface SupportingRow {
  id: string
  supportingArtists: string[] | null
  canonicalSupporting: string[] | null
}

export interface SupportingUpdate {
  id: string
  canonicalSupporting: string[]
}

export function planSupportingBackfill(
  rows: SupportingRow[],
): SupportingUpdate[] {
  const updates: SupportingUpdate[] = []
  for (const row of rows) {
    if (row.supportingArtists === null) continue
    // NULL means "never backfilled"; any non-NULL array (including []) means
    // the crawler or a prior run already wrote the pair — skip so the script
    // is idempotent and never fights the crawler's fresher writes.
    if (row.canonicalSupporting !== null) continue
    updates.push({
      id: row.id,
      canonicalSupporting: canonicalizeSupporting(row.supportingArtists),
    })
  }
  return updates
}
