import { describe, expect, it } from 'vitest';
import {
  EVENTS_QUERY_KEYS,
  MAX_LIST_PARAM_VALUES,
  isEventsQueryKey,
  parseListParam,
} from './events-query.js';

describe('parseListParam', () => {
  it('reads nothing as an empty list', () => {
    expect(parseListParam(undefined)).toEqual([]);
    expect(parseListParam(null)).toEqual([]);
    expect(parseListParam([])).toEqual([]);
  });

  it('reads a legacy single value as a one-item list', () => {
    expect(parseListParam('red-rocks')).toEqual(['red-rocks']);
  });

  it('keeps every value of a repeated key', () => {
    expect(parseListParam(['ogden', 'bluebird'])).toEqual([
      'ogden',
      'bluebird',
    ]);
  });

  it('never splits a value on commas unless asked', () => {
    // A raw-genre bookmark can contain a comma and must match exactly.
    expect(parseListParam('folk, americana')).toEqual(['folk, americana']);
    expect(parseListParam(['ogden,bluebird'])).toEqual(['ogden,bluebird']);
  });

  it('splits on commas when asked', () => {
    expect(
      parseListParam(['ogden,bluebird', 'gothic'], { splitCommas: true }),
    ).toEqual(['ogden', 'bluebird', 'gothic']);
  });

  it('trims items and drops blanks', () => {
    expect(parseListParam([' ogden ', '', '  '])).toEqual(['ogden']);
    expect(parseListParam(' , ', { splitCommas: true })).toEqual([]);
  });

  it('dedupes after trimming, first occurrence first', () => {
    expect(parseListParam(['b', 'a', ' b', 'a '])).toEqual(['b', 'a']);
  });

  it('dedupes before applying the cap', () => {
    const repeats = Array.from({ length: 40 }, () => 'same');
    expect(parseListParam([...repeats, 'other'])).toEqual(['same', 'other']);
  });

  it('truncates past the cap rather than throwing', () => {
    const values = Array.from(
      { length: MAX_LIST_PARAM_VALUES + 5 },
      (_, i) => `v${i}`,
    );
    const parsed = parseListParam(values);
    expect(parsed).toHaveLength(MAX_LIST_PARAM_VALUES);
    expect(parsed[0]).toBe('v0');
  });
});

describe('EVENTS_QUERY_KEYS', () => {
  it('recognises its own keys and nothing else', () => {
    for (const key of EVENTS_QUERY_KEYS)
      expect(isEventsQueryKey(key)).toBe(true);
    expect(isEventsQueryKey('filterWhere')).toBe(false);
    expect(isEventsQueryKey('venueId')).toBe(false);
  });
});
