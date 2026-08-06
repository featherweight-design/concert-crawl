/**
 * An invite token is a capability: whoever holds it can join the crew. It
 * travels as a URL path segment, and Sentry's default fetch/XHR breadcrumbs
 * record full request URLs, so without this the token lands in telemetry that
 * far more people can read than were ever invited.
 */
const REDACTED = '[redacted]'

const TOKEN_PATH_PATTERNS: RegExp[] = [
  // The API call, and the page the invitee actually lands on.
  /(\/v1\/crew-invites\/)[^/?#]+/g,
  /(\/crew\/join\/)[^/?#]+/g,
]

/** Replaces the token segment in any URL-ish string, leaving the rest legible. */
export const redactInviteTokens = (value: string): string =>
  TOKEN_PATH_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, `$1${REDACTED}`),
    value,
  )

const redactUnknown = (value: unknown): unknown =>
  typeof value === 'string' ? redactInviteTokens(value) : value

export const beforeBreadcrumb = <
  T extends { message?: string; data?: Record<string, unknown> },
>(
  breadcrumb: T,
): T => {
  const next = { ...breadcrumb }
  if (typeof next.message === 'string') {
    next.message = redactInviteTokens(next.message)
  }
  if (next.data) {
    next.data = Object.fromEntries(
      Object.entries(next.data).map(([key, value]) => [
        key,
        redactUnknown(value),
      ]),
    )
  }
  return next
}

export const beforeSend = <
  T extends { request?: { url?: string }; transaction?: string },
>(
  event: T,
): T => {
  const next = { ...event }
  if (next.request?.url) {
    next.request = {
      ...next.request,
      url: redactInviteTokens(next.request.url),
    }
  }
  if (typeof next.transaction === 'string') {
    next.transaction = redactInviteTokens(next.transaction)
  }
  return next
}
