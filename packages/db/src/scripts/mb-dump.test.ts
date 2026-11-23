import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MbDumpShapeError,
  parseCopyLine,
  readMbArtists,
  toCopyLine,
  toPgTextArray,
  type MbArtistRow,
} from './mb-dump.js';

const RADIOHEAD = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
const THE_THE = 'f8c5a9b8-6f0a-4c8e-9a4e-2f1d6c3b9e10';
const NULL = '\\N';

/** An artist line: id, gid, name, sort_name, 6 date columns, type, area, gender, comment, then the rest. */
const artistLine = (
  id: number,
  gid: string,
  name: string,
  sortName: string,
  type: string,
  area: string,
  comment: string,
): string =>
  [
    id,
    gid,
    name,
    sortName,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    type,
    area,
    NULL,
    comment,
    '0',
    NULL,
    'f',
    NULL,
    NULL,
  ].join('\t');

const write = (dir: string, files: Record<string, string[]>) => {
  for (const [table, lines] of Object.entries(files)) {
    writeFileSync(
      path.join(dir, table),
      lines.map((line) => `${line}\n`).join(''),
    );
  }
};

const readAll = async (dir: string): Promise<MbArtistRow[]> => {
  const rows: MbArtistRow[] = [];
  for await (const row of readMbArtists(dir)) rows.push(row);
  return rows;
};

describe('parseCopyLine', () => {
  it('reads nulls and unescapes backslash sequences', () => {
    expect(parseCopyLine('1\t\\N\ta\\tb\\\\c\\nd')).toEqual([
      '1',
      null,
      'a\tb\\c\nd',
    ]);
  });
});

describe('toCopyLine', () => {
  it('round-trips through the COPY text format', () => {
    const row: MbArtistRow = {
      mbid: RADIOHEAD,
      name: 'Tab\there',
      sortName: null,
      aliases: ['Say "hi"', 'back\\slash', 'a,b'],
      type: 'Group',
      area: null,
      disambiguation: 'line\nbreak',
      spotifyId: null,
      wikidataId: 'Q44190',
    };
    const fields = parseCopyLine(toCopyLine(row).replace(/\n$/, ''));
    expect(fields).toEqual([
      RADIOHEAD,
      'Tab\there',
      null,
      toPgTextArray(row.aliases),
      'Group',
      null,
      'line\nbreak',
      null,
      'Q44190',
    ]);
  });

  it('quotes every array element', () => {
    expect(toPgTextArray([])).toBe('{}');
    expect(toPgTextArray(['NULL', 'a"b', 'c\\d'])).toBe(
      '{"NULL","a\\"b","c\\\\d"}',
    );
  });
});

describe('readMbArtists', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'mbdump-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const baseFiles = (): Record<string, string[]> => ({
    area: [
      '222\t489ce91b-6658-3307-9877-795b68554c98\tUnited Kingdom\t1\t0\t2013-05-27\tf\t\\N',
    ],
    artist_type: [
      '2\tGroup\t\\N\t2\t\\N\te431f5f6-b5d2-343d-8b36-72607fffb74b',
    ],
    url: [
      '10\t11111111-1111-1111-1111-111111111111\thttps://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb\t0\t\\N',
      '11\t22222222-2222-2222-2222-222222222222\thttps://www.wikidata.org/wiki/Q44190\t0\t\\N',
      '12\t33333333-3333-3333-3333-333333333333\thttps://open.spotify.com/artist/0000000000000000000000\t0\t\\N',
      '13\t44444444-4444-4444-4444-444444444444\thttps://www.radiohead.com/\t0\t\\N',
    ],
    // The later Spotify link (url 12) comes first in the file with a higher
    // relationship id, so the lowest id has to win on id, not file order.
    l_artist_url: [
      '102\t1\t1\t12\t0\t\\N\t0\t\\N\t\\N',
      '100\t1\t1\t10\t0\t\\N\t0\t\\N\t\\N',
      '101\t1\t1\t11\t0\t\\N\t0\t\\N\t\\N',
      '103\t1\t1\t13\t0\t\\N\t0\t\\N\t\\N',
    ],
    artist_alias: [
      '1\t1\tRadiohead\ten\t0\t\\N\t1\tRadiohead\t\\N',
      '2\t1\tOn a Friday\t\\N\t0\t\\N\t1\tOn a Friday\t\\N',
      '3\t1\tOn a Friday\t\\N\t0\t\\N\t1\tOn a Friday\t\\N',
      '4\t1\tレディオヘッド\tja\t0\t\\N\t1\tレディオヘッド\t\\N',
    ],
    artist: [
      artistLine(
        1,
        RADIOHEAD,
        'Radiohead',
        'Radiohead',
        '2',
        '222',
        'English rock band',
      ),
      artistLine(2, THE_THE, 'The The', 'The, The', NULL, NULL, ''),
    ],
  });

  it('builds rows from the six tables', async () => {
    write(dir, baseFiles());
    const rows = await readAll(dir);
    expect(rows).toEqual([
      {
        mbid: RADIOHEAD,
        name: 'Radiohead',
        sortName: 'Radiohead',
        // The alias equal to the name and the repeated alias are dropped.
        aliases: ['On a Friday', 'レディオヘッド'],
        type: 'Group',
        area: 'United Kingdom',
        disambiguation: 'English rock band',
        // The lowest relationship id wins over one earlier in the file.
        spotifyId: '4Z8W4fKeB5YxbusRsdQVPb',
        wikidataId: 'Q44190',
      },
      {
        mbid: THE_THE,
        name: 'The The',
        sortName: 'The, The',
        aliases: [],
        type: null,
        area: null,
        disambiguation: null,
        spotifyId: null,
        wikidataId: null,
      },
    ]);
  });

  it('counts what it yields', async () => {
    write(dir, baseFiles());
    const counts = {
      artists: 0,
      withAliases: 0,
      withSpotify: 0,
      withWikidata: 0,
    };
    for await (const _ of readMbArtists(dir, counts)) {
      // drain
    }
    expect(counts).toEqual({
      artists: 2,
      withAliases: 1,
      withSpotify: 1,
      withWikidata: 1,
    });
  });

  it('fails loudly when a column moves', async () => {
    const files = baseFiles();
    // gid and name swapped: the gid position no longer holds a uuid.
    files['artist'] = [
      artistLine(1, 'Radiohead', RADIOHEAD, 'Radiohead', NULL, NULL, ''),
    ];
    write(dir, files);
    await expect(readAll(dir)).rejects.toBeInstanceOf(MbDumpShapeError);
  });

  it('fails loudly on a short row', async () => {
    const files = baseFiles();
    files['artist'] = [`1\t${RADIOHEAD}\tRadiohead`];
    write(dir, files);
    await expect(readAll(dir)).rejects.toThrow(/expected at least 14 columns/);
  });

  it('fails loudly when the url table is not URLs', async () => {
    const files = baseFiles();
    // A good first row, then a shifted one: every row is checked, not line 1.
    files['url'] = [
      ...(files['url'] ?? []),
      '14\thttps://example.com/\t55555555-5555-5555-5555-555555555555\t0\t\\N',
    ];
    write(dir, files);
    await expect(readAll(dir)).rejects.toThrow(/column 3 is not a URL/);
  });
});
