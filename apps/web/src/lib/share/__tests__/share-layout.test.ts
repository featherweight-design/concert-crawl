import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  dateStackCapGaps,
  SQUARE_DATE_STACK,
} from '@/components/consumer/share/definitions/ratios';
import {
  estimatedLineWidth,
  fitLine,
  fitLineSize,
  graphemes,
  SHARE_GENRE_HEX,
  shareChip,
  shareCountdown,
  shareDateParts,
  shareMetaLines,
  sharePhotoSources,
  storyNameText,
  toShareCard,
  venueDateOf,
} from '@/lib/share/share-layout';
import {
  SHARE_CACHE_CONTROL,
  SHARE_FALLBACK_CACHE_CONTROL,
  secondsUntilLocalMidnight,
  shareCacheControl,
} from '@/lib/share/share-request';

const TZ = 'America/Denver';

describe('shareCountdown', () => {
  it.each([
    ['2026-11-13', '4 DAYS AWAY'],
    ['2026-11-11', '2 DAYS AWAY'],
    ['2026-11-10', 'TOMORROW'],
    ['2026-11-09', 'TODAY'],
  ])('%s from Nov 9 reads %s', (date, label) => {
    expect(shareCountdown(date, '2026-11-09', 'upcoming')).toBe(label);
  });

  it('draws nothing for a past show', () => {
    expect(shareCountdown('2026-11-08', '2026-11-09', 'upcoming')).toBeNull();
  });

  it('draws nothing when the date is in doubt', () => {
    expect(shareCountdown('2026-11-13', '2026-11-09', 'cancelled')).toBeNull();
    expect(shareCountdown('2026-11-13', '2026-11-09', 'postponed')).toBeNull();
  });
});

describe('shareDateParts', () => {
  it('splits the date block as drawn: FRI / 13 / NOV', () => {
    expect(shareDateParts('2026-11-13', TZ)).toEqual({
      weekday: 'FRI',
      month: 'NOV',
      day: '13',
    });
  });
});

describe('shareMetaLines', () => {
  const source = {
    date: { weekday: 'FRI', month: 'NOV', day: '13' },
    showTime: '9:00 PM',
    venue: 'The Church',
    city: 'Denver',
  };

  it('sets Story and Wide on two lines', () => {
    const lines = ['FRI NOV 13 · 9:00 PM', 'THE CHURCH · DENVER'];
    expect(shareMetaLines(source, 'story')).toEqual(lines);
    expect(shareMetaLines(source, 'link')).toEqual(lines);
  });

  it('runs Square on one line', () => {
    expect(shareMetaLines(source, 'square')).toEqual([
      'FRI NOV 13 · 9:00 PM · THE CHURCH · DENVER',
    ]);
  });

  it('drops an unpublished time instead of printing a placeholder', () => {
    expect(shareMetaLines({ ...source, showTime: null }, 'square')).toEqual([
      'FRI NOV 13 · THE CHURCH · DENVER',
    ]);
  });
});

describe('shareChip', () => {
  it('labels the lead genre in caps with its bucket colour and glow', () => {
    expect(shareChip(['house', 'pop'])).toEqual({
      label: 'HOUSE',
      dot: SHARE_GENRE_HEX.electronic,
      glow: true,
    });
  });

  it('gives an unbucketed genre the neutral dot and no glow', () => {
    expect(shareChip(['zydeco'])).toEqual({
      label: 'ZYDECO',
      dot: '#5a6788',
      glow: false,
    });
  });

  it('draws no chip for a show with no genre', () => {
    expect(shareChip(null)).toBeNull();
    expect(shareChip([])).toBeNull();
    expect(shareChip(['  '])).toBeNull();
  });

  // satori cannot read var(--genre-*), so the table copies globals.css. This
  // pins the copy to the dark-ground source of truth.
  it('matches every dark-ground genre token in globals.css', () => {
    const css = readFileSync(
      path.resolve(__dirname, '../../../app/globals.css'),
      'utf8',
    );
    for (const [bucket, hex] of Object.entries(SHARE_GENRE_HEX)) {
      expect(css).toContain(`--genre-${bucket}: ${hex};`);
    }
  });
});

describe('sharePhotoSources (the IdentityArt fallback chain)', () => {
  it('tries the event artwork, then the artist photo', () => {
    expect(
      sharePhotoSources({
        imageUrl: 'https://a/1.jpg',
        artistPhotoUrl: 'https://b/2.jpg',
      }),
    ).toEqual(['https://a/1.jpg', 'https://b/2.jpg']);
  });

  it('is empty with neither, so IdentityArt draws', () => {
    expect(sharePhotoSources({ imageUrl: null, artistPhotoUrl: '' })).toEqual(
      [],
    );
    expect(sharePhotoSources({})).toEqual([]);
  });
});

describe('name fitting', () => {
  it('breaks a too-wide Story word where its case turns, as drawn', () => {
    expect(storyNameText('TOKiMONSTA', 140, 936)).toBe('TOKi MONSTA');
  });

  it('leaves a Story name alone when it fits', () => {
    expect(storyNameText('TOKiMONSTA', 80, 936)).toBe('TOKiMONSTA');
    expect(storyNameText('King Gizzard', 140, 936)).toBe('King Gizzard');
  });

  it('keeps a short one-line name at full size and shrinks a long one to the floor', () => {
    expect(fitLineSize('IDLES', 122, 936, 72)).toBe(122);
    const long = fitLineSize('Thee Oh Sees and Friends', 122, 936, 72);
    expect(long).toBeLessThan(122);
    expect(long).toBeGreaterThanOrEqual(72);
    expect(fitLineSize('A'.repeat(200), 122, 936, 72)).toBe(72);
  });
});

describe('fitLine (Square and Wide one-line name)', () => {
  // The Square text box: 1080 minus 72 each side.
  const SQUARE_WIDTH = 936;

  it('keeps a name that fits whole', () => {
    expect(fitLine('IDLES', 122, SQUARE_WIDTH, 72)).toEqual({
      size: 122,
      text: 'IDLES',
    });
  });

  it('cuts a name too long at the floor, and the cut text with its ellipsis fits', () => {
    const { size, text } = fitLine(
      'Tommy Cash and the Lowrider Orchestra',
      122,
      SQUARE_WIDTH,
      72,
    );
    expect(size).toBe(72);
    expect(text.endsWith('…')).toBe(true);
    expect(text.startsWith('Tommy C')).toBe(true);
    expect(estimatedLineWidth(text, size)).toBeLessThanOrEqual(SQUARE_WIDTH);
  });
});

describe('fitLine at grapheme boundaries', () => {
  // At the 72px floor the 936px box keeps 17 graphemes before the ellipsis.
  const pad = 'A'.repeat(16);

  it('handles an empty name', () => {
    expect(fitLine('', 122, 936, 72)).toEqual({ size: 122, text: '' });
    expect(fitLine('   ', 122, 936, 72)).toEqual({ size: 122, text: '' });
  });

  it.each([
    ['a flag', '🇺🇸'],
    ['a ZWJ sequence', '👩‍🎤'],
    ['an astral emoji', '🎸'],
  ])('never cuts inside %s at the cut point', (_label, glyph) => {
    const { text } = fitLine(`${pad}${glyph}${'B'.repeat(30)}`, 122, 936, 72);
    expect(text).toBe(`${pad}${glyph}…`);
  });

  it('counts a grapheme as one character when sizing', () => {
    expect(graphemes('🇺🇸👩‍🎤x')).toHaveLength(3);
    expect(fitLineSize('🇺🇸'.repeat(5), 122, 936, 72)).toBe(
      fitLineSize('AAAAA', 122, 936, 72),
    );
  });
});

describe('Square date stack (FRI / 13 / NOV)', () => {
  it('sits the number with the same gap above and below, as drawn', () => {
    const { above, below } = dateStackCapGaps();
    expect(Math.abs(above - below)).toBeLessThanOrEqual(2);
    // The board's gap is ~28px at 1080.
    expect(above).toBeGreaterThan(24);
    expect(above).toBeLessThan(32);
  });

  it('pins the board-measured stack', () => {
    expect(SQUARE_DATE_STACK).toEqual({
      top: 92,
      right: 66,
      label: 34,
      day: 200,
      dayGap: -9,
      monthGap: -10,
    });
  });
});

describe('toShareCard', () => {
  it('maps an event onto exactly what the card draws', () => {
    expect(
      toShareCard(
        {
          artist: 'TOKiMONSTA',
          date: '2026-11-13',
          showTime: '21:00:00',
          venue: { name: 'The Church', city: 'Denver', timezone: TZ },
          genre: ['electronic'],
          status: 'upcoming',
        },
        '2026-11-09',
      ),
    ).toEqual({
      artist: 'TOKiMONSTA',
      date: { weekday: 'FRI', month: 'NOV', day: '13' },
      showTime: '9:00 PM',
      venue: 'The Church',
      city: 'Denver',
      chip: { label: 'ELECTRONIC', dot: '#7ae6ff', glow: true },
      countdown: '4 DAYS AWAY',
    });
  });
});

describe('shareCacheControl (the day count is part of the cache life)', () => {
  // 22:00 MST on Nov 9 = 05:00Z Nov 10: two hours to the venue's midnight.
  const now = new Date('2026-11-10T05:00:00Z');

  it('counts down to the venue’s midnight, not UTC’s', () => {
    expect(secondsUntilLocalMidnight(now, TZ)).toBe(7200);
  });

  it('expires a countdown card at that midnight, with no stale serve', () => {
    expect(shareCacheControl('4 DAYS AWAY', TZ, now)).toBe(
      'public, max-age=3600, s-maxage=7200',
    );
  });

  // A 23-hour day: 01:30 MST on 2026-03-08 is 21.5 real hours from midnight.
  it('measures a spring-forward day in real time', () => {
    expect(
      secondsUntilLocalMidnight(new Date('2026-03-08T08:30:00Z'), TZ),
    ).toBe(77_400);
  });

  // A 25-hour day: 01:30 MDT (the first one) on 2026-11-01 is 23.5 hours out.
  it('measures a fall-back day in real time', () => {
    expect(
      secondsUntilLocalMidnight(new Date('2026-11-01T07:30:00Z'), TZ),
    ).toBe(84_600);
  });

  it('never overshoots the midnight it counts to', () => {
    const lastSecond = new Date('2026-11-10T06:59:59Z');
    expect(secondsUntilLocalMidnight(lastSecond, TZ)).toBe(1);
    expect(shareCacheControl('TODAY', TZ, lastSecond)).toBe(
      'public, max-age=1, s-maxage=1',
    );
  });

  it('keeps the locked header for a card with no countdown', () => {
    expect(shareCacheControl(null, TZ, now)).toBe(SHARE_CACHE_CONTROL);
  });

  it('holds a card whose photo failed for a minute only', () => {
    expect(shareCacheControl(null, TZ, now, true)).toBe(
      SHARE_FALLBACK_CACHE_CONTROL,
    );
    expect(shareCacheControl('4 DAYS AWAY', TZ, now, true)).toBe(
      'public, max-age=60, s-maxage=60',
    );
  });

  it('never lets a fallback countdown card outlive midnight either', () => {
    const lastSecond = new Date('2026-11-10T06:59:59Z');
    expect(shareCacheControl('TODAY', TZ, lastSecond, true)).toBe(
      'public, max-age=1, s-maxage=1',
    );
  });

  it('reads the venue date from the same instant as the cache life', () => {
    expect(venueDateOf(new Date('2026-11-10T06:59:59Z'), TZ)).toBe(
      '2026-11-09',
    );
    expect(venueDateOf(new Date('2026-11-10T07:00:00Z'), TZ)).toBe(
      '2026-11-10',
    );
  });
});
