import type { ErrorEvent, EventHint } from '@sentry/hono/node'

// Sentry's Hono integration records request bodies. That is deliberately kept —
// it is what let us identify a scanner's injection payloads after the fact — but
// some bodies carry PII (waitlist/invite emails) or bearer-equivalent secrets
// (the signed unsubscribe token). Those values are replaced before the event
// leaves the process.
const SENSITIVE_KEY = /email|token|password|secret|apikey|authorization/i

const REDACTED = '[Redacted]'

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(val),
      ]),
    )
  }
  return value
}

// A body that doesn't parse is returned untouched: it has no key/value structure
// to scrub, and it is precisely the malformed-payload case we most want to read.
export function scrubRequestBody(body: string): string {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return body
  }
  return JSON.stringify(scrubValue(parsed))
}

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  const data = event.request?.data
  if (event.request && typeof data === 'string') {
    event.request.data = scrubRequestBody(data)
  }
  return event
}
