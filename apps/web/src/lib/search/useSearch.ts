'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ArtistSearchResult } from '@concert-crawl/types';
import { useAuthToken } from './useAuthToken';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const RECENT_KEY = 'cc_recent_searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

export interface ArtistResult {
  name: string;
  nextDate: string;
  venueShort: string;
  /**
   * The soonest show's genres, artwork, portrait and price (B19): the row
   * draws them the way every event row does. Optional, because they ride on
   * the events list rather than being guaranteed by it.
   */
  genres?: string[] | null;
  imageUrl?: string | null;
  artistPhotoUrl?: string | null;
  ticketPriceMin?: string | null;
}

export interface VenueResult {
  name: string;
  slug: string;
  showCount: number;
  matchingEventId: string;
}

export interface PopularEvent {
  id: string;
  title: string;
  artist: string;
  date: string;
  /** The event's own artwork, first choice for the row's tile (#1525). */
  imageUrl: string | null;
  /** The headliner's portrait, second choice behind `imageUrl`. */
  artistPhotoUrl: string | null;
  ticketPriceMin: string | null;
  watcherCount: number;
  venue: { name: string; slug: string };
  /** The show's genres, for the row's ring and chip (B19). */
  genre?: string[] | null;
}

interface EventRow {
  id: string;
  artist: string;
  date: string;
  title: string;
  venue: { id: string; name: string; slug: string };
  genre?: string[] | null;
  imageUrl?: string | null;
  artistPhotoUrl?: string | null;
  ticketPriceMin?: string | null;
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeRecent(searches: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RECENT_KEY, JSON.stringify(searches));
}

function addToRecent(query: string, current: string[]): string[] {
  const filtered = current.filter((search) => search !== query);
  return [query, ...filtered].slice(0, MAX_RECENT);
}

function deriveArtistResults(rows: EventRow[]): ArtistResult[] {
  const map = new Map<string, ArtistResult>();
  for (const row of rows) {
    const existing = map.get(row.artist);
    if (!existing || row.date < existing.nextDate) {
      map.set(row.artist, {
        name: row.artist,
        nextDate: row.date,
        venueShort: row.venue.name,
        genres: row.genre ?? null,
        imageUrl: row.imageUrl ?? null,
        artistPhotoUrl: row.artistPhotoUrl ?? null,
        ticketPriceMin: row.ticketPriceMin ?? null,
      });
    }
  }
  return Array.from(map.values());
}

// Lower-case, accents folded away ("Théâtre" reads "theatre"), anything that is
// not a letter or digit a single space.
const foldName = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/**
 * Whether the query starts a venue's name, is the whole name, or reads on past
 * it ("bluebird", "red rocks", "bluebird theater tonight"). A word in the middle
 * of the name does not count. This is also what puts Venues ahead of Artists in
 * the results (`venueFirst`): the board's order is Artists, Venues, then Artist
 * pages, and only a query that names a venue from its start earns the swap.
 */
export function venueLeadsQuery(venueName: string, query: string): boolean {
  const name = foldName(venueName);
  const needle = foldName(query);
  if (name === '' || needle === '') return false;
  return name === needle || name.startsWith(needle) || needle.startsWith(name);
}

/**
 * Whether a venue's own name answers the query: it leads the query (above), or
 * the query is a run of words inside the name, the last by prefix ("rocks"
 * finds Red Rocks Amphitheatre; "black box" finds The Black Box). A venue is a
 * result for its name, not for hosting an event that matched.
 */
export function venueNameMatches(venueName: string, query: string): boolean {
  if (venueLeadsQuery(venueName, query)) return true;
  const name = foldName(venueName);
  const needle = foldName(query);
  if (name === '' || needle === '') return false;
  const nameWords = name.split(' ');
  const needleWords = needle.split(' ');
  return nameWords.some((_, start) =>
    needleWords.every((word, offset) => {
      const nameWord = nameWords[start + offset];
      if (nameWord === undefined) return false;
      return offset === needleWords.length - 1
        ? nameWord.startsWith(word)
        : nameWord === word;
    }),
  );
}

/**
 * The venues the query names. The rows are the events the query matched, so a
 * venue appears among them for any show on its calendar (an artist called "Red
 * Hot ..." at Globe Hall puts Globe Hall in the rows). Only the venues whose own
 * name matches are results; the artist rows carry the rest.
 */
export function deriveVenueResults(
  rows: EventRow[],
  query: string,
): VenueResult[] {
  const map = new Map<string, VenueResult>();
  for (const row of rows) {
    if (!venueNameMatches(row.venue.name, query)) continue;
    const existing = map.get(row.venue.id);
    if (existing) {
      existing.showCount += 1;
    } else {
      map.set(row.venue.id, {
        name: row.venue.name,
        slug: row.venue.slug,
        showCount: 1,
        matchingEventId: row.id,
      });
    }
  }
  return Array.from(map.values());
}

export function useSearch() {
  const router = useRouter();
  const getToken = useAuthToken();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularEvents, setPopularEvents] = useState<PopularEvent[]>([]);
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([]);
  // #1115 PR-G — artists with their own page. Distinct from `artistResults`,
  // which is derived from matching events and routes to a filtered browse.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const [artistPageResults, setArtistPageResults] = useState<
    ArtistSearchResult[]
  >([]);
  const [venueResults, setVenueResults] = useState<VenueResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setRecentSearches(readRecent());

    void (async () => {
      try {
        const token = await getTokenRef.current();
        fetch(`${API_URL}/v1/search/popular`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((body: { success: boolean; data: PopularEvent[] }) => {
            if (body.success) setPopularEvents(body.data);
          })
          .catch((err: unknown) => {
            console.error(err);
          });
      } catch (err) {
        console.error(err);
      }
    })();
    // Mount only. Listed on `getToken` this re-fetched the popular list every
    // time `useAuth()` handed back a new function, which it is free to do.
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setArtistResults([]);
      setArtistPageResults([]);
      setVenueResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      // Drop the previous query's answers before asking the new one. Each
      // result set is only reassigned on its own fetch succeeding, so a slow
      // or failed request would otherwise leave rows from the old query on
      // screen once isLoading flips false.
      setArtistResults([]);
      setArtistPageResults([]);
      setVenueResults([]);
      void (async () => {
        try {
          const token = await getTokenRef.current();
          fetch(
            `${API_URL}/v1/events?search=${encodeURIComponent(trimmed)}&limit=100`,
            {
              signal: controller.signal,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          )
            .then((res) => res.json())
            .then((body: { success: boolean; data: { data: EventRow[] } }) => {
              if (body.success) {
                setArtistResults(deriveArtistResults(body.data.data));
                setVenueResults(deriveVenueResults(body.data.data, trimmed));
              }
            })
            .catch((err: unknown) => {
              if (err instanceof DOMException && err.name === 'AbortError')
                return;
              console.error(err);
            })
            .finally(() => {
              if (!controller.signal.aborted) setIsLoading(false);
            });

          // #1115 PR-G — artist pages, fetched alongside (not chained after)
          // the event query. It is a garnish on a search whose primary answer
          // is shows, so it shares the abort signal but never gates isLoading:
          // a slow or failed artist lookup must not hold back the event rows.
          fetch(
            `${API_URL}/v1/search/artists?q=${encodeURIComponent(trimmed)}`,
            {
              signal: controller.signal,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          )
            .then((res) => res.json())
            .then((body: { success: boolean; data: ArtistSearchResult[] }) => {
              if (body.success) setArtistPageResults(body.data);
            })
            .catch((err: unknown) => {
              if (err instanceof DOMException && err.name === 'AbortError')
                return;
              console.error(err);
            });
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.error(err);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
    // `getToken` is read through the ref rather than listed here. `useAuth()`
    // makes no promise of returning the same function across renders, and an
    // unstable one makes this effect a function of the render rather than of
    // the query: it re-runs, aborts its own in-flight request and starts
    // another, which reads as a slow search rather than a bug.
  }, [query]);

  const clearQuery = useCallback(() => {
    setQuery('');
    setArtistResults([]);
    setArtistPageResults([]);
    setVenueResults([]);
  }, []);

  const navigateTo = useCallback(
    (
      type: 'artist' | 'artistPage' | 'venue',
      value: string | { slug: string; matchingEventId?: string },
    ) => {
      if (query.trim()) {
        const updated = addToRecent(query.trim(), recentSearches);
        setRecentSearches(updated);
        writeRecent(updated);
      }

      if (type === 'artist' && typeof value === 'string') {
        router.push(`/events?search=${encodeURIComponent(value)}`);
      } else if (type === 'artistPage' && typeof value === 'object') {
        // The artist's own page — not a filtered browse query.
        router.push(`/artists/${value.slug}`);
      } else if (type === 'venue' && typeof value === 'object') {
        const url = value.matchingEventId
          ? `/venues/${value.slug}?highlight=${value.matchingEventId}`
          : `/venues/${value.slug}`;
        router.push(url);
      }
    },
    [query, recentSearches, router],
  );

  // A recent search the reader dismissed with its × (B19). Typed text, so it
  // only ever lives in this browser's storage.
  const removeRecent = useCallback((recent: string) => {
    setRecentSearches((current) => {
      const updated = current.filter((search) => search !== recent);
      writeRecent(updated);
      return updated;
    });
  }, []);

  const venueFirst =
    venueResults.length > 0 &&
    venueResults.some((venue) => venueLeadsQuery(venue.name, query));

  return {
    query,
    setQuery,
    clearQuery,
    recentSearches,
    removeRecent,
    popularEvents,
    artistResults,
    artistPageResults,
    venueResults,
    venueFirst,
    isLoading,
    navigateTo,
  };
}
