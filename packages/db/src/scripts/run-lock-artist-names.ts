/**
 * CLI entry for locking hand-set artist names.
 *
 * Dry run by default: it prints the rows the slugs name and the name each one
 * would keep, so a wrong slug is caught before anything is written.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:lock-artist-names <slug>...
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:lock-artist-names <slug>... --apply
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../client.js';
import { lockArtistNames } from './lock-artist-names.js';

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1];
  if (invoked === undefined) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
};

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const slugs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (slugs.length === 0) {
    throw new Error('Pass at least one artist slug.');
  }

  const result = await lockArtistNames(db, { slugs, dryRun });

  for (const row of result.found) {
    console.log(
      `[lock-artist-names]   ${row.slug}: "${row.name}"${row.alreadyLocked ? ' (already locked)' : ''}`,
    );
  }
  for (const slug of result.missing) {
    console.log(`[lock-artist-names]   ${slug}: no such artist`);
  }

  console.log(
    dryRun
      ? `[lock-artist-names] DRY RUN — ${result.found.filter((row) => !row.alreadyLocked).length} rows would be locked. Re-run with --apply.`
      : `[lock-artist-names] locked=${result.locked}`,
  );
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[lock-artist-names] failed', err);
      process.exit(1);
    });
}
