import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import {
  NAME_MATCH_AREAS,
  nameMatchAreaAccepts,
  nameMatchAreaSql,
} from './name-match-area.js';

describe('nameMatchAreaAccepts (rule A)', () => {
  it.each([
    ['United States', true],
    ['Colorado', true],
    [null, true],
    ['', true],
    ['   ', true],
    // The abroad-acts pattern from the staging name matches.
    ['Iceland', false],
    ['Sweden', false],
    ['Japan', false],
    ['United Kingdom', false],
    ['Germany', false],
    // A US city is not the US or Colorado by this test.
    ['Seattle', false],
    ['united states', false],
  ])('%s -> %s', (area, expected) => {
    expect(nameMatchAreaAccepts(area)).toBe(expected);
  });
});

describe('nameMatchAreaSql', () => {
  it('binds exactly the shared area list and tests blank', () => {
    const { sql: text, params } = new PgDialect().sqlToQuery(
      nameMatchAreaSql('mb_names.area'),
    );
    expect(params).toEqual([...NAME_MATCH_AREAS]);
    expect(text).toContain('mb_names.area IS NULL');
    expect(text).toContain("btrim(mb_names.area) = ''");
  });
});
