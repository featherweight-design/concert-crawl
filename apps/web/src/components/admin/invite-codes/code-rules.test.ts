import { describe, expect, it } from 'vitest';
import { codeLabel, makerName, shortDate } from './code-rules';

describe('codeLabel and makerName', () => {
  it('derives "Poster ·" for any code with more than one seat', () => {
    expect(codeLabel({ label: 'Hi-Dive bathroom', maxUses: 50 })).toBe(
      'Poster · Hi-Dive bathroom',
    );
    expect(codeLabel({ label: null, maxUses: 50 })).toBe('Poster');
    expect(codeLabel({ label: 'For Mira', maxUses: 1 })).toBe('For Mira');
  });

  it('names a maker with no handle "A former admin"', () => {
    expect(makerName({ createdByHandle: 'jules' })).toBe('@jules');
    expect(makerName({ createdByHandle: null })).toBe('A former admin');
  });
});

describe('shortDate', () => {
  it('reads the Mountain Time calendar date', () => {
    expect(shortDate('2027-02-02T05:00:00Z')).toBe('Feb 1');
  });
});
