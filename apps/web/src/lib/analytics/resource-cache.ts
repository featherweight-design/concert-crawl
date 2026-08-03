/**
 * Whether a fetched resource came from a cache rather than the network.
 *
 * The poster PNG is drawn on demand and measured at 2.7–6.8s cold, so the
 * cache-hit rate is the number that says whether the ETag work is paying for
 * itself. The render happens in an edge route with no analytics client, so the
 * signal has to be read on the client from the resource timing entry.
 *
 * `transferSize === 0` on a successful load means nothing came over the wire —
 * a memory or disk cache hit, or a 304 revalidation. That is exactly the
 * distinction we want, and it is the reading the Resource Timing spec
 * guarantees for a same-origin entry.
 *
 * Returns false whenever it cannot tell: no Performance API (jsdom, older
 * browsers), no matching entry, or a cross-origin entry that reports zeroes
 * for everything. A conservative false understates the hit rate rather than
 * inventing one.
 */
export const wasServedFromCache = (url: string): boolean => {
  try {
    if (typeof performance === 'undefined') return false
    if (typeof performance.getEntriesByName !== 'function') return false

    // Relative srcs are resolved against the document before they are recorded.
    const resolved = new URL(url, window.location.href).href
    const entries = performance.getEntriesByName(resolved, 'resource')
    const latest = entries.at(-1)
    if (latest === undefined) return false

    // `transferSize` is only on PerformanceResourceTiming, and `getEntriesByName`
    // is typed as returning the base entry — narrow rather than cast.
    if (!('transferSize' in latest)) return false
    const { transferSize } = latest
    if (typeof transferSize !== 'number') return false

    return transferSize === 0
  } catch (err) {
    // A timing read must never surface to the UI it was measuring.
    console.error('analytics: cache-hit detection failed', err)
    return false
  }
}
