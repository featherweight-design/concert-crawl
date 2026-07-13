// apps/api/src/lib/analytics.ts
//
// Server-side monetization analytics (eng-infra spec Part 2 §8).
//
// posthog-node captures the server-truth funnel events the browser cannot be
// trusted for — payment_succeeded, cancel_completed, founder claims. The
// distinct ID is always the Clerk userId, so these join the client-fired
// events into one funnel.
//
// No-op when POSTHOG_KEY is absent: local dev and CI have no key, and a
// missing key must never break a billing request. The client is a lazy
// singleton so app construction (every test) never requires the key.

import { PostHog } from 'posthog-node'
import type {
  MonetizationEvent,
  MonetizationEventProps,
} from '@concert-crawl/types'
import { apiLogger } from './logger.js'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

let cachedClient: PostHog | null = null
let resolved = false

// Returns the singleton, or null when unconfigured. Resolves exactly once —
// after the first miss we never re-read the env, so an unconfigured API logs
// the "disabled" line a single time rather than per event.
const getClient = (): PostHog | null => {
  if (resolved) return cachedClient
  resolved = true
  const apiKey = process.env['POSTHOG_KEY']
  if (apiKey === undefined || apiKey.length === 0) {
    apiLogger.info(
      {},
      'analytics: POSTHOG_KEY not set — server analytics disabled',
    )
    return null
  }
  // Treat an empty string the same as unset — an env var that exists but has
  // no value must not construct the SDK with an invalid host.
  const hostEnv = process.env['POSTHOG_HOST']
  const host =
    hostEnv === undefined || hostEnv.length === 0
      ? DEFAULT_POSTHOG_HOST
      : hostEnv
  cachedClient = new PostHog(apiKey, { host })
  return cachedClient
}

// Typed server-side capture. `event` constrains `properties` to that event's
// shape via the shared contract, so a wrong property name or type is a
// compile error. No-ops (never throws) when analytics is disabled.
export const captureServer = <TEvent extends MonetizationEvent>(
  distinctId: string,
  event: TEvent,
  properties: MonetizationEventProps<TEvent>,
): void => {
  const client = getClient()
  if (client === null) return
  try {
    client.capture({ distinctId, event, properties })
  } catch (err) {
    // capture() only enqueues, but guard anyway — an analytics failure must
    // never surface to the caller (a webhook handler mid-transaction).
    apiLogger.warn({ err, event }, 'analytics: capture failed')
  }
}

// Flush queued events on graceful shutdown so a redeploy does not drop the
// in-memory batch. No-op when unconfigured.
export const shutdownAnalytics = async (): Promise<void> => {
  if (cachedClient === null) return
  try {
    await cachedClient.shutdown()
  } catch (err) {
    apiLogger.warn({ err }, 'analytics: shutdown flush failed')
  }
}

// Test-only reset of the lazy singleton so a test can toggle POSTHOG_KEY and
// re-resolve. Not used in production code.
export const __resetAnalyticsForTest = (): void => {
  cachedClient = null
  resolved = false
}
