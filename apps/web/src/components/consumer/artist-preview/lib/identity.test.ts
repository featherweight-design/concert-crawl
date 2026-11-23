import { describe, expect, it } from 'vitest';

import { identityLine, typeLabel } from './identity';

describe('identityLine', () => {
  it('leads with the disambiguation, then the area', () => {
    expect(
      identityLine({
        type: 'group',
        area: 'Japan',
        disambiguation: 'Osaka noise trio',
      }),
    ).toBe('Osaka noise trio · Japan');
  });

  it('falls back to the type when there is no disambiguation', () => {
    expect(
      identityLine({
        type: 'group',
        area: 'United States',
        disambiguation: null,
      }),
    ).toBe('Band · United States');
  });

  it('drops the area when missing', () => {
    expect(
      identityLine({ type: 'person', area: null, disambiguation: null }),
    ).toBe('Solo artist');
  });

  it('treats a blank disambiguation as missing', () => {
    expect(
      identityLine({ type: 'group', area: 'Sweden', disambiguation: '  ' }),
    ).toBe('Band · Sweden');
  });

  it('is null when nothing is known', () => {
    expect(
      identityLine({ type: null, area: null, disambiguation: null }),
    ).toBeNull();
  });
});

describe('typeLabel', () => {
  it('maps person and group, nothing else', () => {
    expect(typeLabel('person')).toBe('Solo artist');
    expect(typeLabel('group')).toBe('Band');
    expect(typeLabel(null)).toBeNull();
  });
});
