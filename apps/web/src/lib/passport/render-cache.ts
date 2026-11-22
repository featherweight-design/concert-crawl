import { createHash } from 'node:crypto';

/**
 * The rendered passport, kept so a repeat share does not pay for satori again.
 *
 * Keyed on what the card is drawn from, not on a clock: the account, the
 * handle, the year, the theme tokens, every stamp and this deployment. Adding
 * a stamp changes the key, so the old card retires itself and nothing has to
 * remember to invalidate. The account is in the key, so even identical
 * contents are never shared across users.
 *
 * Held in this process only. A cold instance renders once and then serves its
 * own repeats; the browser's `ETag` revalidation covers the rest. A shared
 * store is a spend call, not made here.
 */

const MAX_ENTRIES = 16;

// Without a deployment id (local, self-hosted) a fixed fallback would let a new
// build keep an old ETag, so fall back to this process's start: a deploy
// restarts the process and retires every card.
const BUILD_STAMP =
  process.env['VERCEL_DEPLOYMENT_ID'] ?? `proc${Date.now().toString(36)}`;

const rendered = new Map<string, ArrayBuffer>();
const inFlight = new Map<string, Promise<ArrayBuffer>>();

export interface PassportKeyParts {
  userId: string;
  ratio: string;
  handle: string | null;
  year: number;
  tokens: Record<string, string>;
  shows: readonly unknown[];
}

export const passportCacheKey = (parts: PassportKeyParts): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        BUILD_STAMP,
        parts.userId,
        parts.ratio,
        parts.handle,
        parts.year,
        parts.tokens,
        parts.shows,
      ]),
    )
    .digest('hex');

export const passportEtag = (key: string): string => `"${key.slice(0, 32)}"`;

/** True when the browser already holds this exact card. */
export const matchesEtag = (
  ifNoneMatch: string | null,
  etag: string,
): boolean =>
  ifNoneMatch !== null &&
  ifNoneMatch.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag);

/**
 * The cached card, or one render shared by every request for the same key. A
 * failed render is never stored, so one bad moment is not pinned.
 */
export const renderOnce = async (
  key: string,
  render: () => Promise<ArrayBuffer>,
): Promise<ArrayBuffer> => {
  const hit = rendered.get(key);
  if (hit !== undefined) {
    // Re-insert so the Map's order is least-recently-used first.
    rendered.delete(key);
    rendered.set(key, hit);
    return hit;
  }
  const pending = inFlight.get(key);
  if (pending !== undefined) {
    return pending;
  }
  const job = render()
    .then((png) => {
      rendered.set(key, png);
      while (rendered.size > MAX_ENTRIES) {
        const oldest = rendered.keys().next().value;
        if (oldest === undefined) break;
        rendered.delete(oldest);
      }
      return png;
    })
    .finally(() => {
      inFlight.delete(key);
    });
  inFlight.set(key, job);
  return job;
};

/** Test seam: start from an empty cache. */
export const clearPassportRenderCache = (): void => {
  rendered.clear();
  inFlight.clear();
};
