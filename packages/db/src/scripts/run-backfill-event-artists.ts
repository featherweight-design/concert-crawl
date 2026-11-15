/**
 * CLI entry for the `event_artists` backfill (admin 4a-2). Fills the lineup
 * table for every stored event from its artist arrays, in batches of 500, each
 * batch its own transaction. Idempotent: re-running writes nothing new, so an
 * interrupted run is resumed by running it again.
 *
 * Dry run first, always. It reads everything and prints the counts it would
 * write, and writes nothing:
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:backfill-event-artists --dry-run
 *
 * Then the write:
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:backfill-event-artists
 *
 * Order: local, then staging, then prod. The prod host (`ep-raspy-hall`) is
 * refused unless `--allow-prod` is passed, and prod is run only with Hugh's OK.
 * Run it after `0115` is applied, and after the 4a-2 deploy so the crawl keeps
 * the rows current from then on.
 *
 * Undo: while the table is only a projection of the lineup arrays (the expand
 * phase), `TRUNCATE event_artists` is safe. Once a contract phase makes the
 * table the source of truth, it is not: check before truncating.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  backfillEventArtists,
  formatTotals,
} from './backfill-event-artists.js';

const PROD_HOST_MARKER = 'ep-raspy-hall';

export interface BackfillArgs {
  dryRun: boolean;
  allowProd: boolean;
}

export const parseArgs = (argv: readonly string[]): BackfillArgs => {
  // `--` is what `pnpm run <script> -- <args>` may pass through.
  const known = new Set(['--', '--dry-run', '--allow-prod']);
  const unknown = argv.filter((arg) => !known.has(arg));
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(' ')}`);
  }
  return {
    dryRun: argv.includes('--dry-run'),
    allowProd: argv.includes('--allow-prod'),
  };
};

/**
 * Refuses the prod database unless `--allow-prod` was passed, and refuses a
 * connection string it cannot read (an unreadable one could be prod). Pure.
 * Returns the host it checked, for the log line.
 */
export const assertHostAllowed = (
  connectionString: string,
  allowProd: boolean,
): string => {
  let host: string;
  try {
    host = new URL(connectionString).hostname;
  } catch {
    throw new Error('DATABASE_URL is not a readable URL; refusing to run');
  }
  if (host.includes(PROD_HOST_MARKER) && !allowProd) {
    throw new Error(
      `Refusing the prod database (${PROD_HOST_MARKER}) without --allow-prod. Prod runs only with Hugh's OK.`,
    );
  }
  return host;
};

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1];
  if (invoked === undefined) return false;
  return path.resolve(invoked) === fileURLToPath(import.meta.url);
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = process.env['DATABASE_URL'];
  if (connectionString === undefined || connectionString === '') {
    throw new Error('DATABASE_URL is not set');
  }
  // Checked before the client is imported: the guard runs first, and nothing
  // connects to a host it refuses.
  const host = assertHostAllowed(connectionString, args.allowProd);
  const { db } = await import('../client.js');

  console.warn(
    `[backfill-event-artists] host=${host} ${args.dryRun ? 'DRY RUN' : 'WRITE'}`,
  );
  const totals = await backfillEventArtists(db, {
    dryRun: args.dryRun,
    onBatch: (_batch, running) => {
      console.warn(
        `[backfill-event-artists] batch ${running.batches}: ${formatTotals(running, args.dryRun)}`,
      );
    },
  });
  console.warn(
    `[backfill-event-artists] done: ${formatTotals(totals, args.dryRun)}`,
  );
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[backfill-event-artists] failed', err);
      process.exit(1);
    });
}
