import type { ErrorEvent, EventHint } from '@sentry/hono/node';

// Since Sentry 11 the SDK captures no request bodies (`httpBodies: []` in
// SENTRY_PRIVACY_OPTIONS, from @concert-crawl/types/sentry), which ends the
// scanner-payload visibility bodies used to give. This scrubber stays as the
// second line: if a body ever reaches an event, PII (waitlist/invite emails)
// and bearer-equivalent secrets (the signed unsubscribe token) are replaced
// before it leaves the process.
const SENSITIVE_KEY = /email|token|password|secret|apikey|authorization/i;

const REDACTED = '[Redacted]';

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubValue);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(val),
      ]),
    );
  }
  return value;
}

// A body that doesn't parse is returned untouched: it has no key/value structure
// to scrub, and it is precisely the malformed-payload case we most want to read.
export function scrubRequestBody(body: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  return JSON.stringify(scrubValue(parsed));
}

export function scrubEvent(event: ErrorEvent, _hint?: EventHint): ErrorEvent {
  const data = event.request?.data;
  if (event.request && typeof data === 'string') {
    event.request.data = scrubRequestBody(data);
  }
  return event;
}
