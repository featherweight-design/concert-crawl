/**
 * CLI entry for the MBID backfill (`backfill-artist-mbids.ts`).
 *
 * Dry run by default: it decides every row, writes nothing and prints the
 * counts by bucket plus every name-bucket fill, so the name matches can be
 * read before an apply. `--apply` writes the same decisions.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:backfill-artist-mbids
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:backfill-artist-mbids --apply
 *
 * `--summary-file=<path>` also appends the report as Markdown (the workflow
 * passes `$GITHUB_STEP_SUMMARY`).
 *
 * It opens its own single connection with no statement timeout: the decision
 * folds every MusicBrainz name and alias (about 3.4M strings), which is one
 * long statement rather than many short ones.
 */

import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema/index.js';
import { isLocalConnectionString } from '../connection.js';
import {
  MBID_OUTCOMES,
  backfillArtistMbids,
  type BackfillArtistMbidsResult,
} from './backfill-artist-mbids.js';

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

/** Pipes and newlines would break the Markdown table a name sits in. */
const cell = (value: string | null): string =>
  (value ?? '').replace(/[|\r\n]+/g, ' ').trim() || '·';

export function formatReport(
  result: BackfillArtistMbidsResult,
  elapsedMs: number,
): string {
  const considered = MBID_OUTCOMES.reduce(
    (sum, outcome) => sum + result.outcomes[outcome],
    0,
  );
  const lines = [
    `## Artist MBID backfill (${result.dryRun ? 'dry run, nothing written' : 'applied'})`,
    '',
    '| Outcome | Rows |',
    '| --- | --- |',
    ...MBID_OUTCOMES.map(
      (outcome) => `| ${outcome} | ${result.outcomes[outcome]} |`,
    ),
    `| considered | ${considered} |`,
    `| written | ${result.updated} |`,
    '',
    `Decided in ${(elapsedMs / 1000).toFixed(1)} s.`,
    '',
    `### Name-bucket fills (${result.nameFills.length})`,
    '',
    '| Our artist | MusicBrainz act | Area | Disambiguation | MBID |',
    '| --- | --- | --- | --- | --- |',
    ...result.nameFills.map(
      (fill) =>
        `| ${cell(fill.name)} | ${cell(fill.mbName)} | ${cell(fill.area)} | ${cell(fill.disambiguation)} | ${fill.mbid} |`,
    ),
    '',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const dryRun = !process.argv.includes('--apply');

  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    ssl: isLocalConnectionString(connectionString) ? false : 'require',
    idle_timeout: 0,
    max_lifetime: null,
    onnotice: () => {},
  });

  try {
    await client`SET statement_timeout = 0`;
    const started = Date.now();
    const result = await backfillArtistMbids(drizzle(client, { schema }), {
      dryRun,
    });
    const report = formatReport(result, Date.now() - started);
    console.log(report);
    const summaryFile = argValue('summary-file');
    if (summaryFile) await appendFile(summaryFile, `${report}\n`);
  } finally {
    await client.end();
  }
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[mbid-backfill] failed', err);
      process.exit(1);
    });
}
