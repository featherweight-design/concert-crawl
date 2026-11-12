/**
 * The Artists admin's calls (redesign 4c), from the browser with the Clerk
 * token. Every payload is checked with a type guard before it's used (the web
 * app carries no Zod), so a shape drift fails into Couldn't load rather than
 * drawing bad rows.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BASE = '/v1/admin/artists';

export type MatchStatus =
  'unmatched' | 'matched' | 'ambiguous' | 'no_match' | 'not_an_artist';

export type ArtistTab = 'to_check' | 'matched' | 'not_an_artist';

/** To check's show-date chips: next 60 days, after that, or no show. */
export type ShowWindow = 'soon' | 'later' | 'none';

/** One Spotify artist the match job saw for the row. */
export interface ArtistCandidate {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[] | null;
}

export interface AdminArtistRow {
  id: string;
  name: string;
  spotifyArtistId: string | null;
  matchStatus: MatchStatus;
  photoUrl: string | null;
  autoMatchedAt: string | null;
  openReportCount: number;
  upcomingCount: number;
  watchingCount: number;
  nextShow: { date: string; venueName: string | null } | null;
  /** To check only; the API sends null on the other tabs and on a search. */
  candidates: ArtistCandidate[] | null;
}

export interface ArtistCounts {
  to_check: number;
  to_check_soon: number;
  to_check_later: number;
  to_check_none: number;
  matched: number;
  not_an_artist: number;
}

const MATCH_STATUSES: readonly string[] = [
  'unmatched',
  'matched',
  'ambiguous',
  'no_match',
  'not_an_artist',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNull = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isMatchStatus = (value: unknown): value is MatchStatus =>
  isText(value) && MATCH_STATUSES.includes(value);

const isCandidate = (value: unknown): value is ArtistCandidate =>
  isRecord(value) &&
  isText(value['id']) &&
  isText(value['name']) &&
  isTextOrNull(value['imageUrl']) &&
  (value['genres'] === null ||
    (Array.isArray(value['genres']) && value['genres'].every(isText)));

const isNextShow = (value: unknown): value is AdminArtistRow['nextShow'] =>
  value === null ||
  (isRecord(value) &&
    isText(value['date']) &&
    isTextOrNull(value['venueName']));

export const isAdminArtistRow = (value: unknown): value is AdminArtistRow =>
  isRecord(value) &&
  isText(value['id']) &&
  isText(value['name']) &&
  isTextOrNull(value['spotifyArtistId']) &&
  isMatchStatus(value['matchStatus']) &&
  isTextOrNull(value['photoUrl']) &&
  isTextOrNull(value['autoMatchedAt']) &&
  isCount(value['openReportCount']) &&
  isCount(value['upcomingCount']) &&
  isCount(value['watchingCount']) &&
  isNextShow(value['nextShow']) &&
  (value['candidates'] === null ||
    (Array.isArray(value['candidates']) &&
      value['candidates'].every(isCandidate)));

const COUNT_KEYS: ReadonlyArray<keyof ArtistCounts> = [
  'to_check',
  'to_check_soon',
  'to_check_later',
  'to_check_none',
  'matched',
  'not_an_artist',
];

const isArtistCounts = (value: unknown): value is ArtistCounts =>
  isRecord(value) && COUNT_KEYS.every((key) => isCount(value[key]));

/** A payload that isn't the route's documented shape. Never shown as text. */
class ShapeError extends Error {}

/** The row changed under the page (a 409): reload, don't retry. */
export class StaleRowError extends Error {}

export type GetToken = () => Promise<string | null>;

const request = async (
  getToken: GetToken,
  path: string,
  init?: { method: 'PATCH'; body: unknown },
): Promise<Record<string, unknown>> => {
  const token = await getToken();
  if (!token) throw new ShapeError('no token');
  const auth = { Authorization: `Bearer ${token}` };
  const res = await fetch(
    `${API_BASE}${path}`,
    init
      ? {
          method: init.method,
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify(init.body),
        }
      : { headers: auth },
  );
  if (res.status === 409) throw new StaleRowError();
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(body) || body['success'] !== true) {
    throw new ShapeError(`status ${res.status}`);
  }
  return body;
};

export const PAGE_SIZE = 100;

/** The PATCH bodies the To check row sends (see the route's comments). */
export type ArtistWrite =
  /** Use a candidate; its photo saves a match-job cycle. */
  | { kind: 'use'; spotifyArtistId: string; photoUrl: string | null }
  /** Keep the automatic pick, if the server still holds it. */
  | { kind: 'confirm'; spotifyArtistId: string }
  /** Re-save the current match: closes its reports as dismissed. */
  | { kind: 'keep'; spotifyArtistId: string }
  | { kind: 'not_an_artist' };

const writeBody = (write: ArtistWrite) => {
  switch (write.kind) {
    case 'use':
      return {
        spotifyArtistId: write.spotifyArtistId,
        photoUrl: write.photoUrl,
      };
    case 'confirm':
      return { spotifyArtistId: write.spotifyArtistId, confirmAutoMatch: true };
    case 'keep':
      return { spotifyArtistId: write.spotifyArtistId };
    case 'not_an_artist':
      return { spotifyArtistId: null, matchStatus: 'not_an_artist' };
  }
};

export const artistsApi = (getToken: GetToken) => ({
  list: async (params: {
    tab: ArtistTab;
    window?: ShowWindow;
    search: string;
    offset: number;
  }): Promise<{ rows: AdminArtistRow[]; total: number }> => {
    const query = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(params.offset),
      // Past-only artists count too: "No show" lists nothing otherwise, and
      // the tab counts read the same way.
      upcoming: 'false',
      // The server ignores status and window on a search.
      ...(params.search === ''
        ? {
            status: params.tab,
            ...(params.window ? { window: params.window } : {}),
          }
        : { search: params.search }),
    });
    const body = await request(getToken, `${BASE}?${query.toString()}`);
    const data = body['data'];
    const total = body['total'];
    if (
      !Array.isArray(data) ||
      !data.every(isAdminArtistRow) ||
      !isCount(total)
    )
      throw new ShapeError('artists');
    return { rows: data, total };
  },
  counts: async (): Promise<ArtistCounts> => {
    const body = await request(getToken, `${BASE}/counts?upcoming=false`);
    const data = body['data'];
    if (!isArtistCounts(data)) throw new ShapeError('counts');
    return data;
  },
  write: async (id: string, write: ArtistWrite): Promise<void> => {
    await request(getToken, `${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: writeBody(write),
    });
  },
});

export type ArtistsApi = ReturnType<typeof artistsApi>;
