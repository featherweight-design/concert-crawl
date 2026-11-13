// MusicBrainz exact-name lookup, used only as evidence by the artist repair
// pass (see joined-names.ts). One request at a time, at most one per second,
// with a timeout and the crawler's own bot user agent (no email). A failed,
// rate-limited or timed-out call is UNKNOWN (null), never "no such artist", so
// it leaves the event unresolved rather than guessing. A busy server (503) or
// a rate limit (429) is retried after 2, 5 and 10 seconds before giving up.

import { CRAWLER_USER_AGENT } from '@concert-crawl/types';

const ENDPOINT = 'https://musicbrainz.org/ws/2/artist/';
const MIN_GAP_MS = 1100;
const TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [2000, 5000, 10000];

interface MusicBrainzArtist {
  name?: unknown;
  aliases?: unknown;
}

// "&" and "+" are the same joiner for this comparison: a venue's "for KING +
// COUNTRY" is MusicBrainz's "for KING & COUNTRY".
const normalise = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s+[&+]\s+/g, ' & ')
    .replace(/\s+/g, ' ');

const namesOf = (artist: MusicBrainzArtist): string[] => {
  const names: string[] = [];
  if (typeof artist.name === 'string') names.push(artist.name);
  if (Array.isArray(artist.aliases)) {
    for (const alias of artist.aliases) {
      if (
        typeof alias === 'object' &&
        alias !== null &&
        'name' in alias &&
        typeof alias.name === 'string'
      )
        names.push(alias.name);
    }
  }
  return names.map(normalise);
};

export interface MusicBrainzClientOptions {
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** How each distinct name ended, so a run can tell real unknowns from outages. */
export interface MusicBrainzStats {
  found: number;
  /** MusicBrainz answered and has no artist by that name. */
  notFound: number;
  /** MusicBrainz could not be asked (busy after every retry, down, timed out). */
  unavailable: number;
}

export type MusicBrainzLookup = ((name: string) => Promise<boolean | null>) & {
  stats: MusicBrainzStats;
};

/** A lookup that is true when an artist is named exactly `name` (alias counts). */
export const makeMusicBrainzLookup = (
  options: MusicBrainzClientOptions = {},
): MusicBrainzLookup => {
  const doFetch = options.fetchImpl ?? fetch;
  const sleep =
    options.sleepImpl ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  // Answers for the run. A name that could not be asked (null) is cached too:
  // after one exhausted retry sequence the same name is not asked again for
  // every event that carries it, which would spend about 17 seconds each.
  const cache = new Map<string, boolean | null>();
  const stats: MusicBrainzStats = { found: 0, notFound: 0, unavailable: 0 };
  let lastAt = 0;
  // Calls queue behind one another so two lookups never overlap.
  let chain: Promise<unknown> = Promise.resolve();

  // One request, never throwing: a Response, or null when none came back.
  const ask = async (name: string): Promise<Response | null> => {
    const wait = lastAt + MIN_GAP_MS - now();
    if (wait > 0) await sleep(wait);
    lastAt = now();
    try {
      const url = new URL(ENDPOINT);
      url.searchParams.set(
        'query',
        `artist:"${name.replace(/["\\]/g, ' ').trim()}"`,
      );
      url.searchParams.set('fmt', 'json');
      url.searchParams.set('limit', '25');
      return await doFetch(url, {
        headers: {
          'User-Agent': CRAWLER_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }
  };

  const lookup = async (name: string): Promise<boolean | null> => {
    const key = normalise(name);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let res = await ask(name);
    for (const delay of RETRY_DELAYS_MS) {
      if (res !== null && res.status !== 503 && res.status !== 429) break;
      // A Retry-After the server sends is honoured when it asks for longer.
      const asked = Number(res?.headers.get('retry-after'));
      const wait = Number.isFinite(asked)
        ? Math.max(delay, Math.min(asked, 60) * 1000)
        : delay;
      await res?.body?.cancel().catch(() => undefined);
      await sleep(wait);
      res = await ask(name);
    }
    // null = could not ask (outage, rate limit, a bad reply): never "no such artist".
    if (res === null || !res.ok) {
      cache.set(key, null);
      stats.unavailable += 1;
      return null;
    }
    try {
      const body: unknown = await res.json();
      const list =
        typeof body === 'object' &&
        body !== null &&
        'artists' in body &&
        Array.isArray(body.artists)
          ? body.artists
          : [];
      const found = list.some(
        (artist: MusicBrainzArtist) =>
          typeof artist === 'object' &&
          artist !== null &&
          namesOf(artist).includes(key),
      );
      cache.set(key, found);
      if (found) stats.found += 1;
      else stats.notFound += 1;
      return found;
    } catch {
      cache.set(key, null);
      stats.unavailable += 1;
      return null;
    }
  };

  const queued = (name: string): Promise<boolean | null> => {
    const next = chain.then(() => lookup(name));
    chain = next.catch(() => undefined);
    return next;
  };
  return Object.assign(queued, { stats });
};
