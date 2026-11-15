import { describe, expect, it } from 'vitest';
import {
  crawledLineupAction,
  type CrawledLineupFacts,
} from './crawled-lineup-action.js';

const facts = (
  overrides: Partial<CrawledLineupFacts> = {},
): CrawledLineupFacts => ({
  readNotConcert: false,
  hidden: false,
  billLocked: false,
  upserted: false,
  namesCreatedArtist: () => false,
  ...overrides,
});

describe('crawledLineupAction', () => {
  it('never clears a locked bill over a listing read as not a concert', () => {
    expect(
      crawledLineupAction(
        facts({ readNotConcert: true, billLocked: true, upserted: true }),
      ),
    ).toBe('none');
  });

  it('clears a crawled bill the listing reads as not a concert', () => {
    expect(
      crawledLineupAction(facts({ readNotConcert: true, upserted: true })),
    ).toBe('clear');
  });

  it('clears a hidden row, locked or not', () => {
    expect(crawledLineupAction(facts({ hidden: true }))).toBe('clear');
    expect(crawledLineupAction(facts({ hidden: true, billLocked: true }))).toBe(
      'clear',
    );
  });

  it('rebuilds an upserted row, and an unchanged one only when it names a new artist', () => {
    expect(crawledLineupAction(facts({ upserted: true }))).toBe('sync');
    expect(
      crawledLineupAction(facts({ billLocked: true, upserted: true })),
    ).toBe('sync');
    expect(crawledLineupAction(facts())).toBe('none');
    expect(crawledLineupAction(facts({ namesCreatedArtist: () => true }))).toBe(
      'sync',
    );
  });
});
