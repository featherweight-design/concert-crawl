// Turns a crawl error message into a stable class: a kind, and a key that is
// the same for one cause however many venues it hits. Any code asking "is this
// the same failure?" should ask it here, so the answers never drift apart.

export type CrawlErrorKind = 'llm_quota' | 'other'

export interface CrawlErrorClass {
  kind: CrawlErrorKind
  /** The kind itself for a known class; the normalized message otherwise. */
  key: string
}

// Anthropic's two account-level refusals, matched on their message text as the
// API returns it. Neither says anything about the venue: every LLM-extracted
// venue fails identically until the account recovers (2026-09-28: 8 of 20).
const LLM_QUOTA_PATTERNS: readonly RegExp[] = [
  /reached your specified API usage limits/i,
  /credit balance is too low/i,
]

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const MAX_KEY_LENGTH = 160

/**
 * Strips what varies per venue or per request, so one cause across several
 * venues produces one key. Only digit runs of 4+ collapse: timeouts, ports
 * and timestamps vary, but a 3-digit status code is the cause itself.
 */
export function normalizeErrorMessage(message: string): string {
  return message
    .replace(/req_[A-Za-z0-9]+/g, 'req_*')
    .replace(UUID, '<uuid>')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\d{4,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_KEY_LENGTH)
}

export function classifyCrawlError(message: string): CrawlErrorClass {
  if (LLM_QUOTA_PATTERNS.some((pattern) => pattern.test(message))) {
    return { kind: 'llm_quota', key: 'llm_quota' }
  }
  return { kind: 'other', key: normalizeErrorMessage(message) }
}

/**
 * Sentry grouping for a failed crawl: one issue per cause, on every path that
 * reports one. Without it, each path groups on its own call site or event name,
 * so every distinct cause lands in one long-lived issue and the issue-alert
 * rule (which fires on transitions only) never pages for a new cause.
 */
export function crawlFailureGrouping(message: string): {
  fingerprint: string[]
  errorKind: CrawlErrorKind
} {
  const { kind, key } = classifyCrawlError(message)
  return { fingerprint: ['crawl.failed', key], errorKind: kind }
}
