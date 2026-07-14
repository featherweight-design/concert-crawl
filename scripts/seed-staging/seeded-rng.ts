/**
 * Concert Crawl — deterministic seeded PRNG for synthetic staging data.
 *
 * Uses the mulberry32 algorithm: simple, fast, good statistical properties,
 * and produces an identical value stream for any given seed. This is required
 * so synthetic data is reproducible across seed runs — the same seed always
 * generates the same users, watchlists, and feedback entries.
 *
 * Never use Math.random() in the seeder — it is non-deterministic and would
 * produce different data on every run, making staging data drift unpredictably.
 */

export const createRng = (seed: number) => {
  let state = seed >>> 0
  const next = () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let tt = Math.imul(state ^ (state >>> 15), 1 | state)
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) =>
      Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
  }
}
