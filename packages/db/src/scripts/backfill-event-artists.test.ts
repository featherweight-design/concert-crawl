import { describe, expect, it } from 'vitest';
import {
  addBatch,
  emptyTotals,
  formatTotals,
} from './backfill-event-artists.js';
import { assertHostAllowed, parseArgs } from './run-backfill-event-artists.js';

describe('backfill-event-artists counting', () => {
  it('sums each batch into the running totals', () => {
    const totals = [
      { events: 500, inserted: 900, updated: 0, deleted: 0, unmatched: 40 },
      { events: 12, inserted: 20, updated: 1, deleted: 2, unmatched: 3 },
    ].reduce(addBatch, emptyTotals());
    expect(totals).toEqual({
      batches: 2,
      events: 512,
      inserted: 920,
      updated: 1,
      deleted: 2,
      unmatched: 43,
    });
  });

  it('says a dry run wrote nothing', () => {
    const totals = addBatch(emptyTotals(), {
      events: 3,
      inserted: 4,
      updated: 0,
      deleted: 1,
      unmatched: 2,
    });
    expect(formatTotals(totals, true)).toBe(
      'DRY RUN, nothing written: would insert=4 update=0 delete=1 (events=3 batches=1 unmatched-names=2)',
    );
    expect(formatTotals(totals, false)).toBe(
      'insert=4 update=0 delete=1 (events=3 batches=1 unmatched-names=2)',
    );
  });
});

describe('backfill-event-artists CLI guard', () => {
  it('reads --dry-run and --allow-prod, and rejects anything else', () => {
    expect(parseArgs([])).toEqual({ dryRun: false, allowProd: false });
    expect(parseArgs(['--dry-run'])).toEqual({
      dryRun: true,
      allowProd: false,
    });
    expect(parseArgs(['--dry-run', '--allow-prod'])).toEqual({
      dryRun: true,
      allowProd: true,
    });
    expect(parseArgs(['--', '--dry-run'])).toEqual({
      dryRun: true,
      allowProd: false,
    });
    expect(() => parseArgs(['--dryrun'])).toThrow(/Unknown argument/);
  });

  it('refuses the prod host without --allow-prod', () => {
    const prod =
      'postgresql://user:pw@ep-raspy-hall-123456-pooler.us-east-2.aws.neon.tech/db';
    expect(() => assertHostAllowed(prod, false)).toThrow(/--allow-prod/);
    expect(assertHostAllowed(prod, true)).toContain('ep-raspy-hall');
  });

  it('allows any other host, and refuses an unreadable connection string', () => {
    expect(
      assertHostAllowed(
        'postgresql://postgres:postgres@localhost:5433/db',
        false,
      ),
    ).toBe('localhost');
    expect(() => assertHostAllowed('not a url', false)).toThrow(/readable/);
  });
});
