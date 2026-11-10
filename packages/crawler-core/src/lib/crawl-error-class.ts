// Turns a crawl error message into a stable class: a kind, and a key that is
// the same for one cause however many venues it hits. Any code asking "is this
// the same failure?" should ask it here, so the answers never drift apart.

export type CrawlErrorKind = 'llm_quota' | 'llm_rate_limit' | 'other';

export interface CrawlErrorClass {
  kind: CrawlErrorKind;
  /** The kind itself for a known class; the normalized message otherwise. */
  key: string;
}

// Anthropic's account-level refusals, matched on their text as the API returns
// it. None says anything about the venue: every LLM-extracted venue fails
// identically until the account recovers (2026-09-28: 8 of 20). The spend
// limits (org or workspace, a 400) and the tier's monthly spend cap (a 429
// carrying `enforced_spend_limit_reached`) are all the same class.
const LLM_QUOTA_PATTERNS: readonly RegExp[] = [
  /reached your (specified (workspace )?)?API usage limits/i,
  /enforced_spend_limit_reached/i,
  /credit balance is too low/i,
];

// An ordinary rate-limit 429 is transient rather than a spend limit, but it is
// just as account-wide: the limit is the organization's, shared with every
// other app on the account, and the SDK has already retried it (twice, with
// backoff) before it reaches the crawl. It keeps its own class so Sentry and
// the run alert name the right remedy. Matched on the API's error type, never
// on a bare status: a venue's own 429 is a block and must stay one.
//
// Anthropic's 529 `overloaded_error` joins it. It is the API's capacity, not
// the venue, and the SDK retries it the same way before giving up.
const LLM_RATE_LIMIT_PATTERN =
  /"type"\s*:\s*"(rate_limit_error|overloaded_error)"/;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const MAX_KEY_LENGTH = 160;

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
    .slice(0, MAX_KEY_LENGTH);
}

/**
 * True when the failure belongs to the LLM account rather than the venue, so it
 * must not count toward the venue's three strikes.
 */
export function isAccountWideKind(kind: CrawlErrorKind): boolean {
  return isAccountWideErrorClass(kind);
}

/** The kind alone, without building the normalized key. */
export function crawlErrorKind(message: string): CrawlErrorKind {
  if (LLM_QUOTA_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'llm_quota';
  }
  if (LLM_RATE_LIMIT_PATTERN.test(message)) return 'llm_rate_limit';
  return 'other';
}

/**
 * The same test for a string that may be any class name, as an admin surface
 * receives it over the wire.
 */
export function isAccountWideErrorClass(errorClass: string): boolean {
  return errorClass === 'llm_quota' || errorClass === 'llm_rate_limit';
}

export function classifyCrawlError(message: string): CrawlErrorClass {
  const kind = crawlErrorKind(message);
  return {
    kind,
    key: kind === 'other' ? normalizeErrorMessage(message) : kind,
  };
}

/**
 * Sentry grouping for a recorded crawl failure (a crawl_runs row with status
 * failed): one issue per cause. Used at the apps/crawler run.ts capture sites
 * for both the daily and triggered paths. Without it those captures group on
 * their call site, every distinct cause lands in one long-lived issue, and the
 * issue-alert rule (which fires on transitions only) never pages for a new one.
 *
 * Two paths deliberately keep default grouping. An unexpected throw out of
 * crawlVenue has no crawl_runs row but has a real stack trace, which is the
 * right thing to group on. And crawl.ts's own `crawl.failed` report must not
 * share this fingerprint: Sentry would merge its event into the same issue as
 * the run.ts exception and double every count.
 */
export function crawlFailureGrouping(message: string): {
  fingerprint: string[];
  errorKind: CrawlErrorKind;
} {
  const { kind, key } = classifyCrawlError(message);
  return { fingerprint: ['crawl.failed', key], errorKind: kind };
}
