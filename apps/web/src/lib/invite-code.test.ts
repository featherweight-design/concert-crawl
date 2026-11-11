import { describe, it, expect } from 'vitest';
import { formatInviteCodeInput, isCompleteInviteCode } from './invite-code';

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
  ])('formats %j as %j', (raw, formatted) => {
    expect(formatInviteCodeInput(raw)).toBe(formatted);
  });
});

describe('isCompleteInviteCode', () => {
  it('accepts only the whole BETA-XXXX-XXXX shape', () => {
    expect(isCompleteInviteCode('BETA-3F2A-9C1E')).toBe(true);
    expect(isCompleteInviteCode('BETA-3F2A-9C1')).toBe(false);
    expect(isCompleteInviteCode('beta-3f2a-9c1e')).toBe(false);
  });
});
