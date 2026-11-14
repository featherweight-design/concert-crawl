export type { NormalizedEvent, TokenUsage, LLMResult } from './types.js';
export { isAllowed, MIN_CRAWL_DELAY_MS } from './lib/robots.js';
export { fetchPage } from './lib/fetcher.js';
export type { FetchResult } from './lib/fetcher.js';
export { extractJsonLd } from './lib/extractors/json-ld.js';
export {
  adjudicateEventWithUsage,
  extractWithLlm,
  IS_CONCERT_RULES,
} from './lib/extractors/llm.js';
export {
  createAdjudicationCost,
  type AdjudicationCost,
} from './lib/adjudication-cost.js';
export { calculateCost, MODEL_RATES, type PricedModelId } from './lib/cost.js';
export { LLM_EXTRACTION_MODEL, VENUE_ABOUT_MODEL } from './lib/llm-models.js';
export {
  LLM_SERVICES,
  recordLlmCost,
  type LlmService,
  type RecordLlmCostInput,
} from './lib/record-llm-cost.js';
export {
  canonicalizeArtist,
  canonicalizeSupporting,
} from './lib/canonical-artist.js';
// artistSlug/resolveSlug live in @concert-crawl/types: packages/db needs them
// for the artists backfill and cannot depend on crawler-core without a
// workspace build cycle. Re-exported here so callers get the
// canonicalize → slug pair from a single import.
export {
  artistSlug,
  resolveSlug,
  ARTIST_SLUG_FALLBACK_PREFIX,
} from '@concert-crawl/types';
export {
  AUTO_APPROVE_THRESHOLD,
  crawlVenue,
  type CrawlVenueResult,
  type BrowserSource,
} from './crawl.js';
export { tagEventsWithGenres } from './lib/genre-tagger.js';
export type { GenreTagInput } from './lib/genre-tagger.js';
export {
  detectCrossVenuePresale,
  normalizeVenueName,
} from './lib/cross-venue-filter.js';
export type {
  CrossVenueCandidate,
  CrossVenueMatch,
  CrossVenueReason,
} from './lib/cross-venue-filter.js';
export {
  deriveTicketLinks,
  type TicketLinkVenueContext,
} from './lib/ticket-links/index.js';
export {
  runArtistFanout,
  runArtistFanoutSafely,
} from './lib/artist-fanout/index.js';
export type {
  ArtistFanoutDeps,
  ArtistFanoutSummary,
} from './lib/artist-fanout/index.js';
export {
  sweepStaleEvents,
  STALE_EVENT_CANCEL_DAYS,
} from './lib/stale-event-sweep.js';
export { sweepExpiredPageBodies } from './lib/page-body-sweep.js';
export type { PageBodySweepResult } from './lib/page-body-sweep.js';
export { rederiveEventArtists } from './rederive-event-artists.js';
export { makeJoinedEvidence } from './joined-name-evidence.js';
export { mergeDuplicateNights } from './merge-duplicate-nights.js';
export type {
  ArtistReview,
  MergeDuplicateNightsResult,
  NightGroupPlan,
} from './merge-duplicate-nights.js';
export { makeMusicBrainzLookup } from './lib/musicbrainz.js';
export type {
  NotWritten,
  UnresolvedJoined,
  RederiveChange,
  RederiveEventArtistsOptions,
  RederiveEventArtistsResult,
  RederiveStrategy,
} from './rederive-event-artists.js';
export { evaluateRunHealth, reportRunHealth } from './lib/run-health.js';
export type { RunDegradation, VenueRunOutcome } from './lib/run-health.js';
export {
  classifyCrawlError,
  crawlFailureGrouping,
  isAccountWideKind,
} from './lib/crawl-error-class.js';
export type { CrawlErrorKind } from './lib/crawl-error-class.js';
export {
  LlmBudgetSpentError,
  llmBudgetVerdict,
  readLlmBudgetStatus,
} from './lib/llm-budget.js';
export type { LlmBudgetStatus, LlmBudgetVerdict } from './lib/llm-budget.js';
