// What leaves the browser in an analytics event (posthog-js `before_send`).
//
// An invite token is a capability (see `redactInviteTokens`), and a pageview's
// URL properties — current, initial, referrer — and an autocaptured link's
// href all carry the path it travels in. Every string in an event is passed
// through the same redaction Sentry uses. A string that IS a URL (absolute,
// or a path starting with `/`) also loses everything from its first `?` or
// `#`: the query and fragment carry search text a reader typed and one-time
// auth parameters, neither of which usage analytics needs.
//
// `$elements_chain` is one serialized string, `tag:key="value"key="value";…`,
// in which posthog-js escapes a `"` inside a value as `\"`. Each quoted value
// is redacted on its own, so a value never runs into the next attribute.
import type { CaptureResult, Properties } from 'posthog-js'
import { redactInviteTokens } from '@/lib/sentry-redact'

const URL_START = /^(?:https?:\/\/|\/)/i

export const redactAnalyticsString = (value: string): string =>
  redactInviteTokens(
    URL_START.test(value) ? (value.split(/[?#]/, 1)[0] ?? '') : value,
  )

// A double-quoted chain value, escaped quotes included.
const CHAIN_VALUE = /"((?:\\"|[^"])*)"/g

export const redactElementsChain = (chain: string): string =>
  chain.replace(
    CHAIN_VALUE,
    (_match, inner: string) => `"${redactAnalyticsString(inner)}"`,
  )

const redactValue = (value: unknown): unknown => {
  if (typeof value === 'string') return redactAnalyticsString(value)
  if (Array.isArray(value)) return value.map(redactValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, redactValue(inner)]),
    )
  }
  return value
}

const redactProperties = (properties: Properties): Properties =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      key === '$elements_chain' && typeof value === 'string'
        ? redactElementsChain(value)
        : redactValue(value),
    ]),
  )

export const redactCapture = (
  event: CaptureResult | null,
): CaptureResult | null => {
  if (event === null) return null
  return {
    ...event,
    properties: redactProperties(event.properties),
    ...(event.$set ? { $set: redactProperties(event.$set) } : {}),
    ...(event.$set_once
      ? { $set_once: redactProperties(event.$set_once) }
      : {}),
  }
}
