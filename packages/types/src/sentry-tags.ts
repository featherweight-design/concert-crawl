/**
 * Searchable Sentry tags shared by every app (web, API, crawler). Imported
 * through the `@concert-crawl/types/sentry-tags` subpath, like the privacy
 * options, so a browser bundle never pulls in the whole types barrel.
 *
 * Nothing here reads the environment: each caller passes the key in, so the
 * "key unset" case is a plain argument and a test can cover it.
 */

/** The value of the `app` tag on every event from every runtime. */
export const SENTRY_APP_TAG = 'concert-crawl';

/** For `Sentry.init({ initialScope })`: puts `app` on every event. */
export const SENTRY_INITIAL_SCOPE = Object.freeze({
  tags: Object.freeze({ app: SENTRY_APP_TAG }),
});

const HASH_HEX_CHARS = 16;

/**
 * A keyed hash of a user id, safe to put in a tag: HMAC-SHA256 under a
 * server-side key, hex, cut to 16 characters. The raw Clerk id never leaves
 * the process, and without the key a tag value cannot be mapped back to a
 * user. Returns undefined, so the tag is simply left off, when the key is
 * unset or blank or there is no user. WebCrypto, so it runs on Node and Edge.
 */
export async function sentryUserHash(
  userId: string | null | undefined,
  key: string | null | undefined,
): Promise<string | undefined> {
  const secret = key?.trim();
  if (!secret || !userId) return undefined;
  const encoder = new TextEncoder();
  const hmacKey = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    hmacKey,
    encoder.encode(userId),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  )
    .join('')
    .slice(0, HASH_HEX_CHARS);
}

const TIER_PATTERN = /^[a-z0-9_-]{1,32}$/i;

/**
 * The tier tag from a Clerk session's claims (`metadata.plan`), with no
 * lookup. Anything that is not a short plain word, or no claim at all, reads
 * as `unknown`, so a claim can never carry free text into a tag.
 */
export function sentryTier(claims: unknown): string {
  if (typeof claims !== 'object' || claims === null) return 'unknown';
  const metadata = (claims as { metadata?: unknown }).metadata;
  if (typeof metadata !== 'object' || metadata === null) return 'unknown';
  const plan = (metadata as { plan?: unknown }).plan;
  return typeof plan === 'string' && TIER_PATTERN.test(plan)
    ? plan.toLowerCase()
    : 'unknown';
}
