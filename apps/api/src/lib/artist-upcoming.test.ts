import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import {
  hasShowInNextDaysExpr,
  hasUpcomingShowExpr,
  nextShowDateExpr,
} from './artist-upcoming.js';

const dialect = new PgDialect();
const render = (expr: SQL) => dialect.sqlToQuery(expr);
const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

// What follows the first WHERE: the predicate both expressions must share.
const wherePredicate = (text: string) => {
  const at = text.search(/\bWHERE\b/);
  expect(at).toBeGreaterThan(-1);
  return squash(text.slice(at));
};

describe('artist upcoming expressions', () => {
  it('has no upper bound unless asked', () => {
    const { sql: text } = render(hasUpcomingShowExpr());
    expect(text).not.toMatch(/::int/);
  });

  it('bounds the show date by a whole number of days when asked', () => {
    const { sql: text, params } = render(hasUpcomingShowExpr(60));
    expect(text).toMatch(/<= \(.*::date \+ \$\d+::int\)/);
    expect(params).toContain(60);
  });

  it('bounds "the next N days" exclusively, leaving the inclusive bound alone', () => {
    const { sql: text, params } = render(hasShowInNextDaysExpr(60));
    expect(text).toMatch(/ < \(.*::date \+ \$\d+::int\)/);
    expect(text).not.toMatch(/<= \(.*::date \+ \$\d+::int\)/);
    expect(params).toContain(60);
    expect(() => hasShowInNextDaysExpr(-1)).toThrow(RangeError);
  });

  it('asks the same question as the next-show date, bound or not', () => {
    for (const bound of [undefined, 60]) {
      const exists = render(hasUpcomingShowExpr(bound));
      const next = render(nextShowDateExpr(bound));
      expect(wherePredicate(next.sql)).toBe(wherePredicate(exists.sql));
      expect(next.params).toEqual(exists.params);
      expect(next.sql).toMatch(/min\(/i);
    }
  });

  it.each([7.5, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'refuses a bound of %s',
    (bound) => {
      expect(() => hasUpcomingShowExpr(bound)).toThrow(RangeError);
      expect(() => nextShowDateExpr(bound)).toThrow(RangeError);
    },
  );
});
