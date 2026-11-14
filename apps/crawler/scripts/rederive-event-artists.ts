import { appendFileSync } from 'node:fs';
import {
  createAdjudicationCost,
  makeJoinedEvidence,
  makeMusicBrainzLookup,
  rederiveEventArtists,
} from '@concert-crawl/crawler-core';

// One-off runner for the event artist re-derivation pass. Dry by default —
// `--apply` is the only thing that writes events and artists. Every pass, dry
// or not, writes one 'artist-adjudication' cost_tracking row: the Haiku calls
// were billed either way, and the monthly LLM budget must see them. `--limit=N` caps the scan, which is
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
// The spend ceiling is built in: with no flag the pass stops at $6, and a flag
// can only lower it. A run that could spend more than $6 cannot be asked for.
// It is checked before each row, so a pass can end at most one adjudication
// (a fraction of a cent) over it.
const HARD_MAX_COST_USD = 6;

const parseMaxCost = (): number => {
  const flag = process.argv.find((arg) => arg.startsWith('--max-cost-usd='));
  if (flag === undefined) return HARD_MAX_COST_USD;
  const raw = flag.slice('--max-cost-usd='.length);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--max-cost-usd expects a positive number, got "${raw}"`);
  }
  if (value > HARD_MAX_COST_USD) {
    throw new Error(
      `--max-cost-usd cannot exceed the built-in $${HARD_MAX_COST_USD} cap, got ${value}`,
    );
  }
  return value;
};

// `--summary-file=PATH` writes the whole change list as a Markdown table: in a
// workflow, GITHUB_STEP_SUMMARY, so the run page shows every row the pass would
// touch (or did) before anyone decides to apply.
const parseSummaryFile = (): string | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--summary-file='));
  return flag === undefined ? undefined : flag.slice('--summary-file='.length);
};

// A step summary over 1 MiB fails the step; a row is a few hundred bytes.
const SUMMARY_MAX_ROWS = 1500;
// The not-written table shares the 1 MiB step summary with the change list and
// the unresolved names, so it is capped lower; the log carries the first rows.
const NOT_WRITTEN_MAX_ROWS = 600;
const NOT_WRITTEN_LOG_ROWS = 400;

const cell = (text: string): string => text.replace(/\|/g, '\\|');
const names = (list: readonly string[]): string =>
  list.length === 0 ? '(none)' : list.join(', ');

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const limit = parseLimit();
  const maxCostUsd = parseMaxCost();
  const summaryFile = parseSummaryFile();
  const onlyFlattenedBillings = process.argv.includes('--only-flattened');
  // Off unless asked: a repair pass fixes bills and never hides a show on a
  // model's "not a concert" (it varied run to run and hid real concerts).
  const hideNonConcerts = process.argv.includes('--hide-non-concerts');

  console.warn(
    `[rederive-event-artists] starting — ${dryRun ? 'DRY RUN' : 'APPLY'}${
      limit === undefined ? '' : ` limit=${limit}`
    } max-cost-usd=${maxCostUsd}${
      onlyFlattenedBillings ? ' only-flattened' : ''
    }`,
  );

  // One tracker is the pass's spend: the cost cap and the printout read it,
  // and it writes one 'artist-adjudication' row for the whole pass (a dry run
  // spends too), so the monthly LLM budget sees it.
  const adjudicationCost = createAdjudicationCost();
  const musicBrainz = makeMusicBrainzLookup();
  const result = await rederiveEventArtists({
    dryRun,
    adjudicate: async (input) => {
      const verdict = await adjudicationCost.adjudicate(input);
      if (adjudicationCost.calls % 25 === 0) {
        console.warn(
          `[rederive-event-artists] ${adjudicationCost.calls} calls, $${adjudicationCost.costUsd.toFixed(4)} spent`,
        );
      }
      return verdict;
    },
    limit,
    onlyFlattenedBillings,
    hideNonConcerts,
    // Our artists table and MusicBrainz (the bot user agent, one request a
    // second) decide whether "A & B" is one act or two; what they cannot
    // settle is left unwritten and listed below.
    joinedEvidence: makeJoinedEvidence(musicBrainz),
    shouldStop: () => adjudicationCost.costUsd >= maxCostUsd,
    // Every change, not a sample: the summary is the list an apply is judged by.
    sampleSize: Number.MAX_SAFE_INTEGER,
  }).finally(() =>
    // Written even when the pass throws partway: those calls were spent.
    // record() logs and swallows its own failure.
    adjudicationCost.record({
      script: 'rederive-event-artists',
      dryRun,
      ...(limit === undefined ? {} : { limit }),
    }),
  );
  if (result.stopped) {
    console.warn(
      `[rederive-event-artists] COST CAP HIT at $${adjudicationCost.costUsd.toFixed(4)}: the pass stopped early and the remaining rows were not read.`,
    );
  }
  console.warn(
    `[rederive-event-artists] haiku calls=${adjudicationCost.calls} cost=$${adjudicationCost.costUsd.toFixed(4)}`,
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
  const mb = musicBrainz.stats;
  console.warn(
    `[rederive-event-artists] MusicBrainz lookups — found=${mb.found} not-found=${mb.notFound} unavailable=${mb.unavailable}`,
  );
  for (const item of result.notWritten.slice(0, NOT_WRITTEN_LOG_ROWS)) {
    console.warn(
      `[rederive-event-artists] not written (${item.reason}) "${item.title}": stored [${names(item.before.headliners)}] / [${names(item.before.supportingArtists)}], guess [${names(item.guess.headliners)}] / [${names(item.guess.supportingArtists)}]`,
    );
  }
  for (const item of result.unresolvedJoined) {
    console.warn(
      `[rederive-event-artists] unresolved joined name "${item.name}" in "${item.title}" (model guess: ${names(item.guess)})`,
    );
  }
  if (dryRun) {
    console.warn(
      '[rederive-event-artists] dry run — nothing written. Re-run with --apply.',
    );
  }

  if (summaryFile !== undefined) {
    const lines = [
      `## Repair event artists — ${dryRun ? 'DRY RUN (no events or artists written; the Haiku spend is recorded)' : 'APPLIED'}`,
      '',
      `Scanned ${result.scanned} · derived ${result.derived} · ` +
        `${dryRun ? 'would update' : 'updated'} ${result.updated} · ` +
        `hidden ${result.hidden} · Haiku calls ${adjudicationCost.calls} · $${adjudicationCost.costUsd.toFixed(4)} ` +
        `of the $${maxCostUsd} cap${result.stopped ? ' (COST CAP HIT, the pass stopped early)' : ''}`,
      '',
      'Strategies: ' +
        Object.entries(result.strategies)
          .map(([name, count]) => `${name} ${count}`)
          .join(' · '),
      '',
      `### Changes (${result.sample.length})`,
      '',
      '| Title | Strategy | Before: headliners / supporting | After: headliners / supporting |',
      '|---|---|---|---|',
      ...result.sample
        .slice(0, SUMMARY_MAX_ROWS)
        .map(
          (change) =>
            `| ${cell(change.title)}${change.hides ? ' **HIDE**' : ''} | ${
              change.strategy === 'tribute-or-cover'
                ? 'tribute/cover → bill cleared'
                : change.strategy
            } | ` +
            `${cell(names(change.before.headliners))} / ${cell(names(change.before.supportingArtists))} | ` +
            `${cell(names(change.headliners))} / ${cell(names(change.supportingArtists))} |`,
        ),
      '',
      ...(result.sample.length > SUMMARY_MAX_ROWS
        ? [
            `…and ${result.sample.length - SUMMARY_MAX_ROWS} more changes; the step log lists every row (GitHub caps a step summary at 1 MiB).`,
            '',
          ]
        : []),
      ...(result.notWritten.length === 0
        ? []
        : [
            `### Not written: nothing stored evidences the change (${result.notWritten.length})`,
            '',
            'The pass only splits a stored joined name the evidence ruled two acts, clears a tribute or cover night, and removes repeats. These rows would have dropped a stored act, added an artist, or have no stored bill to compare with, so they are left exactly as they are. The guess is what the ladder would have written, for a human to read.',
            '',
            'By reason: ' +
              Object.entries(
                result.notWritten.reduce<Record<string, number>>(
                  (counts, item) => {
                    counts[item.reason] = (counts[item.reason] ?? 0) + 1;
                    return counts;
                  },
                  {},
                ),
              )
                .map(([reason, count]) => `${reason} ${count}`)
                .join(' · '),
            '',
            '| Event | Reason | Stored: headliners / supporting | Ladder guess: headliners / supporting |',
            '|---|---|---|---|',
            ...result.notWritten
              .slice(0, NOT_WRITTEN_MAX_ROWS)
              .map(
                (item) =>
                  `| ${cell(item.title)} | ${item.reason} | ` +
                  `${cell(names(item.before.headliners))} / ${cell(names(item.before.supportingArtists))} | ` +
                  `${cell(names(item.guess.headliners))} / ${cell(names(item.guess.supportingArtists))} |`,
              ),
            ...(result.notWritten.length > NOT_WRITTEN_MAX_ROWS
              ? [
                  '',
                  `…and ${result.notWritten.length - NOT_WRITTEN_MAX_ROWS} more not written; the step log lists the first ${NOT_WRITTEN_LOG_ROWS}.`,
                ]
              : []),
            '',
          ]),
      '',
      `### Unresolved joined names (${result.unresolvedJoined.length}), left unwritten`,
      '',
      `MusicBrainz lookups for whole names: ${musicBrainz.stats.found} found, ${musicBrainz.stats.notFound} not found (a real "no"), ${musicBrainz.stats.unavailable} unavailable (an outage, so those names are unknown, not "no").`,
      '',
      "Neither our artists nor MusicBrainz could say whether these are one act or two. The event is not touched; the model's guess is shown for an admin to read, not applied.",
      '',
      '| Event | Joined name | Model guess |',
      '|---|---|---|',
      ...result.unresolvedJoined
        .slice(0, SUMMARY_MAX_ROWS)
        .map(
          (item) =>
            `| ${cell(item.title)} | ${cell(item.name)} | ${cell(names(item.guess))} |`,
        ),
      ...(result.unresolvedJoined.length > SUMMARY_MAX_ROWS
        ? [
            '',
            `…and ${result.unresolvedJoined.length - SUMMARY_MAX_ROWS} more unresolved names; the step log lists every one.`,
          ]
        : []),
      '',
    ];
    appendFileSync(summaryFile, `${lines.join('\n')}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[rederive-event-artists] failed:', err);
    process.exit(1);
  });
