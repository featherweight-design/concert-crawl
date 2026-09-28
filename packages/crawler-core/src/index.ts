export type { NormalizedEvent, TokenUsage, LLMResult } from './types.js'
export { isAllowed } from './lib/robots.js'
export { fetchPage } from './lib/fetcher.js'
export type { FetchResult } from './lib/fetcher.js'
export { extractJsonLd } from './lib/extractors/json-ld.js'
export {
  adjudicateEvent,
  extractWithLlm,
  IS_CONCERT_RULES,
} from './lib/extractors/llm.js'
export { calculateCost } from './lib/cost.js'
export {
  canonicalizeArtist,
  canonicalizeSupporting,
} from './lib/canonical-artist.js'
// artistSlug/resolveSlug live in @concert-crawl/types: packages/db needs them
// for the artists backfill and cannot depend on crawler-core without a
// workspace build cycle. Re-exported here so callers get the
// canonicalize → slug pair from a single import.
export {
  artistSlug,
  resolveSlug,
  ARTIST_SLUG_FALLBACK_PREFIX,
} from '@concert-crawl/types'
export {
  crawlVenue,
  type CrawlVenueResult,
  type BrowserSource,
} from './crawl.js'
export { tagEventsWithGenres } from './lib/genre-tagger.js'
export type { GenreTagInput } from './lib/genre-tagger.js'
export {
  detectCrossVenuePresale,
  normalizeVenueName,
} from './lib/cross-venue-filter.js'
export type {
  CrossVenueCandidate,
  CrossVenueMatch,
  CrossVenueReason,
} from './lib/cross-venue-filter.js'
export {
  deriveTicketLinks,
  type TicketLinkVenueContext,
} from './lib/ticket-links/index.js'
export {
  runArtistFanout,
  runArtistFanoutSafely,
} from './lib/artist-fanout/index.js'
export type {
  ArtistFanoutDeps,
  ArtistFanoutSummary,
} from './lib/artist-fanout/index.js'
export {
  sweepStaleEvents,
  STALE_EVENT_CANCEL_DAYS,
} from './lib/stale-event-sweep.js'
export { rederiveEventArtists } from './rederive-event-artists.js'
export type {
  RederiveChange,
  RederiveEventArtistsOptions,
  RederiveEventArtistsResult,
  RederiveStrategy,
} from './rederive-event-artists.js'
export { evaluateRunHealth, reportRunHealth } from './lib/run-health.js'
export type { RunDegradation, VenueRunOutcome } from './lib/run-health.js'
export { classifyCrawlError } from './lib/crawl-error-class.js'
export type { CrawlErrorKind } from './lib/crawl-error-class.js'
