import { describe, expect, it } from 'vitest';
import {
  cleanCode,
  codeActions,
  codeLabel,
  codeProblem,
  expiresAtFor,
  initialExpiry,
  makerName,
  roleLabel,
  seatCap,
  seatsFloorError,
  seatsFrom,
  shortDate,
  suggestCode,
} from './code-rules';

const NOW = new Date('2026-11-12T12:00:00Z');

describe('suggestCode', () => {
  it('keeps letters and numbers, uppercased', () => {
    expect(suggestCode('Red Rocks lot, Oct')).toBe('REDROCKSLOTOCT');
    expect(suggestCode('Mira’s roommate 2')).toBe('MIRASROOMMATE2');
  });

  it('drops a typed "Poster ·" prefix, as GLOBEHALL is drawn', () => {
    expect(suggestCode('Poster · Globe Hall')).toBe('GLOBEHALL');
  });

  it('cuts to 20 characters', () => {
    expect(suggestCode('a'.repeat(30))).toHaveLength(20);
  });

  it('suggests nothing when the label has no letters', () => {
    expect(suggestCode('')).toBe('');
    expect(suggestCode('2026 · 11')).toBe('');
  });

  it('never suggests a code the API refuses', () => {
    expect(suggestCode('Beta testers')).toBe('');
    expect(suggestCode('Hi')).toBe('');
  });

  it('names what is wrong with a typed code', () => {
    expect(codeProblem('')).toBeNull();
    expect(codeProblem('GLOBEHALL')).toBeNull();
    expect(codeProblem('ABC')).toBe(
      '4 to 20 letters and numbers. Not case-sensitive.',
    );
    expect(codeProblem('BETATEST')).toBe("Codes can't start with BETA.");
  });

  it('cleans a typed code the same way', () => {
    expect(cleanCode('red-rocks 2')).toBe('REDROCKS2');
  });
});

describe('seats', () => {
  it('reads a preset, or Other within 1 to 500', () => {
    expect(seatsFrom('1', '')).toBe(1);
    expect(seatsFrom('other', '75')).toBe(75);
    expect(seatsFrom('other', '501')).toBeNull();
  });

  it('says how many are used when seats go below that', () => {
    expect(seatsFloorError(20, 23)).toBe('23 already used');
    expect(seatsFloorError(23, 23)).toBeNull();
    expect(seatsFloorError(null, 23)).toBeNull();
  });
});

describe('codeLabel and makerName', () => {
  const admin = { kind: 'admin' as const, createdByHandle: 'jules' };

  it('derives "Poster ·" for any code with more than one seat', () => {
    expect(
      codeLabel({ ...admin, label: 'Hi-Dive bathroom', maxUses: 50 }),
    ).toBe('Poster · Hi-Dive bathroom');
    expect(codeLabel({ ...admin, label: null, maxUses: 50 })).toBe('Poster');
    expect(codeLabel({ ...admin, label: 'For Mira', maxUses: 1 })).toBe(
      'For Mira',
    );
  });

  it('labels a member share code "Personal · @handle", never a poster', () => {
    expect(
      codeLabel({
        label: null,
        maxUses: 10_000,
        kind: 'member',
        createdByHandle: 'mira',
      }),
    ).toBe('Personal · @mira');
    expect(
      codeLabel({
        label: null,
        maxUses: 10_000,
        kind: 'member',
        createdByHandle: null,
      }),
    ).toBe('Personal');
  });

  it('names a maker with no handle "A former admin"', () => {
    expect(makerName({ createdByHandle: 'jules' })).toBe('@jules');
    expect(makerName({ createdByHandle: null })).toBe('A former admin');
  });

  it('never calls a member without a handle a former admin', () => {
    expect(makerName({ createdByHandle: null, kind: 'member' })).toBe(
      'No handle yet',
    );
  });
});

describe('seatCap', () => {
  it('hides a member code’s 10,000 ceiling and keeps an admin cap', () => {
    expect(seatCap({ kind: 'member', maxUses: 10_000 })).toBeNull();
    expect(seatCap({ kind: 'admin', maxUses: 50 })).toBe(50);
  });
});

describe('codeActions', () => {
  const admin = { kind: 'admin' as const, maxUses: 50 };
  const member = { kind: 'member' as const, maxUses: 10_000 };

  it('offers an admin code everything its status allows', () => {
    expect(codeActions(admin, 'active')).toEqual([
      'copy',
      'poster',
      'joined',
      'edit',
      'revoke',
    ]);
    expect(codeActions(admin, 'revoked')).toEqual([
      'copy',
      'joined',
      'reactivate',
    ]);
  });

  it('keeps Revoke and who joined on a member code, never Edit or Reactivate', () => {
    expect(codeActions(member, 'active')).toEqual(['copy', 'joined', 'revoke']);
    // Full is not ended, so it keeps Revoke too.
    expect(codeActions(member, 'full')).toEqual(['copy', 'joined', 'revoke']);
    expect(codeActions(member, 'revoked')).toEqual(['copy', 'joined']);
    expect(codeActions(member, 'expired')).toEqual(['copy', 'joined']);
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
