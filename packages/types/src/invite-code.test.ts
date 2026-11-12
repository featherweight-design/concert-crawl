import { describe, expect, it } from 'vitest';
import {
  isCustomInviteCode,
  isInviteCodeShape,
  normalizeInviteCode,
} from './invite-code.js';

describe('invite code shapes', () => {
  it('accepts a generated code', () => {
    expect(isInviteCodeShape('BETA-AB12-CD34')).toBe(true);
  });

  it('accepts a custom code of 4 to 20 letters and numbers', () => {
    expect(isInviteCodeShape('MIRA')).toBe(true);
    expect(isInviteCodeShape('REDROCKS')).toBe(true);
    expect(isInviteCodeShape('A'.repeat(20))).toBe(true);
  });

  it('refuses short, long, punctuated and reserved codes', () => {
    expect(isInviteCodeShape('ABC')).toBe(false);
    expect(isInviteCodeShape('A'.repeat(21))).toBe(false);
    expect(isInviteCodeShape('RED-ROCKS')).toBe(false);
    expect(isInviteCodeShape('BETAMAX')).toBe(false);
    expect(isCustomInviteCode('BETA-AB12-CD34')).toBe(false);
  });

  it('normalizes case and whitespace', () => {
    expect(normalizeInviteCode('  RedRocks ')).toBe('REDROCKS');
    expect(isInviteCodeShape(normalizeInviteCode('redrocks'))).toBe(true);
  });
});
