import { describe, it, expect } from 'vitest';
import { crewLensFilterQuery } from './crews';

// The crew lens keeps When, Where, Price and Vibe applied, so its feed is asked
// with the same keys the events list is, from the same page-URL mapper.
describe('crewLensFilterQuery', () => {
  it('is empty when no filter is set', () => {
    expect(crewLensFilterQuery({ crew: 'abc' })).toBe('');
  });

  it('translates Where, Price and Vibe to the events endpoint keys', () => {
    const qs = new URLSearchParams(
      crewLensFilterQuery({
        crew: 'abc',
        filterWhere: ['red-rocks', 'fillmore'],
        filterPrice: 'under-25',
        filterVibe: ['indie', 'punk'],
      }),
    );
    expect(qs.getAll('venueSlug')).toEqual(['red-rocks', 'fillmore']);
    expect(qs.get('filterPrice')).toBe('under-25');
    expect(qs.getAll('filterVibe')).toEqual(['indie', 'punk']);
  });

  it('turns an explicit date window into from and to', () => {
    const qs = new URLSearchParams(
      crewLensFilterQuery({ from: '2026-12-01', to: '2026-12-31' }),
    );
    expect(qs.get('from')).toBe('2026-12-01');
    expect(qs.get('to')).toBe('2026-12-31');
  });

  it('leaves search, paging and the crew itself out', () => {
    const qs = new URLSearchParams(
      crewLensFilterQuery({
        crew: 'abc',
        search: 'phish',
        offset: '40',
        filterPrice: 'tbd',
      }),
    );
    expect([...qs.keys()]).toEqual(['filterPrice']);
  });
});
