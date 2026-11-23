/**
 * Reads the MusicBrainz full export (`mbdump.tar.bz2`, extracted) into
 * `mb_artists` rows (artist search plan, PR 2:
 * docs/superpowers/plans/2026-11-22-artist-search-musicbrainz.md).
 *
 * Each table in the dump is one file named after the table, in Postgres COPY
 * text format: one row per line, tab-separated, `\N` for null, with
 * backslash escapes. There is no header, so columns are read by position from
 * MusicBrainz's `CreateTables.sql`. Every position this reader uses is checked
 * against the value's shape (a uuid, an integer id, a URL), so a schema change
 * that moves a column fails the load loudly instead of loading wrong data.
 *
 * Only CC0 core tables are read (plan decision 1): artist, artist_alias, area,
 * artist_type, url and l_artist_url. Tags, ratings and annotations are in the
 * separate derived dump, which the job never downloads.
 */

import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';

/** The six dump files the loader reads, relative to the extracted `mbdump/`. */
export const MB_DUMP_TABLES = [
  'artist',
  'artist_alias',
  'area',
  'artist_type',
  'url',
  'l_artist_url',
] as const;

export type MbDumpTable = (typeof MB_DUMP_TABLES)[number];

export type MbArtistRow = {
  mbid: string;
  name: string;
  sortName: string | null;
  aliases: string[];
  type: string | null;
  area: string | null;
  disambiguation: string | null;
  spotifyId: string | null;
  wikidataId: string | null;
};

export class MbDumpShapeError extends Error {
  constructor(table: MbDumpTable, lineNumber: number, detail: string) {
    super(`mbdump/${table} line ${lineNumber}: ${detail}`);
    this.name = 'MbDumpShapeError';
  }
}

const COPY_UNESCAPES: Record<string, string> = {
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  '\\': '\\',
};

/**
 * One COPY text field to its value. `\N` alone is null. Octal and hex escapes
 * are not decoded: MusicBrainz's dump writes UTF-8 directly and only escapes
 * backslash and the control characters above.
 */
const unescapeField = (raw: string): string | null => {
  if (raw === '\\N') return null;
  if (!raw.includes('\\')) return raw;
  return raw.replace(
    /\\(.)/g,
    (_, char: string) => COPY_UNESCAPES[char] ?? char,
  );
};

/** Splits one COPY text line into fields. A literal tab is always escaped. */
export const parseCopyLine = (line: string): (string | null)[] =>
  line.split('\t').map(unescapeField);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ID_PATTERN = /^[0-9]+$/;

const SPOTIFY_ARTIST_URL =
  /^https?:\/\/open\.spotify\.com\/artist\/([A-Za-z0-9]{22})(?:[/?#].*)?$/;
const WIKIDATA_URL = /^https?:\/\/www\.wikidata\.org\/wiki\/(Q[0-9]+)$/;

type Reader = {
  table: MbDumpTable;
  /** The highest column position this reader uses; shorter rows are a shape error. */
  minColumns: number;
};

async function* readTable(
  dumpDir: string,
  { table, minColumns }: Reader,
): AsyncGenerator<{ fields: (string | null)[]; lineNumber: number }> {
  const lines = createInterface({
    input: createReadStream(path.join(dumpDir, table), { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (line === '') continue;
    const fields = parseCopyLine(line);
    if (fields.length < minColumns) {
      throw new MbDumpShapeError(
        table,
        lineNumber,
        `expected at least ${minColumns} columns, found ${fields.length}`,
      );
    }
    yield { fields, lineNumber };
  }
}

const requireId = (
  table: MbDumpTable,
  lineNumber: number,
  column: string,
  value: string | null,
): number => {
  if (value === null || !ID_PATTERN.test(value)) {
    throw new MbDumpShapeError(
      table,
      lineNumber,
      `${column} is not an integer id`,
    );
  }
  return Number(value);
};

const optionalId = (
  table: MbDumpTable,
  lineNumber: number,
  column: string,
  value: string | null,
): number | null =>
  value === null ? null : requireId(table, lineNumber, column, value);

/** id to name, for the two small lookup tables (area, artist_type). */
async function readNames(
  dumpDir: string,
  table: 'area' | 'artist_type',
): Promise<Map<number, string>> {
  // area: id, gid, name, ... · artist_type: id, name, parent, ...
  const nameColumn = table === 'area' ? 2 : 1;
  const names = new Map<number, string>();
  for await (const { fields, lineNumber } of readTable(dumpDir, {
    table,
    minColumns: nameColumn + 1,
  })) {
    const id = requireId(table, lineNumber, 'id', fields[0] ?? null);
    const name = fields[nameColumn];
    if (name) names.set(id, name);
  }
  return names;
}

/**
 * url id to the Spotify artist id or Wikidata item it points at. Every other
 * URL in the table (most of it) is skipped without being held in memory.
 */
async function readLinkedUrls(dumpDir: string): Promise<{
  spotify: Map<number, string>;
  wikidata: Map<number, string>;
}> {
  const spotify = new Map<number, string>();
  const wikidata = new Map<number, string>();
  // url: id, gid, url, edits_pending, last_updated
  for await (const { fields, lineNumber } of readTable(dumpDir, {
    table: 'url',
    minColumns: 3,
  })) {
    const url = fields[2] ?? '';
    if (lineNumber === 1 && !/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      throw new MbDumpShapeError('url', lineNumber, 'column 3 is not a URL');
    }
    const spotifyMatch = SPOTIFY_ARTIST_URL.exec(url);
    const wikidataMatch = spotifyMatch ? null : WIKIDATA_URL.exec(url);
    if (!spotifyMatch && !wikidataMatch) continue;
    const id = requireId('url', lineNumber, 'id', fields[0] ?? null);
    if (spotifyMatch?.[1]) spotify.set(id, spotifyMatch[1]);
    if (wikidataMatch?.[1]) wikidata.set(id, wikidataMatch[1]);
  }
  return { spotify, wikidata };
}

/**
 * artist id to its Spotify id and Wikidata item, through l_artist_url. When an
 * artist links more than one of a kind, the lowest relationship id (the
 * oldest, and the first in the file) wins, so a reload picks the same one.
 */
async function readArtistUrls(
  dumpDir: string,
  urls: { spotify: Map<number, string>; wikidata: Map<number, string> },
): Promise<{ spotify: Map<number, string>; wikidata: Map<number, string> }> {
  const spotify = new Map<number, string>();
  const wikidata = new Map<number, string>();
  // l_artist_url: id, link, entity0 (artist), entity1 (url), ...
  for await (const { fields, lineNumber } of readTable(dumpDir, {
    table: 'l_artist_url',
    minColumns: 4,
  })) {
    const artistId = requireId(
      'l_artist_url',
      lineNumber,
      'entity0',
      fields[2] ?? null,
    );
    const urlId = requireId(
      'l_artist_url',
      lineNumber,
      'entity1',
      fields[3] ?? null,
    );
    const spotifyId = urls.spotify.get(urlId);
    if (spotifyId && !spotify.has(artistId)) spotify.set(artistId, spotifyId);
    const wikidataId = urls.wikidata.get(urlId);
    if (wikidataId && !wikidata.has(artistId))
      wikidata.set(artistId, wikidataId);
  }
  return { spotify, wikidata };
}

/** artist id to its alias names, in file order, exact duplicates removed. */
async function readAliases(dumpDir: string): Promise<Map<number, string[]>> {
  const aliases = new Map<number, string[]>();
  // artist_alias: id, artist, name, locale, ...
  for await (const { fields, lineNumber } of readTable(dumpDir, {
    table: 'artist_alias',
    minColumns: 3,
  })) {
    const artistId = requireId(
      'artist_alias',
      lineNumber,
      'artist',
      fields[1] ?? null,
    );
    const name = fields[2];
    if (!name) continue;
    const list = aliases.get(artistId);
    if (!list) aliases.set(artistId, [name]);
    else if (!list.includes(name)) list.push(name);
  }
  return aliases;
}

export type MbDumpCounts = {
  artists: number;
  withAliases: number;
  withSpotify: number;
  withWikidata: number;
};

/**
 * Streams `mb_artists` rows from an extracted dump directory. The lookup
 * tables are read into memory first (areas, types, the Spotify and Wikidata
 * URLs and their artist links, aliases); the artist table itself is streamed,
 * one row out per line in. `counts` fills in as rows are yielded.
 */
export async function* readMbArtists(
  dumpDir: string,
  counts: MbDumpCounts = {
    artists: 0,
    withAliases: 0,
    withSpotify: 0,
    withWikidata: 0,
  },
): AsyncGenerator<MbArtistRow> {
  const areas = await readNames(dumpDir, 'area');
  const types = await readNames(dumpDir, 'artist_type');
  const artistUrls = await readArtistUrls(
    dumpDir,
    await readLinkedUrls(dumpDir),
  );
  const aliases = await readAliases(dumpDir);

  // artist: id, gid, name, sort_name, begin_date_year, begin_date_month,
  // begin_date_day, end_date_year, end_date_month, end_date_day, type, area,
  // gender, comment, ...
  for await (const { fields, lineNumber } of readTable(dumpDir, {
    table: 'artist',
    minColumns: 14,
  })) {
    const id = requireId('artist', lineNumber, 'id', fields[0] ?? null);
    const mbid = fields[1] ?? '';
    if (!UUID_PATTERN.test(mbid)) {
      throw new MbDumpShapeError('artist', lineNumber, 'gid is not a uuid');
    }
    const name = fields[2];
    if (!name) {
      throw new MbDumpShapeError('artist', lineNumber, 'name is empty');
    }
    const typeId = optionalId('artist', lineNumber, 'type', fields[10] ?? null);
    const areaId = optionalId('artist', lineNumber, 'area', fields[11] ?? null);
    const comment = fields[13];

    const artistAliases = (aliases.get(id) ?? []).filter(
      (alias) => alias !== name,
    );
    const spotifyId = artistUrls.spotify.get(id) ?? null;
    const wikidataId = artistUrls.wikidata.get(id) ?? null;

    counts.artists += 1;
    if (artistAliases.length > 0) counts.withAliases += 1;
    if (spotifyId) counts.withSpotify += 1;
    if (wikidataId) counts.withWikidata += 1;

    yield {
      mbid,
      name,
      sortName: fields[3] || null,
      aliases: artistAliases,
      type: typeId === null ? null : (types.get(typeId) ?? null),
      area: areaId === null ? null : (areas.get(areaId) ?? null),
      disambiguation: comment || null,
      spotifyId,
      wikidataId,
    };
  }
}

const escapeCopyField = (value: string): string =>
  value.replace(/[\\\t\n\r]/g, (char) =>
    char === '\\'
      ? '\\\\'
      : char === '\t'
        ? '\\t'
        : char === '\n'
          ? '\\n'
          : '\\r',
  );

/** A text[] literal: every element double-quoted, `"` and `\` backslashed. */
export const toPgTextArray = (values: string[]): string =>
  `{${values.map((value) => `"${value.replace(/["\\]/g, '\\$&')}"`).join(',')}}`;

/**
 * The COPY text line for one row, in `MB_ARTIST_COPY_COLUMNS` order.
 * `refreshed_at` is left to its column default.
 */
export const toCopyLine = (row: MbArtistRow): string =>
  [
    row.mbid,
    row.name,
    row.sortName,
    toPgTextArray(row.aliases),
    row.type,
    row.area,
    row.disambiguation,
    row.spotifyId,
    row.wikidataId,
  ]
    .map((value) => (value === null ? '\\N' : escapeCopyField(value)))
    .join('\t') + '\n';

export const MB_ARTIST_COPY_COLUMNS = [
  'mbid',
  'name',
  'sort_name',
  'aliases',
  'type',
  'area',
  'disambiguation',
  'spotify_id',
  'wikidata_id',
] as const;
