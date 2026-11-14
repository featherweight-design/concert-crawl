import { describe, expect, it } from 'vitest';
import {
  PRICE_CHECK_OUTCOME_DAYS,
  pickPriceCheckOutcome,
  type ArchivedCheckRow,
} from './price-check-outcome.js';

const NOW = new Date('2026-11-14T12:00:00.000Z');
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const row = (
  id: string,
  over: Partial<ArchivedCheckRow> = {},
): ArchivedCheckRow => ({
  id,
  priceMin: '44',
  priceMax: null,
  disputedSubmissionId: null,
  updatedAt: daysAgo(1),
  ...over,
});

const pick = (
  archived: ArchivedCheckRow[],
  live: { id?: string; disputed?: string | null; updatedAt?: Date } = {},
) =>
  pickPriceCheckOutcome({
    liveId: live.id ?? 'live',
    liveDisputedSubmissionId: live.disputed ?? null,
    // Deciding a check stamps the live and archived rows alike.
    liveUpdatedAt: live.updatedAt ?? daysAgo(1),
    archived,
    now: NOW,
  });

describe('pickPriceCheckOutcome', () => {
  it('is null when nothing archived touches the live price', () => {
    expect(pick([])).toBeNull();
    expect(
      pick([row('stranger', { disputedSubmissionId: 'elsewhere' })]),
    ).toBeNull();
  });

  it('is "updated" when the live price replaced an archived one, carrying what it was', () => {
    const outcome = pick([row('old', { priceMin: '44', priceMax: '60' })], {
      disputed: 'old',
    });
    expect(outcome).toEqual({
      outcome: 'updated',
      resolvedAt: daysAgo(1).toISOString(),
      previous: { floor: 44, ceiling: 60 },
    });
  });

  it('is "held" when archived updates point at the live price', () => {
    const outcome = pick([row('counter', { disputedSubmissionId: 'live' })]);
    expect(outcome).toEqual({
      outcome: 'held',
      resolvedAt: daysAgo(1).toISOString(),
      previous: null,
    });
  });

  it('keeps the previous ceiling null for a single-number price', () => {
    expect(pick([row('old')], { disputed: 'old' })?.previous).toEqual({
      floor: 44,
      ceiling: null,
    });
  });

  it('takes the newest decided check when two apply', () => {
    const outcome = pick(
      [
        row('old', { updatedAt: daysAgo(9) }),
        row('counter', { disputedSubmissionId: 'live', updatedAt: daysAgo(2) }),
      ],
      // The live row carries the newest decision's stamp.
      { disputed: 'old', updatedAt: daysAgo(2) },
    );
    expect(outcome?.outcome).toBe('held');
  });

  it('drops a check older than the window and keeps one at its edge', () => {
    expect(
      pick([row('old', { updatedAt: daysAgo(PRICE_CHECK_OUTCOME_DAYS + 1) })], {
        disputed: 'old',
        updatedAt: daysAgo(PRICE_CHECK_OUTCOME_DAYS + 1),
      }),
    ).toBeNull();
    expect(
      pick([row('old', { updatedAt: daysAgo(PRICE_CHECK_OUTCOME_DAYS) })], {
        disputed: 'old',
        updatedAt: daysAgo(PRICE_CHECK_OUTCOME_DAYS),
      })?.outcome,
    ).toBe('updated');
  });

  it('drops the outcome once the live row was written after the decision (an admin price edit)', () => {
    expect(
      pick([row('counter', { disputedSubmissionId: 'live' })], {
        updatedAt: daysAgo(0.5),
      }),
    ).toBeNull();
    expect(
      pick([row('old')], { disputed: 'old', updatedAt: daysAgo(0.5) }),
    ).toBeNull();
  });

  it('ignores a row stamped in the future', () => {
    expect(
      pick([row('old', { updatedAt: daysAgo(-1) })], { disputed: 'old' }),
    ).toBeNull();
  });
});
