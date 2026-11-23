/**
 * CLI entry for the weekly MusicBrainz artist load
 * (.github/workflows/mb-artists-refresh.yml).
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:load-mb-artists \
 *     --dump-dir=<extracted mbdump/> [--summary-file=<path>] [--dump-label=<text>]
 *
 * It opens its own single connection rather than the shared pool: the COPY and
 * the index builds hold one socket for many minutes, and the pool retires a
 * socket after four (see `connection.ts`).
 *
 * The summary (row counts, timings, table and index size) is printed, and
 * appended as Markdown to `--summary-file` when given, which the workflow
 * points at the job summary.
 */

import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { isLocalConnectionString } from '../connection.js';
import { readMbArtists, type MbDumpCounts } from './mb-dump.js';
import { loadMbArtists, measureMbArtists } from './load-mb-artists.js';

/** A whole dump holds about 2.6M artists (2026-11); a load far under it is truncated. */
const MIN_ROWS = 1_000_000;
const MIN_SHARE_OF_CURRENT = 0.9;

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1];
  if (invoked === undefined) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
};

const argValue = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
};

const megabytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;

async function main(): Promise<void> {
  const dumpDir = argValue('dump-dir');
  if (!dumpDir)
    throw new Error('--dump-dir=<extracted mbdump directory> is required');
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const sql = postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: isLocalConnectionString(connectionString) ? false : 'require',
    idle_timeout: 0,
    max_lifetime: null,
    onnotice: () => {},
  });

  // The COPY and the GIN builds run for minutes: no statement timeout from
  // the role's defaults, and room for the index builds to sort in memory.
  await sql`SET statement_timeout = 0`;
  await sql`SET maintenance_work_mem = '256MB'`;

  const started = Date.now();
  const counts: MbDumpCounts = {
    artists: 0,
    withAliases: 0,
    withSpotify: 0,
    withWikidata: 0,
  };
  try {
    const result = await loadMbArtists(sql, readMbArtists(dumpDir, counts), {
      minRows: MIN_ROWS,
      minShareOfCurrent: MIN_SHARE_OF_CURRENT,
    });
    const size = await measureMbArtists(sql);
    const totalMs = Date.now() - started;

    const lines = [
      '## MusicBrainz artist load',
      '',
      ...(argValue('dump-label')
        ? [`Dump: ${argValue('dump-label')}`, '']
        : []),
      '| Measure | Value |',
      '| --- | --- |',
      `| Rows serving before | ${result.previousRows} |`,
      `| Rows loaded | ${result.loadedRows} |`,
      `| With aliases | ${counts.withAliases} |`,
      `| With a Spotify id | ${counts.withSpotify} |`,
      `| With a Wikidata id | ${counts.withWikidata} |`,
      `| Read and COPY | ${seconds(result.copyMs)} |`,
      `| Key and index build | ${seconds(result.indexMs)} |`,
      `| Swap | ${seconds(result.swapMs)} |`,
      `| Total | ${seconds(totalMs)} |`,
      `| Table size | ${megabytes(size.tableBytes)} |`,
      `| Index size | ${megabytes(size.indexBytes)} |`,
      `| Total size | ${megabytes(size.totalBytes)} |`,
      '',
    ];
    console.log(lines.join('\n'));
    const summaryFile = argValue('summary-file');
    if (summaryFile) await appendFile(summaryFile, `${lines.join('\n')}\n`);
  } finally {
    await sql.end();
  }
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[load-mb-artists] failed', err);
      process.exit(1);
    });
}
