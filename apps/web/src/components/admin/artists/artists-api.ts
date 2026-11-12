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

const isCandidateList = (value: unknown): value is ArtistCandidate[] =>
  Array.isArray(value) && value.every(isCandidate);

/**
 * One list row, checked on its own: a malformed row is dropped and a
 * malformed candidate snapshot is blanked, so one bad row never fails the
 * page.
 */
export const parseArtistRow = (value: unknown): AdminArtistRow | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isText(value['name']) ||
    !isTextOrNull(value['spotifyArtistId']) ||
    !isMatchStatus(value['matchStatus']) ||
    !isTextOrNull(value['photoUrl']) ||
    !isTextOrNull(value['autoMatchedAt']) ||
    !isCount(value['openReportCount']) ||
    !isCount(value['upcomingCount']) ||
    !isCount(value['watchingCount']) ||
    !isNextShow(value['nextShow'])
  ) {
    return null;
  }
  const candidates = value['candidates'];
  return {
    id: value['id'],
    name: value['name'],
    spotifyArtistId: value['spotifyArtistId'],
    matchStatus: value['matchStatus'],
    photoUrl: value['photoUrl'],
    autoMatchedAt: value['autoMatchedAt'],
    openReportCount: value['openReportCount'],
    upcomingCount: value['upcomingCount'],
    watchingCount: value['watchingCount'],
    nextShow: value['nextShow'],
    candidates: isCandidateList(candidates) ? candidates : null,
  };
};

/** Why a fan reported the match (the report form's four answers). */
export type ReportReason =
  'different_artist' | 'wrong_photo' | 'not_an_artist' | 'other';

const REPORT_REASONS: readonly string[] = [
  'different_artist',
  'wrong_photo',
  'not_an_artist',
  'other',
];

/** One open wrong-artist report: the evidence Looks right would dismiss. */
export interface ArtistReport {
  id: string;
  reason: ReportReason;
  note: string | null;
  suggestedSpotifyArtistId: string | null;
  createdAt: string;
}

const isReport = (value: unknown): value is ArtistReport =>
  isRecord(value) &&
  isText(value['id']) &&
  isText(value['reason']) &&
  REPORT_REASONS.includes(value['reason']) &&
  isTextOrNull(value['note']) &&
  isTextOrNull(value['suggestedSpotifyArtistId']) &&
  isText(value['createdAt']);

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
export class StaleRowError extends Error {
  constructor(
    /**
     * Which guard refused the write: the row's status moved off the one the
     * page loaded (`expectedStatus`), or the automatic pick moved
     * (`confirmAutoMatch`). Both reload; the reason is for the log.
     */
    readonly reason: 'status' | 'auto_match' | 'unknown',
  ) {
    super(`stale row (${reason})`);
  }
}

/** The PATCH route's two 409 messages (`artist-match-update.ts`). */
const STALE_REASONS: Record<string, StaleRowError['reason']> = {
  'The artist has changed since it was loaded': 'status',
  'The auto-match has changed since it was loaded': 'auto_match',
};

const staleReason = (body: unknown): StaleRowError['reason'] => {
  const error = isRecord(body) ? body['error'] : null;
  return (isText(error) ? STALE_REASONS[error] : undefined) ?? 'unknown';
};

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
  if (res.status === 409) {
    const conflict: unknown = await res.json().catch(() => null);
    throw new StaleRowError(staleReason(conflict));
  }
  const body: unknown = await res.json().catch((err: unknown) => {
    console.error('[admin artists] unreadable response', path, err);
    return null;
  });
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
  | { kind: 'not_an_artist' }
  /** Back to To check; the same write un-hides its page. */
  | { kind: 'its_an_artist' };

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
    case 'its_an_artist':
      return { spotifyArtistId: null, matchStatus: 'unmatched' };
  }
};

export const artistsApi = (getToken: GetToken) => ({
  list: async (params: {
    tab: ArtistTab;
    window?: ShowWindow;
    search: string;
    offset: number;
  }): Promise<{
    rows: AdminArtistRow[];
    total: number;
    /** How many rows the page returned, malformed ones included. */
    raw: number;
  }> => {
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
    if (!Array.isArray(data) || !isCount(total))
      throw new ShapeError('artists');
    const rows = data
      .map(parseArtistRow)
      .filter((row): row is AdminArtistRow => row !== null);
    if (rows.length < data.length) {
      console.error(
        '[admin artists] dropped malformed rows',
        data.length - rows.length,
      );
    }
    return { rows, total, raw: data.length };
  },
  /** The open reports on one artist, oldest first. */
  reports: async (id: string): Promise<ArtistReport[]> => {
    const body = await request(
      getToken,
      `${BASE}/${encodeURIComponent(id)}/reports`,
    );
    const data = body['data'];
    const reports = isRecord(data) ? data['reports'] : null;
    if (!Array.isArray(reports)) throw new ShapeError('reports');
    return reports.filter(isReport);
  },
  /** The match job's saved candidates (cache-first on the server). */
  candidates: async (id: string): Promise<ArtistCandidate[]> => {
    const body = await request(
      getToken,
      `${BASE}/${encodeURIComponent(id)}/candidates`,
    );
    const data = body['data'];
    if (!Array.isArray(data)) throw new ShapeError('candidates');
    return data.filter(isCandidate);
  },
  counts: async (): Promise<ArtistCounts> => {
    const body = await request(getToken, `${BASE}/counts?upcoming=false`);
    const data = body['data'];
    if (!isArtistCounts(data)) throw new ShapeError('counts');
    return data;
  },
  /**
   * `expectedStatus` is the status the row was loaded with (#266): the write
   * lands only if the row still has it, else the route answers 409 and the
   * page reloads rather than ruling on a row it never showed.
   */
  write: async (
    id: string,
    write: ArtistWrite,
    expectedStatus: MatchStatus,
  ): Promise<void> => {
    await request(getToken, `${BASE}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: { ...writeBody(write), expectedStatus },
    });
  },
});

export type ArtistsApi = ReturnType<typeof artistsApi>;
