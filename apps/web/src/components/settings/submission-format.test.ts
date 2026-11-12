import { describe, it, expect } from 'vitest';
import type { UserSubmissionItem } from '@concert-crawl/types';
import {
  countsByFilter,
  formatAgo,
  groupByMonth,
  latestSubmission,
  matchesFilter,
  priceLabelOf,
} from './submission-format';
import { avatarPair } from './definitions/styles';

const sub = (id: string, submittedAt: string): UserSubmissionItem => ({
  id,
  eventId: `evt-${id}`,
  artist: 'FKJ',
  venue: 'Mission Ballroom',
  venueSlug: 'mission-ballroom',
  date: '2026-04-29',
  priceMin: 6800,
  priceMax: 7500,
  tier: 'GA',
  corroborationCount: 1,
  submittedAt,
  status: 'confirmed',
});

describe('formatAgo', () => {
  it('never goes negative when the server stamp is ahead of this clock', () => {
    expect(formatAgo(new Date(Date.now() + 90_000).toISOString())).toBe('0m');
  });

  it('counts minutes, hours, days and weeks back', () => {
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    expect(formatAgo(ago(5 * 60_000))).toBe('5m');
    expect(formatAgo(ago(3 * 3_600_000))).toBe('3h');
    expect(formatAgo(ago(2 * 86_400_000))).toBe('2d');
    expect(formatAgo(ago(15 * 86_400_000))).toBe('2w');
  });
});

describe('priceLabelOf', () => {
  it('draws a range with an en dash and a single price alone', () => {
    expect(priceLabelOf({ priceMin: 6800, priceMax: 7500 })).toBe('$68–$75');
    expect(priceLabelOf({ priceMin: 4400, priceMax: null })).toBe('$44');
  });
});

describe('latestSubmission', () => {
  it('returns the newest whatever order the list arrives in', () => {
    const list = [
      sub('a', '2026-09-01T00:00:00Z'),
      sub('b', '2026-10-01T00:00:00Z'),
      sub('c', '2026-08-01T00:00:00Z'),
    ];
    expect(latestSubmission(list)?.id).toBe('b');
  });

  it('is undefined for an empty list', () => {
    expect(latestSubmission([])).toBeUndefined();
  });
});

describe('avatarPair', () => {
  it('defaults to the signal-to-accent pair when no colour is set', () => {
    expect(avatarPair(null, null)).toEqual({
      first: 'signal',
      second: 'accent',
    });
  });

  it('is solid when only one colour is set', () => {
    expect(avatarPair('success', null)).toEqual({
      first: 'success',
      second: 'success',
    });
  });

  it('keeps both colours of a pair', () => {
    expect(avatarPair('warning', 'accent')).toEqual({
      first: 'warning',
      second: 'accent',
    });
  });
});

describe('submission filters', () => {
  const list: UserSubmissionItem[] = [
    { ...sub('a', '2026-11-02T18:00:00Z'), status: 'confirmed' },
    { ...sub('b', '2026-11-01T18:00:00Z'), status: 'pending' },
    { ...sub('c', '2026-10-30T18:00:00Z'), status: 'disputed' },
    { ...sub('d', '2026-10-29T18:00:00Z'), status: 'confirmed' },
  ];

  it('counts each filter, Live being confirmed and Price checks disputed', () => {
    expect(countsByFilter(list)).toEqual({
      all: 4,
      live: 2,
      pending: 1,
      priceChecks: 1,
    });
  });

  it('matches by status, and All matches everything', () => {
    expect(list.filter((item) => matchesFilter(item, 'live'))).toHaveLength(2);
    expect(list.filter((item) => matchesFilter(item, 'all'))).toHaveLength(4);
  });
});

describe('groupByMonth', () => {
  it('groups by the Mountain Time submission month, newest first', () => {
    const months = groupByMonth([
      sub('old', '2026-10-15T12:00:00Z'),
      sub('new', '2026-11-05T12:00:00Z'),
      sub('newer', '2026-11-09T12:00:00Z'),
    ]);
    expect(months.map((month) => month.label)).toEqual(['November', 'October']);
    expect(months[0]?.items.map((item) => item.id)).toEqual(['newer', 'new']);
  });

  it('puts a submission just after UTC midnight on the 1st in the prior Denver month', () => {
    const months = groupByMonth([sub('edge', '2026-11-01T03:00:00Z')]);
    expect(months[0]?.label).toBe('October');
  });
});
