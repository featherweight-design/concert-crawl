import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTER_VALUES,
  draftParams,
  draftUpdates,
  pickSingle,
  type FilterDraft,
} from './phone-draft';

const draft = (
  overrides: Partial<FilterDraft['values']>,
  crew: string | null = null,
): FilterDraft => ({
  values: { ...EMPTY_FILTER_VALUES, ...overrides },
  crew,
});

describe('phone filter draft', () => {
  it('writes Where and Vibe as lists and When and Price as one value', () => {
    expect(
      draftUpdates(
        draft({
          when: ['tonight'],
          where: ['bluebird-theater', 'ogden-theatre'],
          price: ['under-25'],
          vibe: ['indie'],
        }),
        false,
      ),
    ).toEqual({
      filterWhen: 'tonight',
      filterWhere: ['bluebird-theater', 'ogden-theatre'],
      filterPrice: 'under-25',
      filterVibe: ['indie'],
    });
  });

  it('writes the crew lens only when there is one to set', () => {
    expect(
      draftUpdates(draft({ when: ['tonight'] }, 'crew_1'), true),
    ).toMatchObject({ crew: 'crew_1' });
    expect(
      draftUpdates(draft({ when: ['tonight'] }, null), true),
    ).toMatchObject({
      crew: '',
    });
    expect(
      draftUpdates(draft({ when: ['tonight'] }, 'crew_1'), false),
    ).not.toHaveProperty('crew');
  });

  it('drops an explicit window once nothing is left, as Clear all does', () => {
    expect(draftUpdates(draft({}), false)).toMatchObject({ from: '', to: '' });
    expect(draftUpdates(draft({ price: ['tbd'] }), false)).not.toHaveProperty(
      'from',
    );
  });

  it('lays the draft over the page URL, keeping the rest and dropping offset', () => {
    const base = new URLSearchParams(
      'view=list&filterFollowing=1&offset=40&filterWhere=globe-hall&filterWhen=tonight',
    );
    const params = draftParams(
      base,
      draft({ where: ['bluebird-theater', 'ogden-theatre'], vibe: ['punk'] }),
    );
    expect(params.get('view')).toBe('list');
    expect(params.get('filterFollowing')).toBe('1');
    expect(params.get('offset')).toBeNull();
    expect(params.get('filterWhen')).toBeNull();
    expect(params.getAll('filterWhere')).toEqual([
      'bluebird-theater',
      'ogden-theatre',
    ]);
    expect(params.getAll('filterVibe')).toEqual(['punk']);
    // The base is left as it was.
    expect(base.get('offset')).toBe('40');
  });

  it('a single-select pill swaps its pick, and the picked one taps off', () => {
    expect(pickSingle([], 'tonight')).toEqual(['tonight']);
    expect(pickSingle(['tonight'], 'next-week')).toEqual(['next-week']);
    expect(pickSingle(['tonight'], 'tonight')).toEqual([]);
  });
});
