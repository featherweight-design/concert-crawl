import { describe, expect, it } from 'vitest';
import { CRAWLED, KEEP_CRAWLED, KEEP_MANUAL, MANUAL } from './merge-fixtures';
import {
  buildMergeSummary,
  fromLabel,
  mergeDateTile,
  mergeDay,
  pickDetail,
  priceLabel,
  reportsLabel,
} from './merge-rules';

describe('mergeDay and mergeDateTile', () => {
  it('writes the board day and the tile from a date', () => {
    expect(mergeDay('2026-11-12')).toBe('Thu Nov 12');
    expect(mergeDateTile('2026-11-12')).toEqual({ weekday: 'THU', day: '12' });
  });
});

describe('card rows', () => {
  it('words From, Price and Reports', () => {
    expect(fromLabel(CRAWLED)).toBe('the crawl');
    expect(fromLabel(MANUAL)).toBe('added by hand');
    expect(priceLabel(CRAWLED.price)).toBe('$65–$495');
    expect(priceLabel(MANUAL.price)).toBe('no price');
    expect(reportsLabel(CRAWLED.reports)).toBe('none');
    expect(reportsLabel(MANUAL.reports)).toBe('1 sold-out report');
    expect(
      reportsLabel({ total: 3, byKind: { 'sold-out': 1, cancelled: 2 } }),
    ).toBe('1 sold-out report, 2 cancelled reports');
  });

  it('words a pick row from its venue, source and Watchers', () => {
    expect(
      pickDetail({ venueName: 'Red Rocks', manual: true, watchers: 3 }),
    ).toBe('Red Rocks · added by hand · 3 Watching');
    expect(pickDetail({ venueName: null, manual: false, watchers: 0 })).toBe(
      'the crawl · 0 Watching',
    );
  });
});

describe('buildMergeSummary', () => {
  it('keeps the first: one price, one report, the second redirects', () => {
    expect(buildMergeSummary(KEEP_CRAWLED, 'first')).toBe(
      'After merging: 34 Watching, one price, one report. The second listing redirects here. Nobody gets a notice.',
    );
  });

  it('keeps the second: names the price it takes and the crawl line', () => {
    expect(buildMergeSummary(KEEP_MANUAL, 'second')).toBe(
      'After merging: 34 Watching, the $65–$495 price, one report. The first listing redirects here, and the next crawl updates this one instead of adding it again. Nobody gets a notice.',
    );
  });

  it('leaves out the price and reports clauses when there are none', () => {
    const bare = {
      ...KEEP_CRAWLED,
      kept: { ...CRAWLED, reports: { total: 0, byKind: {} } },
      other: { ...MANUAL, reports: { total: 0, byKind: {} } },
      after: { watchers: 5, price: { min: null, max: null } },
    };
    expect(buildMergeSummary(bare, 'first')).toBe(
      'After merging: 5 Watching. The second listing redirects here. Nobody gets a notice.',
    );
  });

  it('counts reports past one', () => {
    const many = {
      ...KEEP_CRAWLED,
      other: { ...MANUAL, reports: { total: 3, byKind: { cancelled: 3 } } },
    };
    expect(buildMergeSummary(many, 'first')).toContain('one price, 3 reports.');
  });
});
