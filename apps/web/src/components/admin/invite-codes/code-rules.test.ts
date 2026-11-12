import { describe, expect, it } from 'vitest';
import {
  codeLabel,
  expiresAtFor,
  initialExpiry,
  makerName,
  roleLabel,
  shortDate,
} from './code-rules';

const NOW = new Date('2026-11-12T12:00:00Z');

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

describe('roleLabel', () => {
  it('names Beta and the other roles, never a plain member', () => {
    expect(roleLabel('beta')).toBe('Beta');
    expect(roleLabel('user')).toBeNull();
    expect(roleLabel(null)).toBeNull();
  });
});

describe('initialExpiry', () => {
  it('starts on Keep when an exact expiry is still ahead', () => {
    expect(initialExpiry('2027-02-01T07:00:00Z', NOW, 'never')).toBe('keep');
  });

  it('starts on the fallback when there is none, or it has passed', () => {
    expect(initialExpiry(null, NOW, 'never')).toBe('never');
    expect(initialExpiry('2026-10-31T06:00:00Z', NOW, 'd7')).toBe('d7');
  });

  it('sends nothing for Keep, null for Never, and an instant for days', () => {
    expect(expiresAtFor('keep', NOW)).toBeUndefined();
    expect(expiresAtFor('never', NOW)).toBeNull();
    expect(expiresAtFor('d7', NOW)).toBe('2026-11-19T12:00:00.000Z');
  });
});
