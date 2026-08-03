/**
 * FNV-1a, ported verbatim from
 * `design/design_handoff_shareable_cards/shareable-data.jsx` (`_hashStr`).
 * Returns eight lowercase hex characters, zero-padded.
 */
export const hashStr = (input: string): string => {
  let hash = 0x811c9dc5 >>> 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash ^ input.charCodeAt(i)) >>> 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return ('0000000' + hash.toString(16)).slice(-8)
}

export interface MintEvent {
  id: string
  state: string
}

export interface MintUser {
  id: string
  /** Public handle, or `null`/absent for an anonymous caller. */
  handle?: string | null
}

export interface MintMeta {
  /** Zero-padded to 4. Metadata only — never drawn on the card (README §3). */
  serial: string
  /** `null` for an anonymous caller. */
  by: string | null
  /** ISO-8601. Metadata only — never drawn on the card (README §3). */
  mintedAt: string
  /** Eight uppercase hex characters. Stable for stable inputs. */
  contentHash: string
}

/**
 * Derive the mint metadata for one share. `contentHash` is a pure function of
 * `(event.id, user.id, event.state)`, which is exactly what makes it usable as
 * a cache key: the same three inputs must always produce the same PNG.
 */
export const mintMeta = (
  event: MintEvent,
  user: MintUser,
  serial = 1,
): MintMeta => ({
  serial: String(serial).padStart(4, '0'),
  by: user.handle ?? null,
  mintedAt: new Date().toISOString(),
  contentHash: hashStr(`${event.id}:${user.id}:${event.state}`).toUpperCase(),
})

/**
 * Fingerprint of everything actually drawn on the card.
 *
 * Deliberately separate from `contentHash`, which is the mint identity and is
 * locked by the handoff to `(event, user, state)`. That is too narrow to cache
 * on: a corrected artist name or a changed drop amount moves the pixels
 * without moving the state, so the ETag would keep serving the old PNG for the
 * full `s-maxage` day. Every field the poster renders belongs here — adding one
 * to the card and forgetting it here is the bug this guards against.
 *
 * JSON-encoded rather than delimiter-joined: any separator can also occur
 * inside a venue or artist name, so `['A B', 'C']` and `['A', 'B C']` would
 * collide and two visibly different cards would share a cache entry.
 */
export const posterFingerprint = (fields: Array<string | null>): string =>
  hashStr(JSON.stringify(fields))

/**
 * Cache key for a rendered share image. Deliberately excludes `serial` and
 * `mintedAt` — they are metadata, not content, and folding either in would
 * make every render a cache miss.
 */
export const shareCacheKey = (
  eventId: string,
  userId: string,
  contentHash: string,
): string => `share:${eventId}:${userId}:${contentHash}`
