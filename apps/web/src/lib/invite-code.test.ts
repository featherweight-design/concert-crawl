import { describe, it, expect } from 'vitest';
import {
  charactersRemaining,
  formatInviteCodeInput,
  isCompleteInviteCode,
} from './invite-code';

describe('charactersRemaining', () => {
  it.each([
    ['BETA-3F', 7],
    ['BETA', 10],
    ['RED', 1],
    ['B', 3],
  ])('counts %j as %i short', (value, remaining) => {
    expect(charactersRemaining(value)).toBe(remaining);
  });
});

describe('formatInviteCodeInput', () => {
  it.each([
    ['b', 'B'],
    ['beta', 'BETA'],
    ['beta3f', 'BETA-3F'],
    ['BETA-3F2A', 'BETA-3F2A'],
    ['BETA-3F2A9', 'BETA-3F2A-9'],
    ['beta3f2a9c1e', 'BETA-3F2A-9C1E'],
    [' beta-3f2a-9c1e ', 'BETA-3F2A-9C1E'],
    ['BETA-3F2A-9C1EXTRA', 'BETA-3F2A-9C1E'],
    // A custom code: letters and numbers only, capped at 20.
    ['redrocks', 'REDROCKS'],
    ['Red Rocks!', 'REDROCKS'],
    ['red-rocks', 'REDROCKS'],
    ['not-a-code-but-very-long-text', 'NOTACODEBUTVERYLONGT'],
  ])('formats %j as %j', (raw, formatted) => {
    expect(formatInviteCodeInput(raw)).toBe(formatted);
  });
});

describe('isCompleteInviteCode', () => {
  it('accepts a whole generated code', () => {
    expect(isCompleteInviteCode('BETA-3F2A-9C1E')).toBe(true);
    expect(isCompleteInviteCode('BETA-3F2A-9C1')).toBe(false);
    expect(isCompleteInviteCode('beta-3f2a-9c1e')).toBe(false);
  });

  it('accepts a whole custom code of 4 to 20 letters and numbers', () => {
    expect(isCompleteInviteCode('REDROCKS')).toBe(true);
    expect(isCompleteInviteCode('MIRA')).toBe(true);
    expect(isCompleteInviteCode('MIR')).toBe(false);
    // Reserved: it would format into the generated shape as it's typed.
    expect(isCompleteInviteCode('BETAMAX')).toBe(false);
  });
});
