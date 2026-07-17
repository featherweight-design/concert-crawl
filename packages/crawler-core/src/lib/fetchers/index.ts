// Per-platform fetcher dispatch (#623). The dispatcher routes a venue
// to a platform-specific adapter that returns NormalizedEvent[] directly,
// bypassing the HTML → JSON-LD → LLM cascade entirely.
//
// Spec: docs/superpowers/specs/2026-06-17-per-platform-fetcher-dispatch.md
// (Note: the spec's URL pattern was corrected during implementation —
// the real AEG endpoint is /json/events/<shardId>/events.json, not the
// /json/data/data_rv1/<id>/search_queries.json the spec originally
// described. See aeg.ts for details.)

import type { Venue } from '@concert-crawl/db'
import type { NormalizedEvent } from '../../types.js'

export type { VenuePlatform } from '@concert-crawl/types'

/**
 * The union of platform-fetcher identifiers. Single source of truth: the
 * `PlatformFetcher.source` field and crawl.ts's `extraction_strategy_used`
 * strategy type both derive from this, so adding a fetcher is a compile
 * error until every consumer is updated.
 */
export type PlatformSource = 'aeg' | 'venuepilot'

export interface PlatformFetchResult {
  events: NormalizedEvent[]
  /**
   * The platform endpoint the adapter actually hit (e.g. the AEG events
   * blob URL). Used only in the crawler's structured logs for incident
   * triage. NOT written to any DB column — per-event sourceUrl on each
   * NormalizedEvent is the venue's canonical calendar URL, set by the
   * adapter when normalizing each event.
   */
  sourceUrl: string
  /** Platform-specific metadata logged with the crawl run (e.g. fetch
   * latency, JSON page count). */
  meta?: Record<string, unknown>
}

export interface PlatformFetcher {
  /**
   * Identifies the fetcher for logging + the crawl_runs
   * `extraction_strategy_used` string (`platform:${source}`). VenuePilot
   * is an apiProvider, not a venues.platform value, so this is a
   * fetcher-local union rather than `VenuePlatform`.
   */
  readonly source: PlatformSource
  /** Returns false if this fetcher can't handle the venue
   * (e.g. missing platformVenueId / apiAccountId). */
  canHandle(venue: Venue): boolean
  fetch(
    venue: Venue,
    opts: { crawlDelayMs: number; timeoutMs?: number },
  ): Promise<PlatformFetchResult>
}

export { aegFetcher } from './aeg.js'
export { venuePilotFetcher } from './venuepilot.js'
export { dispatch } from './dispatch.js'
