import { describe, expect, it } from 'vitest';
import { VENUE_SLUG_GLYPHS } from '@/components/consumer/venue-glyph';
import {
  STAMP_ACCENTS,
  passportHandle,
  passportRotation,
  stampColorsFor,
  stampDateParts,
  stampGlowFor,
} from '../stamp';

// B+ addendum 3 rule 4: a stamp is in its venue's colours. The values are the
// boards' own (`one-stamp-m`, `concerts-round-stamps-*`, `passport-*`): ring and
// text in the venue's `to`, glyph in its `from`, pure hex.
describe('stampColorsFor', () => {
  it.each([
    ['bluebird-theater', '#4DA3FF', '#7AE6FF'],
    ['mission-ballroom', '#A075FF', '#7AE6FF'],
    ['ball-arena', '#7AE6FF', '#4DA3FF'],
    ['cervantes-masterpiece-ballroom', '#FFB838', '#FF6A3D'],
    ['gothic-theatre', '#FFE36B', '#FFB838'],
  ])('draws %s with the board ring %s and glyph %s', (slug, ring, glyph) => {
    expect(stampColorsFor(slug)).toEqual({ ring, glyph });
  });

  it('never mixes the venue colour toward the theme text', () => {
    for (const slug of Object.keys(VENUE_SLUG_GLYPHS)) {
      const { ring, glyph } = stampColorsFor(slug);
      expect(ring).toMatch(/^#[0-9A-F]{6}$/);
      expect(glyph).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('gives a venue with no glyph one stable palette accent for ring and glyph', () => {
    const colors = stampColorsFor('the-velvet-room');
    expect(STAMP_ACCENTS).toContain(colors.ring);
    expect(colors.glyph).toBe(colors.ring);
    expect(stampColorsFor('the-velvet-room')).toEqual(colors);
  });
});

describe('stampGlowFor', () => {
  it('glows in the ring colour at 30%', () => {
    expect(stampGlowFor('#4DA3FF', 5)).toBe('drop-shadow(0 0 5px #4DA3FF4D)');
  });
});

describe('stampDateParts', () => {
  // The punch is the event's own calendar day, so the month and the day can
  // never disagree the way the prototype's did (it took the month in Denver and
  // the day from getUTCDate()). The UTC-noon anchor is what holds this on the
  // last day of a month, where a midnight anchor slips back one in Mountain.
  it('punches the last day of a month without slipping to the previous one', () => {
    expect(stampDateParts('2026-02-28')).toEqual({ month: 'FEB', day: '28' });
  });

  it('punches the first day of a month without slipping either', () => {
    expect(stampDateParts('2026-03-01')).toEqual({ month: 'MAR', day: '01' });
  });

  it('reads an ordinary date the obvious way', () => {
    expect(stampDateParts('2026-03-14')).toEqual({ month: 'MAR', day: '14' });
  });

  it('zero-pads a single-digit day so the punch stays two rows', () => {
    expect(stampDateParts('2026-01-05')?.day).toBe('05');
  });

  it('handles a DST-inactive month identically', () => {
    expect(stampDateParts('2026-12-31')).toEqual({ month: 'DEC', day: '31' });
  });

  // A stamp is one tile of sixteen; an unparseable date drops the punch rather
  // than throwing and losing the whole card.
  it('returns null for a date it cannot parse', () => {
    expect(stampDateParts('not a date')).toBeNull();
  });
});

describe('passportRotation', () => {
  it('gives the same show the same tilt every time', () => {
    expect(passportRotation('show-abc')).toBe(passportRotation('show-abc'));
  });

  // The prototype's signed modulo pushed about half of all ids to −6.6°, so
  // the wall leaned one way. The bound is what keeps that from coming back.
  it('stays inside the ±2.2° the design allows, in both directions', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `show-${i}`);
    for (const id of [...ids, 'a', 'more-tile', '11111111-2222-4333']) {
      expect(Math.abs(passportRotation(id))).toBeLessThanOrEqual(2.2);
    }
  });

  it('tilts shows both ways rather than only one', () => {
    const tilts = Array.from({ length: 200 }, (_, i) =>
      passportRotation(`show-${i}`),
    );
    expect(tilts.some((tilt) => tilt > 0)).toBe(true);
    expect(tilts.some((tilt) => tilt < 0)).toBe(true);
  });

  it('does not tilt every show the same way', () => {
    const tilts = new Set(
      ['one', 'two', 'three', 'four', 'five'].map(passportRotation),
    );
    expect(tilts.size).toBeGreaterThan(1);
  });
});

describe('passportHandle', () => {
  // user_profiles.handle is nullable and the prototype called .replace() on it
  // unguarded — a real production crash, not a fixture gap.
  it('falls back rather than throwing when no handle exists', () => {
    expect(passportHandle(null)).toBe('@you');
    expect(passportHandle(undefined)).toBe('@you');
  });

  it('treats a blank handle as absent', () => {
    expect(passportHandle('   ')).toBe('@you');
    expect(passportHandle('@')).toBe('@you');
  });

  it('adds the @ that the stored handle does not carry', () => {
    expect(passportHandle('huey')).toBe('@huey');
  });

  it('does not double the @ on a handle that already has one', () => {
    expect(passportHandle('@huey')).toBe('@huey');
  });
});
