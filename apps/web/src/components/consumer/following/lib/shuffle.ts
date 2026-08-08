// Per-session shuffle for the starter shelf (native following, PR 4).
//
// The shelf must not show the same six artists on every visit, but it also
// must not reshuffle on every re-render — a row that reorders under a thumb
// mid-tap is worse than a static one. So the order is a pure function of a
// seed held for the tab's lifetime.
//
// ⚠️ The seed is read in an effect, never during render. Server HTML and the
// first client render are both the API's order; the shuffle applies one frame
// later. Reading sessionStorage during render would be a hydration mismatch.

import { SHELF_SHUFFLE_SEED_KEY } from '../definitions/constants'

/** mulberry32 — small, deterministic, and no dependency. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let next = Math.imul(state ^ (state >>> 15), 1 | state)
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates against a seeded stream. Never mutates the input. */
export const shuffleWithSeed = <T>(items: readonly T[], seed: number): T[] => {
  const next = seededRandom(seed)
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    const swap = out[i]
    const other = out[j]
    // Index math above cannot go out of range, but noUncheckedIndexedAccess
    // says so anyway and a silent undefined here would blank a card.
    if (swap === undefined || other === undefined) continue
    out[i] = other
    out[j] = swap
  }
  return out
}

/**
 * The tab's seed, minted on first read. Returns null when storage is
 * unavailable (Safari private mode throws on access, not just on write), which
 * the caller reads as "leave the API's order alone".
 */
export const readSessionSeed = (): number | null => {
  try {
    const existing = window.sessionStorage.getItem(SHELF_SHUFFLE_SEED_KEY)
    if (existing !== null) {
      const parsed = Number(existing)
      if (Number.isFinite(parsed)) return parsed
    }
    const minted = Math.floor(Math.random() * 0xffffffff)
    window.sessionStorage.setItem(SHELF_SHUFFLE_SEED_KEY, String(minted))
    return minted
  } catch (err: unknown) {
    console.warn('shelf shuffle seed unavailable; keeping API order', err)
    return null
  }
}
