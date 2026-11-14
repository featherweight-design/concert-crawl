import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  StaleRowError,
  artistsApi,
  parseArtistRow,
  staleReason,
  type ArtistWrite,
} from './artists-api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

let answer: Response;

beforeEach(() => {
  answer = json(200, { success: true, data: {} });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => answer),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const api = artistsApi(async () => 'token');

const sentBody = (): unknown =>
  JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));

describe('artistsApi.write', () => {
  it.each<
    [string, ArtistWrite, 'matched' | 'ambiguous' | 'not_an_artist', unknown]
  >([
    [
      'Use selected',
      { kind: 'use', spotifyArtistId: 'sp2', photoUrl: 'https://img/sp2' },
      'ambiguous',
      {
        spotifyArtistId: 'sp2',
        photoUrl: 'https://img/sp2',
        expectedStatus: 'ambiguous',
      },
    ],
    [
      'Looks right on a reported row (keep)',
      { kind: 'keep', spotifyArtistId: 'sp1' },
      'matched',
      { spotifyArtistId: 'sp1', expectedStatus: 'matched' },
    ],
    [
      'Looks right on a Check row (confirm)',
      { kind: 'confirm', spotifyArtistId: 'sp1' },
      'matched',
      {
        spotifyArtistId: 'sp1',
        confirmAutoMatch: true,
        expectedStatus: 'matched',
      },
    ],
    [
      'Not an artist',
      { kind: 'not_an_artist' },
      'ambiguous',
      {
        spotifyArtistId: null,
        matchStatus: 'not_an_artist',
        expectedStatus: 'ambiguous',
      },
    ],
    [
      'It’s an artist',
      { kind: 'its_an_artist' },
      'not_an_artist',
      {
        spotifyArtistId: null,
        matchStatus: 'unmatched',
        expectedStatus: 'not_an_artist',
      },
    ],
  ])(
    '%s sends the loaded status as expectedStatus',
    async (_name, write, status, body) => {
      await api.write('a1', write, status);
      expect(sentBody()).toEqual(body);
    },
  );

  it.each<[string, unknown, StaleRowError['reason']]>([
    [
      'the status guard',
      { error: 'The artist has changed since it was loaded' },
      'status',
    ],
    [
      'the auto-match guard',
      { error: 'The auto-match has changed since it was loaded' },
      'auto_match',
    ],
    ['an unknown message', { error: 'Something else' }, 'unknown'],
    ['no message', null, 'unknown'],
  ])(
    'throws a stale-row error naming %s on a 409',
    async (_name, body, reason) => {
      answer = json(409, { success: false, ...(body ?? {}) });
      const error = await api
        .write('a1', { kind: 'not_an_artist' }, 'ambiguous')
        .catch((err: unknown) => err);
      expect(error).toBeInstanceOf(StaleRowError);
      expect(error).toMatchObject({ reason });
    },
  );

  it('reads a 409 whose body is not JSON as unknown', async () => {
    answer = new Response('not json', { status: 409 });
    const error = await api
      .write('a1', { kind: 'not_an_artist' }, 'ambiguous')
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(StaleRowError);
    expect(error).toMatchObject({ reason: 'unknown' });
  });
});

describe('staleReason', () => {
  it('never reads an inherited property as a reason', () => {
    expect(staleReason({ error: 'toString' })).toBe('unknown');
    expect(staleReason({ error: 'constructor' })).toBe('unknown');
    expect(staleReason({ error: '__proto__' })).toBe('unknown');
  });
});

describe('ADMIN_COPY.artists.matchedMeta', () => {
  it.each([
    [0, '2 upcoming · 0 followers'],
    [1, '2 upcoming · 1 follower'],
    [2, '2 upcoming · 2 followers'],
  ])('says %i followers as artists are counted', (count, text) => {
    expect(ADMIN_COPY.artists.matchedMeta(2, count)).toBe(text);
  });
});

describe('parseArtistRow', () => {
  const wire = (
    over: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 'a1',
    name: 'Cashmere',
    spotifyArtistId: 'sp1',
    matchStatus: 'matched',
    photoUrl: null,
    autoMatchedAt: null,
    openReportCount: 2,
    wrongPhotoReportCount: 1,
    upcomingCount: 1,
    watchingCount: 0,
    nextShow: null,
    candidates: null,
    ...over,
  });

  it('carries the wrong-photo count', () => {
    expect(parseArtistRow(wire())?.wrongPhotoReportCount).toBe(1);
  });

  it('keeps a wrong-photo count of 0 as 0', () => {
    expect(
      parseArtistRow(wire({ wrongPhotoReportCount: 0 }))?.wrongPhotoReportCount,
    ).toBe(0);
  });

  it.each([
    ['negative', -1],
    ['fractional', 1.5],
    ['a string', '1'],
    ['null', null],
  ])('drops a row whose wrong-photo count is %s', (_label, count) => {
    expect(parseArtistRow(wire({ wrongPhotoReportCount: count }))).toBeNull();
  });

  it('reads a missing wrong-photo count as null, unknown (web may deploy before the API)', () => {
    const older = Object.fromEntries(
      Object.entries(wire({})).filter(
        ([key]) => key !== 'wrongPhotoReportCount',
      ),
    );
    const row = parseArtistRow(older);
    expect(row).not.toBeNull();
    expect(row?.wrongPhotoReportCount).toBeNull();
  });
});
