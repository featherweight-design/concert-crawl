import { describe, expect, it } from 'vitest';
import {
  POSTER_VENUE_LINE_CHARS,
  POSTER_VENUE_LINES,
  QR_QUIET_ZONE,
  inviteStatus,
  isPrintable,
  posterJoinUrl,
  posterTypedUrl,
  posterVenueLine,
  posterVenues,
  qrPath,
  qrSvg,
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

describe('posterVenueLine', () => {
  const venue = (name: string, upcomingCount = 0, featured = false) => ({
    name,
    upcomingCount,
    featured,
  });
  // " · " and the closing "and more" cost the same characters on the sheet.
  const lineChars = (names: string[], more: boolean) =>
    [...names, ...(more ? ['and more'] : [])].join('·  ').length;

  it('keeps every name, with no "and more", when they all fit', () => {
    expect(posterVenueLine([venue('Ogden'), venue('Gothic')])).toEqual({
      names: ['Gothic', 'Ogden'],
      more: false,
    });
  });

  it('orders featured venues first, then the busiest', () => {
    const { names } = posterVenueLine([
      venue('Ace', 1),
      venue('Busy', 50),
      venue('Star', 2, true),
    ]);
    expect(names).toEqual(['Star', 'Busy', 'Ace']);
  });

  it('stops at three lines and leaves room for "and more"', () => {
    const venues = Array.from({ length: 21 }, (_, i) =>
      venue(`Venue Number ${i + 1}`, 21 - i),
    );
    const line = posterVenueLine(venues);
    expect(line.more).toBe(true);
    expect(line.names.length).toBeGreaterThan(0);
    expect(line.names.length).toBeLessThan(21);
    expect(line.names[0]).toBe('Venue Number 1');
    expect(POSTER_VENUE_LINES).toBe(3);
    const budget = POSTER_VENUE_LINE_CHARS * POSTER_VENUE_LINES;
    expect(lineChars(line.names, true)).toBeLessThanOrEqual(budget);
    // One more name would have overflowed.
    const next = venues[line.names.length]?.name ?? '';
    expect(lineChars([...line.names, next], true)).toBeGreaterThan(budget);
  });
});

describe('posterVenues', () => {
  it('keeps only venues with shows coming, the ones being crawled', () => {
    const venues = [
      { name: 'Live', upcomingCount: 4 },
      { name: 'Dark', upcomingCount: 0 },
    ];
    expect(posterVenues(venues).map((venue) => venue.name)).toEqual(['Live']);
  });
});

describe('posterVenueLine with a name longer than the budget', () => {
  it('still names the first venue rather than "and more" alone', () => {
    const venues = [
      { name: 'A'.repeat(40), featured: false, upcomingCount: 2 },
      { name: 'Short', featured: false, upcomingCount: 1 },
    ];
    expect(posterVenueLine(venues, 30)).toEqual({
      names: ['A'.repeat(40)],
      more: true,
    });
  });
});

describe('qrSvg', () => {
  it('is black modules on a white ground, quiet zone inside the viewBox', () => {
    const qr = qrPath('HTTPS://CONCERTCRAWL.APP/I/BETA-AB12-CD34');
    const svg = qrSvg(qr);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain(`viewBox="0 0 ${qr.size} ${qr.size}"`);
    expect(svg).toContain(
      `<rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/>`,
    );
    expect(svg).toContain(`<path d="${qr.path}" fill="#000000"/>`);
    // The quiet zone: no module starts inside the first four columns.
    expect(qr.path).not.toMatch(/M[0-3] /);
  });
});
