import { describe, expect, it } from 'vitest';
import type { EventStatus } from '@concert-crawl/types';
import {
  isDelisted,
  isFaded,
  isStruck,
  resolveRowStatus,
  type RowPriceState,
  type RowStatus,
} from './row-status';

const LIFECYCLES: EventStatus[] = ['upcoming', 'cancelled', 'postponed'];
const PRICE_STATES: RowPriceState[] = ['live', 'soldout', 'presale'];

describe('resolveRowStatus', () => {
  it('gives the price slot to the lifecycle whatever the price is doing', () => {
    for (const state of PRICE_STATES) {
      expect(resolveRowStatus('cancelled', state)).toBe('cancelled');
      expect(resolveRowStatus('postponed', state)).toBe('postponed');
    }
  });

  // The live bug: production asked `soldout` first and only consulted
  // suppression afterwards, so a cancelled sold-out show read "Sold out".
  it('lets cancelled beat sold out', () => {
    expect(resolveRowStatus('cancelled', 'soldout')).toBe('cancelled');
  });

  it('falls through to the price state on a live show', () => {
    expect(resolveRowStatus('upcoming', 'soldout')).toBe('soldout');
    expect(resolveRowStatus('upcoming', 'presale')).toBe('presale');
    expect(resolveRowStatus('upcoming', 'live')).toBe('price');
  });

  it('resolves every pair to one of the five known outcomes', () => {
    const known: RowStatus[] = [
      'removed',
      'cancelled',
      'postponed',
      'soldout',
      'presale',
      'price',
    ];
    for (const lifecycle of LIFECYCLES) {
      for (const state of PRICE_STATES) {
        expect(known).toContain(resolveRowStatus(lifecycle, state));
      }
    }
  });
});

describe('No longer listed', () => {
  const DELISTED = '2026-11-01T09:00:00Z';

  it('reads a delisted cancellation as removed, whatever the price is doing', () => {
    for (const state of PRICE_STATES) {
      expect(resolveRowStatus('cancelled', state, DELISTED)).toBe('removed');
    }
  });

  // A confirmed cancellation clears the marker, so an unmarked cancelled
  // show stays Cancelled; an older payload sends no marker at all.
  it('keeps an unmarked cancellation Cancelled', () => {
    expect(resolveRowStatus('cancelled', 'live', null)).toBe('cancelled');
    expect(resolveRowStatus('cancelled', 'live', undefined)).toBe('cancelled');
    expect(resolveRowStatus('cancelled', 'live')).toBe('cancelled');
  });

  // The marker only counts alongside `cancelled`: an admin setting a show
  // back to upcoming clears it, but a stale one must still never win.
  it('ignores a marker on a show that is not cancelled', () => {
    expect(resolveRowStatus('upcoming', 'live', DELISTED)).toBe('price');
    expect(resolveRowStatus('postponed', 'live', DELISTED)).toBe('postponed');
    expect(isDelisted('upcoming', DELISTED)).toBe(false);
    expect(isDelisted('cancelled', DELISTED)).toBe(true);
    expect(isDelisted('cancelled', null)).toBe(false);
  });

  it('never strikes, because nothing says the show is off', () => {
    expect(isStruck('removed')).toBe(false);
  });

  it('fades the artwork for every suppressed state and no live one', () => {
    expect(isFaded('removed')).toBe(true);
    expect(isFaded('cancelled')).toBe(true);
    expect(isFaded('postponed')).toBe(true);
    expect(isFaded('soldout')).toBe(true);
    expect(isFaded('presale')).toBe(false);
    expect(isFaded('price')).toBe(false);
  });
});

describe('isStruck', () => {
  // Line 3 is struck for the two lifecycle states and nothing else. Sold out
  // shares the dimmed artwork but is not struck: the night still happens.
  it('strikes the two lifecycle outcomes only', () => {
    expect(isStruck('cancelled')).toBe(true);
    expect(isStruck('postponed')).toBe(true);
    expect(isStruck('soldout')).toBe(false);
    expect(isStruck('presale')).toBe(false);
    expect(isStruck('price')).toBe(false);
  });
});
