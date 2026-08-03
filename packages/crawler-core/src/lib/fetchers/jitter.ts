// Shared crawl-delay jitter (#985).
//
// Every fetcher that paces its own requests jitters the configured crawl
// delay by ±500ms so a run doesn't hit a host on a bot-like fixed interval.
// It was duplicated across the HTML cascade (lib/fetcher.ts), VenuePilot,
// detail-page and Live Nation before being centralized here.

/**
 * Jitter a crawl delay by ±500ms, clamped to >= 0.
 *
 * A venue that asks for no delay gets none — without the zero guard,
 * jittering zero would sometimes return up to 499ms and pace the admin probe.
 */
export function jitter(ms: number): number {
  if (ms <= 0) return 0
  return Math.max(0, ms + Math.floor(Math.random() * 1000) - 500)
}
