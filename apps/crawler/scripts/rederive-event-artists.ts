import {
  adjudicateEventWithUsage,
  calculateCost,
  rederiveEventArtists,
} from '@concert-crawl/crawler-core';

// One-off runner for the event artist re-derivation pass. Dry by default —
// `--apply` is the only thing that writes. `--limit=N` caps the scan, which is
// how the first prod run is kept to a sample before committing the whole table
// to a Haiku bill.
//
// Lives in apps/crawler (not packages/db) because the ladder and the
// adjudicator are both in @concert-crawl/crawler-core, which already depends on
// @concert-crawl/db — putting the script in db would create a circular
// workspace dependency. Same reason backfill-ticket-links.ts sits here.

/**
 * `Number` rather than `Number.parseInt`, matching
 * `packages/db/src/scripts/run-musicbrainz-disambiguate.ts`: parseInt reads
 * `10abc` as 10 and `1.5` as 1, so a typo would quietly run a different pass
 * than the one asked for. Malformed input fails instead.
 */
const parseLimit = (): number | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--limit='));
  if (flag === undefined) return undefined;
  const raw = flag.slice('--limit='.length);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--limit expects a positive integer, got "${raw}"`);
  }
  return value;
};

// `--max-cost-usd=N` ends the pass once the Haiku calls it made cost N or
// more (checked before each row, so it can overshoot by one call), and the
// cumulative cost is logged as it grows. `--only-flattened` reads only rows
// whose artist joins names with " & " or " + ", the rows the flattened-billing
// rule can change, so every row read is a row that can cost a call.
const parseMaxCost = (): number | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--max-cost-usd='));
  if (flag === undefined) return undefined;
  const raw = flag.slice('--max-cost-usd='.length);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--max-cost-usd expects a positive number, got "${raw}"`);
  }
  return value;
};

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const limit = parseLimit();
  const maxCostUsd = parseMaxCost();
  const onlyFlattenedBillings = process.argv.includes('--only-flattened');
  let spentUsd = 0;
  let calls = 0;

  console.warn(
    `[rederive-event-artists] starting — ${dryRun ? 'DRY RUN' : 'APPLY'}${
      limit === undefined ? '' : ` limit=${limit}`
    }${maxCostUsd === undefined ? '' : ` max-cost-usd=${maxCostUsd}`}${
      onlyFlattenedBillings ? ' only-flattened' : ''
    }`,
  );

  const result = await rederiveEventArtists({
    dryRun,
    adjudicate: async (input) => {
      const { verdict, usage } = await adjudicateEventWithUsage(input);
      spentUsd += calculateCost(usage);
      calls += 1;
      if (calls % 25 === 0) {
        console.warn(
          `[rederive-event-artists] ${calls} calls, $${spentUsd.toFixed(4)} spent`,
        );
      }
      return verdict;
    },
    limit,
    onlyFlattenedBillings,
    shouldStop: () => maxCostUsd !== undefined && spentUsd >= maxCostUsd,
    sampleSize: 1000,
  });
  if (result.stopped) {
    console.warn(
      `[rederive-event-artists] COST CAP HIT at $${spentUsd.toFixed(4)}: the pass stopped early and the remaining rows were not read.`,
    );
  }
  console.warn(
    `[rederive-event-artists] haiku calls=${calls} cost=$${spentUsd.toFixed(4)}`,
  );

  for (const change of result.sample) {
    console.warn(
      `  [${change.strategy}]${change.hides ? ' HIDE' : ''} ${change.title} → ` +
        `headliners=[${change.headliners.join(', ')}] ` +
        `supporting=[${change.supportingArtists.join(', ')}]`,
    );
  }

  console.warn(
    `[rederive-event-artists] done — scanned=${result.scanned} ` +
      `derived=${result.derived} ${dryRun ? 'would-update' : 'updated'}=${result.updated} ` +
      `hidden=${result.hidden}`,
  );
  console.warn(
    `[rederive-event-artists] strategies — ` +
      Object.entries(result.strategies)
        .map(([name, count]) => `${name}=${count}`)
        .join(' '),
  );
  if (dryRun) {
    console.warn(
      '[rederive-event-artists] dry run — nothing written. Re-run with --apply.',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[rederive-event-artists] failed:', err);
    process.exit(1);
  });
