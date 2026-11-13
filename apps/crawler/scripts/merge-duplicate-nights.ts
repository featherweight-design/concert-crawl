import { appendFileSync } from 'node:fs';
import { mergeDuplicateNights } from '@concert-crawl/crawler-core';

// One-off cleanup of events stored twice for one night. Dry by default:
// `--apply` is the only thing that writes. `--max-groups=N` caps an apply to a
// first sample. `--summary-file=PATH` writes every group as a Markdown table (in
// the workflow, GITHUB_STEP_SUMMARY) so the run page lists what a merge would do
// (or did) before anyone decides to apply.
//
// Lives in apps/crawler beside the other one-offs (crawler-core and db are both
// reachable from here without a workspace cycle).

const parseMaxGroups = (): number | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--max-groups='));
  if (flag === undefined) return undefined;
  const raw = flag.slice('--max-groups='.length);
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--max-groups expects a positive integer, got "${raw}"`);
  }
  return value;
};

const parseSummaryFile = (): string | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--summary-file='));
  return flag === undefined ? undefined : flag.slice('--summary-file='.length);
};

// A step summary over 1 MiB fails the step; a group row is a few hundred bytes.
const SUMMARY_MAX_ROWS = 1200;

// Crawled titles and database errors are untrusted text going into a Markdown
// table: no pipes, line breaks or HTML.
const cell = (text: string): string =>
  text
    .replace(/\r?\n/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
const time = (showTime: string | null): string => showTime ?? 'no time';

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply');
  const maxGroups = parseMaxGroups();
  const summaryFile = parseSummaryFile();

  console.warn(
    `[merge-duplicate-nights] starting — ${dryRun ? 'DRY RUN' : 'APPLY'}${
      maxGroups === undefined ? '' : ` max-groups=${maxGroups}`
    }`,
  );
  const result = await mergeDuplicateNights({ dryRun, maxGroups });

  const refs = (rows: { refs: number }[]): number =>
    rows.reduce((total, row) => total + row.refs, 0);
  console.warn(
    `[merge-duplicate-nights] scanned=${result.scanned} groups=${result.groups.length} ` +
      `${dryRun ? 'would-merge' : 'merged'}=${dryRun ? result.groups.length : result.merged} failed=${result.failed} skipped=${result.skipped} ` +
      `artist-reviews=${result.artistReviews.length}`,
  );
  for (const plan of result.groups) {
    console.warn(
      `  ${plan.date} keep "${plan.survivor.title}" (${time(plan.survivor.showTime)}, ${plan.survivor.refs} refs) ← ` +
        plan.losers
          .map(
            (loser) =>
              `"${loser.title}" (${time(loser.showTime)}, ${loser.refs} refs)`,
          )
          .join(', ') +
        `${plan.fills.length > 0 ? ` fills ${plan.fills.join(',')}` : ''}` +
        `${plan.outcome === 'failed' ? ` FAILED: ${plan.error}` : ''}` +
        `${plan.outcome === 'skipped' ? ` SKIPPED: ${plan.error}` : ''}` +
        `${plan.fillError === undefined ? '' : ` FILL FAILED: ${plan.fillError}`}`,
    );
  }
  if (dryRun) {
    console.warn(
      '[merge-duplicate-nights] dry run — nothing written. Re-run with --apply.',
    );
  }

  if (summaryFile !== undefined) {
    const lines = [
      `## Merge duplicate nights — ${dryRun ? 'DRY RUN (nothing written)' : 'APPLIED'}`,
      '',
      `Scanned ${result.scanned} upcoming-status events · ${result.groups.length} nights stored more than once · ` +
        `${result.groups.reduce((total, plan) => total + plan.losers.length, 0)} rows to fold in · ` +
        `${refs(result.groups.flatMap((plan) => plan.losers))} user references on those rows move to the survivor` +
        `${dryRun ? '' : `. This run reached ${result.merged + result.failed + result.skipped} of them: merged ${result.merged} · failed ${result.failed} · skipped (changed since planned) ${result.skipped}`}`,
      '',
      `### Nights (${result.groups.length})`,
      '',
      'The survivor is the row people already point at (most references), then a timed row, then the lowest id. Everything a folded row held (watches, going marks, attendance stamps, reports, price submissions) moves to it, and the old id redirects to it.',
      '',
      '| Date | Keep | Fold in | Survivor takes | Result |',
      '|---|---|---|---|---|',
      ...result.groups
        .slice(0, SUMMARY_MAX_ROWS)
        .map(
          (plan) =>
            `| ${plan.date} | ${cell(plan.survivor.title)} (${time(plan.survivor.showTime)}, ${plan.survivor.refs} refs) | ` +
            `${cell(
              plan.losers
                .map(
                  (loser) =>
                    `${loser.title} (${time(loser.showTime)}, ${loser.refs} refs)`,
                )
                .join('; '),
            )} | ${plan.fills.join(', ') || '(nothing)'} | ${
              plan.outcome === undefined
                ? dryRun
                  ? 'would merge'
                  : 'not reached (max-groups)'
                : plan.outcome === 'merged'
                  ? plan.fillError === undefined
                    ? 'merged'
                    : cell(`merged, FILL FAILED: ${plan.fillError}`)
                  : plan.outcome === 'skipped'
                    ? cell(`skipped: ${plan.error ?? ''}`)
                    : cell(
                        `FAILED (earlier rows of the night may be merged): ${plan.error ?? ''}`,
                      )
            } |`,
        ),
      ...(result.groups.length > SUMMARY_MAX_ROWS
        ? [
            '',
            `…and ${result.groups.length - SUMMARY_MAX_ROWS} more nights; the step log lists every one.`,
          ]
        : []),
      '',
      `### Artist merges to review (${result.artistReviews.length})`,
      '',
      'Doubled rows that name two artists. Not merged here: open them in the admin artists queue.',
      '',
      '| Date | Canonical keys | Our artist rows |',
      '|---|---|---|',
      ...result.artistReviews
        .slice(0, SUMMARY_MAX_ROWS)
        .map(
          (review) =>
            `| ${review.date} | ${cell(review.canonicalArtists.join(' / '))} | ${cell(
              review.artistRows
                .map((row) => `${row.name} (${row.id})`)
                .join('; ') || '(none)',
            )} |`,
        ),
      '',
    ];
    appendFileSync(summaryFile, `${lines.join('\n')}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[merge-duplicate-nights] failed:', err);
    process.exit(1);
  });
