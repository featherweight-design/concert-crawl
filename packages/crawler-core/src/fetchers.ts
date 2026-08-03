// Public entry for the platform-fetcher dispatch surface (#623 / #665).
//
// This is a separate subpath export ('@concert-crawl/crawler-core/fetchers')
// rather than part of the root barrel because the root barrel pulls in
// crawlVenue → Playwright/LLM/drizzle machinery. The API's probe-platform
// endpoint only needs dispatch + the AEG error classes, and importing the
// root barrel from apps/api drags the whole crawl module graph into the
// API bundle (and into every API unit test's module graph).
export { dispatch } from './lib/fetchers/dispatch.js'
export {
  aegFetcher,
  AegFetchError,
  AegSchemaError,
} from './lib/fetchers/aeg.js'
export {
  detailPageFetcher,
  DetailPageFetchError,
} from './lib/fetchers/detail-page.js'
export { PlatformFetchDeadlineError } from './lib/fetchers/deadline.js'
export type {
  PlatformFetcher,
  PlatformFetchOptions,
  PlatformFetchResult,
  VenuePlatform,
} from './lib/fetchers/index.js'
