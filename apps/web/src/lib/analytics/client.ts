// Web monetization analytics (eng-infra spec Part 2 §8).
//
// posthog-js captures the client-side funnel events — picker views, tier
// selections, payment-surface opens, client-side declines. Every event is
// keyed to the Clerk userId (via identifyUser) so it joins the server-fired
// events into one funnel.
//
// No-op when NEXT_PUBLIC_POSTHOG_KEY is absent: local dev and preview builds
// have no key, and a missing key must never break the UI. `initialized`
// gates every call, so track/identify are safe to call unconditionally.

import posthog from 'posthog-js'
import type {
  MonetizationEvent,
  MonetizationEventProps,
} from '@concert-crawl/types'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

let initialized = false

export const initAnalytics = (): void => {
  if (initialized || typeof window === 'undefined') return
  const apiKey = process.env['NEXT_PUBLIC_POSTHOG_KEY']
  if (apiKey === undefined || apiKey.length === 0) return
  try {
    posthog.init(apiKey, {
      api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? DEFAULT_POSTHOG_HOST,
      // We fire the funnel events explicitly; autocapture and pageviews would
      // only add noise to a monetization-scoped project.
      autocapture: false,
      capture_pageview: false,
      // Only build person profiles for signed-in (identified) users — anonymous
      // browsing does not need a profile.
      person_profiles: 'identified_only',
    })
    initialized = true
  } catch (err) {
    // A misconfiguration, blocked storage, or SDK regression must never crash
    // the app — leave analytics disabled and carry on.
    console.error('analytics: posthog.init failed', err)
  }
}

export const isAnalyticsEnabled = (): boolean => initialized

// Bind subsequent events to the Clerk userId so client + server events join.
export const identifyUser = (userId: string): void => {
  if (!initialized) return
  try {
    posthog.identify(userId)
  } catch (err) {
    console.error('analytics: identify failed', err)
  }
}

// Drop the identity on sign-out so a shared device does not attribute the
// next user's events to the previous one.
export const resetAnalyticsIdentity = (): void => {
  if (!initialized) return
  try {
    posthog.reset()
  } catch (err) {
    console.error('analytics: reset failed', err)
  }
}

// Typed client-side capture. `event` constrains `properties` to that event's
// shape via the shared contract, so a wrong property name or type is a
// compile error. No-ops (never throws) when analytics is disabled.
export const track = <TEvent extends MonetizationEvent>(
  event: TEvent,
  properties: MonetizationEventProps<TEvent>,
): void => {
  if (!initialized) return
  try {
    posthog.capture(event, properties)
  } catch (err) {
    // A capture must never surface to the UI that fired it.
    console.error('analytics: capture failed', err)
  }
}
