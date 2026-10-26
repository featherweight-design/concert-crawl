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
export type PlatformSource = 'aeg' | 'venuepilot' | 'livenation' | 'detail-page'

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
  /**
   * Every other URL whose body the adapter read, as it landed after any
   * redirect. Event text came from these, so crawl.ts requires robots.txt to
   * allow AI use on each before sending any event to the adjudicator.
   */
  readUrls?: string[]
  /** Platform-specific metadata logged with the crawl run (e.g. fetch
   * latency, JSON page count). */
  meta?: Record<string, unknown>
}

export interface PlatformFetchOptions {
  /** Per-domain pacing between this adapter's sequential requests. */
  crawlDelayMs: number
  /** Ceiling on any single HTTP request. */
  perRequestTimeoutMs?: number
  /**
   * Ceiling on the whole fetch — every request plus the crawl delays
   * between them. Adapters make many sequential requests, so a per-request
   * value alone lets worst-case wall time reach N × the caller's budget.
   * A breach throws `PlatformFetchDeadlineError` rather than returning the
   * pages gathered so far (see deadline.ts for why partial is unsafe).
   */
  overallTimeoutMs?: number
}

export interface PlatformFetcher {
  /**
   * Identifies the fetcher for logging + the crawl_runs
   * `extraction_strategy_used` string (`platform:${source}`). VenuePilot
   * is an apiProvider, not a venues.platform value, so this is a
   * fetcher-local union rather than `VenuePlatform`.
   */
  readonly source: PlatformSource
  /**
   * Upper bound on the deadline-wrapped request stages one `fetch` can issue.
   *
   * Counts only what runs inside `deadline.run()`. Ancillary network IO an
   * adapter performs outside that path — Live Nation's robots.txt check, for
   * one — is bounded by its own timeout and does not count here.
   *
   * Callers size `overallTimeoutMs` from this rather than a flat constant,
   * so a legitimately paginated venue isn't punished for being slow: a
   * 50-page VenuePilot account against a 3s crawl delay spends 150s on
   * deliberate pacing alone, and a budget tight enough for AEG's single
   * request would fail it every night.
   *
   * Adapters whose request count is decided upstream (Live Nation reads
   * however many months its sitemap advertises) declare a ceiling well
   * above what the site has ever served.
   */
  readonly maxRequests: number
  /** Returns false if this fetcher can't handle the venue
   * (e.g. missing platformVenueId / apiAccountId). */
  canHandle(venue: Venue): boolean
  fetch(venue: Venue, opts: PlatformFetchOptions): Promise<PlatformFetchResult>
}

export { PlatformFetchDeadlineError, createDeadline } from './deadline.js'
export { aegFetcher } from './aeg.js'
export { detailPageFetcher } from './detail-page.js'
export { liveNationFetcher } from './livenation.js'
export { venuePilotFetcher } from './venuepilot.js'
export { dispatch } from './dispatch.js'
