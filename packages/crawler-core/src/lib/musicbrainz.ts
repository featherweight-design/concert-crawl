// MusicBrainz exact-name lookup, used only as evidence by the artist repair
// pass (see joined-names.ts). One request at a time, at most one per second,
// with a timeout and the crawler's own bot user agent (no email). A failed or
// timed-out call reads as "not known", which leaves the event unresolved rather
// than guessing.

import { CRAWLER_USER_AGENT } from '@concert-crawl/types';

const ENDPOINT = 'https://musicbrainz.org/ws/2/artist/';
const MIN_GAP_MS = 1100;
const TIMEOUT_MS = 8000;

interface MusicBrainzArtist {
  name?: unknown;
  aliases?: unknown;
}

const normalise = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

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

/** A lookup that is true when an artist is named exactly `name` (alias counts). */
export const makeMusicBrainzLookup = (
  options: MusicBrainzClientOptions = {},
): ((name: string) => Promise<boolean>) => {
  const doFetch = options.fetchImpl ?? fetch;
  const sleep =
    options.sleepImpl ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const cache = new Map<string, boolean>();
  let lastAt = 0;
  // Calls queue behind one another so two lookups never overlap.
  let chain: Promise<unknown> = Promise.resolve();

  const lookup = async (name: string): Promise<boolean> => {
    const key = normalise(name);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const wait = lastAt + MIN_GAP_MS - now();
    if (wait > 0) await sleep(wait);
    lastAt = now();
    let found = false;
    try {
      const url = new URL(ENDPOINT);
      url.searchParams.set('query', `artist:"${name.replace(/"/g, '')}"`);
      url.searchParams.set('fmt', 'json');
      url.searchParams.set('limit', '10');
      const res = await doFetch(url, {
        headers: {
          'User-Agent': CRAWLER_USER_AGENT,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) {
        const body: unknown = await res.json();
        const artists =
          typeof body === 'object' &&
          body !== null &&
          'artists' in body &&
          Array.isArray(body.artists)
            ? body.artists
            : [];
        found = artists.some(
          (artist: MusicBrainzArtist) =>
            typeof artist === 'object' &&
            artist !== null &&
            namesOf(artist).includes(key),
        );
        cache.set(key, found);
      }
    } catch {
      // Unreachable or slow: not known, and not cached, so a later row retries.
      found = false;
    }
    return found;
  };

  return (name) => {
    const next = chain.then(() => lookup(name));
    chain = next.catch(() => undefined);
    return next;
  };
};
