import { describe, it, expect } from 'vitest';
import type { UserSubmissionItem } from '@concert-crawl/types';
import { latestSubmission, priceLabelOf } from './submission-format';
import { avatarPair } from './definitions/styles';

const sub = (id: string, submittedAt: string): UserSubmissionItem => ({
  id,
  eventId: `evt-${id}`,
  artist: 'FKJ',
  venue: 'Mission Ballroom',
  date: '2026-04-29',
  priceMin: 6800,
  priceMax: 7500,
  tier: 'GA',
  corroborationCount: 1,
  submittedAt,
  status: 'confirmed',
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
