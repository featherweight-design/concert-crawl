import { describe, expect, it } from 'vitest';
import {
  QR_QUIET_ZONE,
  inviteStatus,
  isPrintable,
  posterJoinUrl,
  posterTypedUrl,
  qrPath,
  seatsTaken,
} from './poster-rule';

const NOW = new Date('2026-11-10T12:00:00Z');
const open = {
  revokedAt: null,
  expiresAt: null,
  maxUses: 50,
  useCount: 0,
  usedBy: null,
  usedAt: null,
};

describe('posterJoinUrl', () => {
  it('encodes the all-caps short link, which the proxy sends to the invite screen', () => {
    expect(posterJoinUrl('https://concertcrawl.app', 'BETA-AB12-CD34')).toBe(
      'HTTPS://CONCERTCRAWL.APP/I/BETA-AB12-CD34',
    );
  });
});

describe('posterTypedUrl', () => {
  it('drops the scheme so it can be typed', () => {
    expect(posterTypedUrl('https://concertcrawl.app')).toBe(
      'concertcrawl.app/i',
    );
  });
});

describe('qrPath', () => {
  it('draws only whole modules inside a square that includes the quiet zone', () => {
    const { size, path } = qrPath(
      posterJoinUrl('https://concertcrawl.app', 'BETA-AB12-CD34'),
    );
    // A QR symbol is 21 + 4k modules a side; the quiet zone adds four each side.
    const symbol = size - 2 * QR_QUIET_ZONE;
    expect(symbol).toBeGreaterThanOrEqual(21);
    expect((symbol - 21) % 4).toBe(0);
    const cells = [...path.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.map((cell) => cell[0]).join('')).toBe(path);
    for (const [, x, y] of cells) {
      for (const coord of [Number(x), Number(y)]) {
        expect(coord).toBeGreaterThanOrEqual(QR_QUIET_ZONE);
        expect(coord).toBeLessThan(size - QR_QUIET_ZONE);
      }
    }
  });

  // The handoff's scan test (8 of 8 at 6 ft) assumes a version 3 symbol: the
  // alphanumeric short link at ECC Q fits in 29 modules plus the quiet zone.
  it('fits the example poster link in a 29-module symbol with a 4-module quiet zone', () => {
    const { size } = qrPath(
      posterJoinUrl('https://concertcrawl.app', 'BETA-AB12-CD34'),
    );
    expect(QR_QUIET_ZONE).toBe(4);
    expect(size - 2 * QR_QUIET_ZONE).toBe(29);
  });

  it('draws the same code for the same text', () => {
    expect(qrPath('a')).toEqual(qrPath('a'));
  });
});

describe('seatsTaken', () => {
  it('counts a first redemption that left useCount behind', () => {
    expect(seatsTaken({ useCount: 0, usedBy: 'user_1', usedAt: null })).toBe(1);
    expect(
      seatsTaken({ useCount: 0, usedBy: null, usedAt: '2026-11-01' }),
    ).toBe(1);
    expect(
      seatsTaken({ useCount: 7, usedBy: 'user_1', usedAt: '2026-11-01' }),
    ).toBe(7);
    expect(seatsTaken({ useCount: 0, usedBy: null, usedAt: null })).toBe(0);
  });
});

describe('inviteStatus', () => {
  it('reads revoked before full, and full before expired', () => {
    expect(
      inviteStatus({ ...open, revokedAt: '2026-11-01', useCount: 50 }, NOW),
    ).toBe('revoked');
    expect(
      inviteStatus({ ...open, useCount: 50, expiresAt: '2026-01-01' }, NOW),
    ).toBe('redeemed');
    expect(inviteStatus({ ...open, expiresAt: NOW.toISOString() }, NOW)).toBe(
      'expired',
    );
    expect(inviteStatus(open, NOW)).toBe('active');
  });
});

describe('isPrintable', () => {
  it('never prints a personal code, which the first scan would spend', () => {
    expect(isPrintable({ ...open, maxUses: 1 }, NOW)).toBe(false);
  });

  it('prints a code with a seat left', () => {
    expect(isPrintable(open, NOW)).toBe(true);
    expect(isPrintable({ ...open, useCount: 49, usedBy: 'u' }, NOW)).toBe(true);
  });

  it('refuses a revoked, expired or full code', () => {
    expect(isPrintable({ ...open, revokedAt: '2026-11-01' }, NOW)).toBe(false);
    expect(
      isPrintable({ ...open, expiresAt: '2026-11-09T00:00:00Z' }, NOW),
    ).toBe(false);
    expect(isPrintable({ ...open, useCount: 50 }, NOW)).toBe(false);
    expect(isPrintable({ ...open, maxUses: 1, usedBy: 'user_1' }, NOW)).toBe(
      false,
    );
  });
});
