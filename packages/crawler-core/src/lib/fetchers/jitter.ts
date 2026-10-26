// Shared crawl-delay jitter (#985).
//
// Every fetcher that paces its own requests adds up to 1000ms of random jitter
// to the configured crawl delay so a run doesn't hit a host on a bot-like fixed
// interval. It was duplicated across the HTML cascade (lib/fetcher.ts),
// VenuePilot, detail-page and Live Nation before being centralized here.

/**
 * Jitter a crawl delay by adding 0–999ms.
 *
 * Additive only: the configured delay is a floor, and /bot publishes it as
 * "at least 3 seconds". Jitter that could subtract would break that promise.
 *
 * A venue that asks for no delay gets none — without the zero guard,
 * jittering zero would sometimes return up to 999ms and pace the admin probe.
 */
export function jitter(ms: number): number {
  if (ms <= 0) return 0
  return ms + Math.floor(Math.random() * 1000)
}
