/**
 * CLI for the best-effort auto-match backlog pass. Dry run by default;
 * `--apply` writes; `--limit=N` caps the rows considered. Targets whatever
 * `DATABASE_URL` points at. Any production run needs Hugh's explicit OK.
 *
 *   pnpm --filter @concert-crawl/db db:auto-match-ambiguous [--apply] [--limit=N]
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../client.js';
import { autoMatchAmbiguousArtists } from './auto-match-ambiguous.js';

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1];
  if (invoked === undefined) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
};

function parseLimit(argv: string[]): number | undefined {
  const flag = argv.find((arg) => arg.startsWith('--limit='));
  if (flag === undefined) return undefined;
  const raw = flag.slice('--limit='.length);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(
      `[auto-match] --limit expects a positive integer, got "${raw}"`,
    );
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const result = await autoMatchAmbiguousArtists(db, {
    dryRun,
    limit: parseLimit(process.argv),
  });

  for (const pick of result.picks.slice(0, 25)) {
    console.log(
      `[auto-match]   ${pick.name} → ${pick.spotifyName} (spotify:${pick.spotifyArtistId})`,
    );
  }
  if (result.picks.length > 25) {
    console.log(`[auto-match]   …and ${result.picks.length - 25} more`);
  }
  for (const [reason, count] of Object.entries(result.declined)) {
    if (count > 0) console.log(`[auto-match]   declined ${reason}: ${count}`);
  }
  console.log(
    dryRun
      ? `[auto-match] DRY RUN — considered=${result.considered} would-pick=${result.picked}. Re-run with --apply.`
      : `[auto-match] considered=${result.considered} picked=${result.picked} updated=${result.updated}`,
  );
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[auto-match] failed', err);
      process.exit(1);
    });
}
