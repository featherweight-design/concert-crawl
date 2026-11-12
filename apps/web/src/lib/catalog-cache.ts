// The shared, server-side cache for public catalog reads (caching skill,
// sections 1 to 4; rules in .claude/fwd/caching.md).
//
// What goes in: reads whose answer is the same for every visitor (the events
// list and detail as a logged-out visitor sees them, venues, genres). What
// never does: anything read with a token. The only way in is `anonymousRequest`,
// which sends no `Authorization` and no service key, so a personal field (an
// `isWatching`, a followed-artists overlay) cannot reach a cached body. A signed
// in page keeps calling `apiClient` for its personal read.
//
// The key: Next's data cache keys a fetch on its URL and request headers, so the
// version rides in one header the API ignores: the data generation stamp (a crawl
// or an admin edit retires every entry), the deployment id (a new build never
// serves the previous build's payload shape) and the Mountain Time date (a read
// relative to "today" never crosses midnight). A long ceiling and the `catalog`
// tag (POST /api/revalidate, called after a crawl) are the backstop.
import { cache } from 'react';
import { anonymousRequest } from './api';
import { DENVER_TIME_ZONE } from './time';

/** The longest an entry lives if its stamp is somehow never moved. */
export const CATALOG_REVALIDATE_SECONDS = 3600;
/** How long the generation stamp itself is held before it is read again. */
export const GENERATION_REVALIDATE_SECONDS = 60;
export const CATALOG_TAG = 'catalog';
/** What the stamp falls back to when it cannot be read: a read never fails for it. */
export const FALLBACK_GENERATION = '0';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

/** Today's date in Denver, `YYYY-MM-DD`. */
export const mountainDate = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: DENVER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const isGenerationBody = (
  body: unknown,
): body is { data: { generation: string } } =>
  typeof body === 'object' &&
  body !== null &&
  'data' in body &&
  typeof body.data === 'object' &&
  body.data !== null &&
  'generation' in body.data &&
  typeof body.data.generation === 'string';

// Held for a minute by Next's data cache, and deduped within one request by
// React's cache(). Never throws: a missing stamp is the fixed fallback.
const readGeneration = cache(async (): Promise<string> => {
  try {
    const res = await fetch(`${API_URL}/v1/catalog/generation`, {
      next: {
        revalidate: GENERATION_REVALIDATE_SECONDS,
        tags: [CATALOG_TAG],
      },
    });
    if (!res.ok) return FALLBACK_GENERATION;
    const body: unknown = await res.json();
    return isGenerationBody(body) ? body.data.generation : FALLBACK_GENERATION;
  } catch (err) {
    console.error('catalog generation unreadable, using the fixed stamp', err);
    return FALLBACK_GENERATION;
  }
});

/** The key stamp for one read: generation, deployment id, Mountain date. */
export const catalogKey = async (): Promise<string> =>
  [
    `g${await readGeneration()}`,
    `b${process.env['VERCEL_DEPLOYMENT_ID'] ?? 'dev'}`,
    `d${mountainDate()}`,
  ].join('.');

/**
 * Read a public catalog path through the shared cache. A failed read (a non-OK
 * status, a non-JSON body) throws before Next can store it, so only good answers
 * are kept; the caller's own try/catch decides what to show instead.
 */
export const publicCatalogGet = async <T>(path: string): Promise<T> =>
  anonymousRequest<T>(path, {
    headers: { 'x-catalog-key': await catalogKey() },
    next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: [CATALOG_TAG] },
  });
