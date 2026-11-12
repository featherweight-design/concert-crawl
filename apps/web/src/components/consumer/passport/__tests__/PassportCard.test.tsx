// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PassportCard } from '../PassportCard';
import { passportGlowId } from '../PassportStamp';
import { PP_MODES } from '../definitions/modes';
import { PASSPORT_COPY } from '../definitions/copy';
import { THEMES, THEME_NAMES } from '@/theme/themes';
import type { AttendedShow } from '@/lib/passport/stats';

afterEach(cleanup);

const show = (
  index: number,
  over: Partial<AttendedShow> = {},
): AttendedShow => ({
  id: `show-${index}`,
  artist: `Artist ${index}`,
  venue: `Venue ${index}`,
  venueSlug: `venue-${index}`,
  genre: 'punk',
  date: '2026-03-14',
  priceFinal: 20,
  ...over,
});

const shows = (count: number): AttendedShow[] =>
  Array.from({ length: count }, (_, i) => show(i));

const mount = (
  props: Partial<React.ComponentProps<typeof PassportCard>> = {},
) =>
  render(
    <PassportCard
      mode="share"
      shows={shows(4)}
      tokens={THEMES.electric}
      handle="@huey"
      year={2026}
      {...props}
    />,
  );

describe('<PassportCard /> (#85)', () => {
  it('prints the year alongside the passport eyebrow', () => {
    mount();
    expect(screen.getByText(`${PASSPORT_COPY.eyebrow} · 2026`)).toBeTruthy();
  });

  it('prints the handle it was given', () => {
    mount({ handle: '@huey' });
    expect(screen.getByText('@huey')).toBeTruthy();
  });

  // user_profiles.handle is nullable. The Passport is an account artifact and
  // has no anonymous variant, so it falls back rather than dropping the header.
  it('falls back to @you rather than rendering a nameless passport', () => {
    mount({ handle: null });
    expect(screen.getByText(PASSPORT_COPY.fallbackHandle)).toBeTruthy();
  });

  it('prints the stats derived from the shows, not from props', () => {
    mount({
      shows: [
        show(1, { venue: 'Bluebird', genre: 'punk' }),
        show(2, { venue: 'Bluebird', genre: 'punk' }),
        show(3, { venue: 'Ogden', genre: 'jazz' }),
      ],
    });

    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('punk')).toBeTruthy();
  });

  it('singularises a one-night passport', () => {
    mount({ shows: [show(1)] });
    expect(
      screen.getByText(PASSPORT_COPY.statNight.toUpperCase()),
    ).toBeTruthy();
    expect(
      screen.getByText(PASSPORT_COPY.statVenue.toUpperCase()),
    ).toBeTruthy();
  });

  it('dashes the top genre when nothing is genred', () => {
    mount({ shows: [show(1, { genre: null })] });
    expect(screen.getByText(PASSPORT_COPY.noGenre)).toBeTruthy();
  });

  describe('overflow', () => {
    const capacity = PP_MODES.share.cols * PP_MODES.share.rows;

    it('renders every show and no more-tile at exactly capacity', () => {
      mount({ shows: shows(capacity) });

      expect(screen.getByText(`Artist ${capacity - 1}`)).toBeTruthy();
      expect(screen.queryByText(PASSPORT_COPY.moreTile)).toBeNull();
    });

    // The tile occupies a slot, so the wall surfaces capacity - 1 shows. Off by
    // one here either drops a stamp silently or overflows the grid.
    it('spends the final slot on the tile the moment one show overflows', () => {
      mount({ shows: shows(capacity + 1) });

      expect(screen.getByText(PASSPORT_COPY.moreTile)).toBeTruthy();
      expect(screen.getByText('+2')).toBeTruthy();
      expect(screen.queryByText(`Artist ${capacity - 1}`)).toBeNull();
    });

    it('counts everything the wall could not show', () => {
      mount({ shows: shows(capacity + 10) });
      expect(screen.getByText('+11')).toBeTruthy();
    });

    it('applies the compact grid capacity in compact mode', () => {
      const compactCapacity = PP_MODES.compact.cols * PP_MODES.compact.rows;
      expect(compactCapacity).toBe(9);

      mount({ mode: 'compact', shows: shows(compactCapacity) });
      expect(screen.queryByText(PASSPORT_COPY.moreTile)).toBeNull();

      cleanup();
      mount({ mode: 'compact', shows: shows(compactCapacity + 1) });
      expect(screen.getByText('+2')).toBeTruthy();
    });
  });

  describe('empty passport', () => {
    it('renders rather than throwing when nothing has been attended', () => {
      expect(() => mount({ shows: [] })).not.toThrow();
    });

    it('falls back to the no-history footer with no date to date it from', () => {
      mount({ shows: [] });
      expect(screen.getByText(PASSPORT_COPY.footerNoHistory)).toBeTruthy();
    });
  });

  it('dates the footer from the earliest night, not the newest', () => {
    mount({
      shows: [show(1, { date: '2026-11-30' }), show(2, { date: '2026-03-14' })],
    });

    expect(screen.getByText(/SINCE MAR 2026/)).toBeTruthy();
  });

  describe('nine-theme matrix', () => {
    it.each(THEME_NAMES)('renders %s in both modes', (name) => {
      for (const mode of ['compact', 'share'] as const) {
        expect(() =>
          mount({ mode, tokens: THEMES[name], shows: shows(20) }),
        ).not.toThrow();
        cleanup();
      }
    });
  });

  // B+ addendum 3 rule 4 (question 25: "the PNG share card too"): the wall is
  // the shared round stamp in the venue's colours, drawn as `04/one-stamp-m`.
  describe('venue stamps', () => {
    const CHURCH = 'the-church-nightclub';
    const stampOf = (container: HTMLElement, id: string): Element => {
      const stamp = container.querySelector(`[data-passport-stamp="${id}"]`);
      if (!stamp) throw new Error(`no stamp for ${id}`);
      return stamp;
    };

    it('gives two artists at one venue the same colours, whoever played', () => {
      const { container } = mount({
        shows: [
          show(1, { artist: 'TOKiMONSTA', venueSlug: CHURCH }),
          show(2, { artist: 'Khruangbin', venueSlug: CHURCH }),
        ],
      });
      const paints = ['show-1', 'show-2'].map((id) => {
        const stamp = stampOf(container, id);
        return {
          ring: stamp
            .querySelector('[data-passport-stamp-ring]')
            ?.getAttribute('stroke'),
          glyph: stamp
            .querySelector('[data-passport-stamp-glyph] > g')
            ?.getAttribute('stroke'),
        };
      });
      // The Church on the boards: rings #FF6B8A (`to`), glyph #A075FF (`from`).
      expect(paints[0]).toEqual({ ring: '#FF6B8A', glyph: '#A075FF' });
      expect(paints[1]).toEqual(paints[0]);
    });

    it("draws the board's round double ring, the bare glyph and the glow", () => {
      const { container } = mount({
        shows: [show(1, { venueSlug: CHURCH })],
      });
      const stamp = stampOf(container, 'show-1');
      const svg = stamp.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 58 58');
      const outer = stamp.querySelector('[data-passport-stamp-ring]');
      expect(outer?.getAttribute('r')).toBe('27.5');
      expect(outer?.getAttribute('stroke-width')).toBe('2');
      expect(outer?.getAttribute('fill')).toBe('none');
      expect(outer?.getAttribute('stroke-dasharray')).toBeNull();
      const inner = stamp.querySelector('[data-passport-stamp-inner-ring]');
      expect(inner?.getAttribute('r')).toBe('23');
      expect(inner?.getAttribute('stroke-width')).toBe('0.9');
      expect(inner?.getAttribute('stroke-dasharray')).toBe('2.5 2.5');
      expect(inner?.getAttribute('fill')).toBe('none');
      const glyph = stamp.querySelector('[data-passport-stamp-glyph]');
      expect(glyph?.getAttribute('data-passport-stamp-glyph')).toBe('church');
      // The glyph at 40% of the stamp (23.2 of 58), centred.
      const [tx, ty, sc] = (glyph?.getAttribute('transform') ?? '')
        .match(/-?[\d.]+/g)
        ?.map(Number) ?? [NaN, NaN, NaN];
      expect(tx).toBeCloseTo(17.4);
      expect(ty).toBeCloseTo(17.4);
      expect(sc).toBeCloseTo(23.2 / 24);
      expect(
        glyph?.querySelector(':scope > g')?.getAttribute('stroke-width'),
      ).toBe('1.8');
      const shadow = stamp.querySelector('feDropShadow');
      expect(shadow?.getAttribute('flood-color')).toBe('#FF6B8A');
      expect(shadow?.getAttribute('flood-opacity')).toBe('0.3');
    });

    // Stripping unsafe characters made `a.b` and `ab` share one filter id, so
    // one stamp drew with the other's glow colour.
    it('gives two ids that differ only in stripped characters distinct glows', () => {
      expect(passportGlowId('a.b')).not.toBe(passportGlowId('ab'));
      expect(passportGlowId('a b')).not.toBe(passportGlowId('a_b'));
      expect(passportGlowId('show-1')).toBe(passportGlowId('show-1'));
      expect(passportGlowId('a.b')).toMatch(/^[A-Za-z][\w-]*$/);
      const { container } = mount({
        shows: [
          show(1, { id: 'x.1', venueSlug: CHURCH }),
          show(2, { id: 'x1', venueSlug: 'bluebird-theater' }),
        ],
      });
      const ids = [...container.querySelectorAll('filter')].map((el) => el.id);
      expect(new Set(ids).size).toBe(2);
    });

    // Only the face changed: the tile keeps the card's slot, and the round
    // stamp sits centred inside it.
    it("keeps the card's slot and puts the round face inside it", () => {
      const cfg = PP_MODES.share;
      const wallWidth = cfg.width - cfg.pad * 2;
      const tileWidth = (wallWidth - cfg.gap * (cfg.cols - 1)) / cfg.cols;
      const { container } = mount({ shows: [show(1, { venueSlug: CHURCH })] });
      const tile = stampOf(container, 'show-1');
      if (!(tile instanceof HTMLElement)) throw new Error('tile is not html');
      expect(parseFloat(tile.style.width)).toBeCloseTo(tileWidth);
      expect(tile.style.borderRadius).toBe(`${cfg.stampRadius}px`);
      const face = tile.querySelector<HTMLElement>(
        '[data-passport-stamp-face]',
      );
      const tileHeight = parseFloat(tile.style.height);
      expect(parseFloat(face?.style.width ?? '')).toBeCloseTo(
        Math.min(tileWidth, tileHeight) * 0.6,
      );
      expect(tile.textContent).toContain('Artist 1');
      expect(tile.textContent).toContain('MAR');
    });

    it('is straight on the share card, never tilted', () => {
      const { container } = mount({ shows: shows(4) });
      for (const stamp of container.querySelectorAll('[data-passport-stamp]')) {
        expect(stamp.getAttribute('style') ?? '').not.toMatch(/rotate/);
      }
    });

    it('falls back to the venue art inside the rings for a venue with no glyph', () => {
      const { container } = mount({
        shows: [show(1, { venueSlug: 'no-such-venue' })],
      });
      const stamp = stampOf(container, 'show-1');
      expect(stamp.querySelector('[data-passport-stamp-glyph]')).toBeNull();
      expect(
        stamp.querySelector('[data-passport-stamp-fallback]'),
      ).not.toBeNull();
    });
  });

  // Satori implements neither, and a print card that silently relies on them
  // renders an unreadable bottom panel over a bright stamp.
  describe('print safety', () => {
    it('uses no backdropFilter or maskImage in share mode', () => {
      const { container } = mount({ mode: 'share' });
      const html = container.innerHTML;

      expect(html).not.toContain('backdrop-filter');
      expect(html).not.toContain('mask-image');
    });

    it('still uses the real glass treatment on screen', () => {
      const { container } = mount({ mode: 'compact' });
      const html = container.innerHTML;

      expect(html).toContain('backdrop-filter');
      expect(html).toContain('mask-image');
    });
  });
});
