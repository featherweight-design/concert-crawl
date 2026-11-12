import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  RESTORE_TTL_MS,
  signRestoreToken,
  verifyRestoreToken,
} from './attendance-restore.js';

const claim = {
  userId: 'user_1',
  eventId: '5eeded00-0000-0000-0000-000000000001',
  attendingAt: '2026-04-02T01:02:03.456Z',
};

describe('attendance restore token', () => {
  const original = process.env['INTERNAL_API_SECRET'];
  beforeEach(() => {
    process.env['INTERNAL_API_SECRET'] = 'test-secret';
  });
  afterEach(() => {
    if (original === undefined) delete process.env['INTERNAL_API_SECRET'];
    else process.env['INTERNAL_API_SECRET'] = original;
  });

  it('round-trips', () => {
    const token = signRestoreToken(claim);
    expect(token).not.toBeNull();
    expect(verifyRestoreToken({ ...claim, token: token ?? '' })).toBe(true);
  });

  it.each([
    ['another user', { userId: 'user_2' }],
    ['another event', { eventId: '5eeded00-0000-0000-0000-000000000002' }],
    ['another attendingAt', { attendingAt: '2026-04-02T01:02:03.457Z' }],
  ])('rejects %s', (_label, override) => {
    const token = signRestoreToken(claim) ?? '';
    expect(verifyRestoreToken({ ...claim, ...override, token })).toBe(false);
  });

  it('rejects an expired token and accepts one at the edge', () => {
    const now = 1_000_000;
    const token = signRestoreToken({ ...claim, now }) ?? '';
    expect(
      verifyRestoreToken({ ...claim, token, now: now + RESTORE_TTL_MS }),
    ).toBe(true);
    expect(
      verifyRestoreToken({ ...claim, token, now: now + RESTORE_TTL_MS + 1 }),
    ).toBe(false);
  });

  it('rejects a token whose expiry was edited', () => {
    const token = signRestoreToken(claim) ?? '';
    const [, sig] = token.split('.');
    const forged = `${String(Date.now() + 10 * RESTORE_TTL_MS)}.${sig ?? ''}`;
    expect(verifyRestoreToken({ ...claim, token: forged })).toBe(false);
  });

  it.each(['', 'abc', '.', '1.2.3', 'x.y', '99999999999999999.zz'])(
    'rejects malformed %j without throwing',
    (token) => {
      expect(verifyRestoreToken({ ...claim, token })).toBe(false);
    },
  );

  it('signs nothing, and verifies nothing, with the secret unset', () => {
    const token = signRestoreToken(claim) ?? '';
    delete process.env['INTERNAL_API_SECRET'];
    expect(signRestoreToken(claim)).toBeNull();
    expect(verifyRestoreToken({ ...claim, token })).toBe(false);
  });
});
