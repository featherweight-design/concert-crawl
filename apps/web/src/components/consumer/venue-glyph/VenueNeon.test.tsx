// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { VENUE_GLYPHS, VENUE_GLYPH_KEYS } from './definitions/glyphs';
import { VENUE_SLUG_GLYPHS } from './definitions/venue-glyph-keys';
import { VENUE_NEON } from './definitions/venue-neon';
import { VenueNeonArt } from './VenueNeonArt';
import { VenueTile } from './VenueTile';

/** The colours the neon glyph's own shapes paint, stroke and fill. */
function glyphColours(container: HTMLElement): Set<string> {
  const colours = new Set<string>();
  const shapes = container.querySelectorAll(
    'svg[data-venue-glyph] g[filter] path, svg[data-venue-glyph] g[filter] circle',
  );
  for (const shape of shapes) {
    for (const name of ['stroke', 'fill'] as const) {
      const value = shape.getAttribute(name);
      if (value !== null && value !== 'none') colours.add(value);
    }
  }
  return colours;
}

function strokeColours(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll(
      'svg[data-venue-glyph] g[filter] path, svg[data-venue-glyph] g[filter] circle',
    ),
  ]
    .map((shape) => shape.getAttribute('stroke'))
    .filter((value): value is string => value !== null && value !== 'none');
}

describe('VENUE_NEON', () => {
  it.each(VENUE_GLYPH_KEYS)(
    '%s has a colour for every shape and at least two colours',
    (key) => {
      const { shapeColors, fillColor } = VENUE_NEON[key];
      expect(shapeColors).toHaveLength(VENUE_GLYPHS[key].shapes.length);
      for (const colour of [
        ...shapeColors,
        ...(fillColor === undefined ? [] : [fillColor]),
      ]) {
        expect(colour).toMatch(/^#[0-9A-F]{6}$/);
      }
      // No venue's own source is single-colour: Bluebird is a blue fill under
      // a cyan outline, every other venue strokes in two to four colours.
      expect(
        new Set([...shapeColors, ...(fillColor ? [fillColor] : [])]).size,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  it('gives a filled shape a fill colour', () => {
    for (const key of VENUE_GLYPH_KEYS) {
      const filled = VENUE_GLYPHS[key].shapes.some(
        (shape) => shape.kind === 'path' && shape.filled,
      );
      expect(VENUE_NEON[key].fillColor !== undefined).toBe(filled);
    }
  });
});

describe('the neon hero', () => {
  it.each(VENUE_GLYPH_KEYS)(
    '%s strokes every shape in its own colour with no gradient left',
    (key) => {
      const { container } = render(
        <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
      );
      const group = container.querySelector(
        'svg[data-venue-glyph] g[filter] g',
      );
      expect(group?.getAttribute('stroke')).toBe('none');
      const shapes = container.querySelectorAll(
        'svg[data-venue-glyph] g[filter] path, svg[data-venue-glyph] g[filter] circle',
      );
      expect(shapes).toHaveLength(VENUE_GLYPHS[key].shapes.length);
      expect(strokeColours(container)).toEqual(VENUE_NEON[key].shapeColors);
      // No shape paints a gradient: the only gradients left are the ground's.
      expect(
        container.querySelector('svg[data-venue-glyph] linearGradient'),
      ).toBeNull();
      expect(
        container.querySelector(
          'svg[data-venue-glyph] g[filter] [stroke^="url("], svg[data-venue-glyph] g[filter] [fill^="url("]',
        ),
      ).toBeNull();
      expect(glyphColours(container).size).toBeGreaterThanOrEqual(2);
    },
  );

  it('draws Red Rocks in yellow, orange-red and violet', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="redrocks" glyphSize={163} glyphSizeSm={196} />,
    );
    const strokes = strokeColours(container);
    expect(strokes).toEqual([
      '#FFB838', // fwd-allow-hex: board art colour
      '#FF6A3D', // fwd-allow-hex: board art colour
      '#A075FF', // fwd-allow-hex: board art colour
      '#FFE36B', // fwd-allow-hex: board art colour
    ]);
  });

  it('draws Bluebird as a blue fill under a cyan outline', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="bluebird" glyphSize={163} glyphSizeSm={196} />,
    );
    const bird = container.querySelector('svg[data-venue-glyph] path');
    expect(bird?.getAttribute('fill')).toBe('#4DA3FF'); // fwd-allow-hex: board art colour
    expect(bird?.getAttribute('stroke')).toBe('#7AE6FF'); // fwd-allow-hex: board art colour
    expect(bird?.getAttribute('fill-opacity')).toBe('0.3');
  });
});

/**
 * The handoff's own hero markup for a venue, the source of every neon colour.
 *
 * Brittle on purpose: it reads `design/design_handoff_bplus_redesign` from the
 * repo checkout by a path relative to this file, and the patterns below match
 * the handoff's generated markup attribute for attribute. A moved folder or a
 * re-exported hero fails these tests with the message below, naming the file
 * and the pattern, rather than a bare ENOENT or a null dereference. Update the
 * patterns with the handoff; do not delete the tests, they are the proof that
 * the live colours are the boards'.
 */
function heroSource(key: string): string {
  const file = path.resolve(
    __dirname,
    '../../../../../../design/design_handoff_bplus_redesign/assets/venues',
    `${key}-hero.html`,
  );
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(
      `Cannot read the ${key} hero board source at ${file}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/** A pattern's match in a venue's hero source, or an error saying what is missing. */
function heroMatch(
  key: string,
  pattern: RegExp,
  what: string,
): RegExpExecArray {
  const match = pattern.exec(heroSource(key));
  if (match === null) {
    throw new Error(
      `The ${key} hero board source (${key}-hero.html) has no ${what}; the pattern ${pattern} no longer matches the handoff's markup`,
    );
  }
  return match;
}

describe('the neon colours match the handoff hero HTML', () => {
  it.each(VENUE_GLYPH_KEYS)('%s halo discs', (key) => {
    const match = heroMatch(
      key,
      /<circle cx="200" cy="200" r="210" fill="(#[0-9A-Fa-f]{6})" opacity="0\.10"\/><circle cx="200" cy="200" r="130" fill="(#[0-9A-Fa-f]{6})" opacity="0\.10"\/>/,
      'halo disc pair',
    );
    expect(VENUE_NEON[key].halo).toEqual({
      outer: match[1]!.toUpperCase(),
      inner: match[2]!.toUpperCase(),
    });
    const { container } = render(
      <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
    );
    const outer = container.querySelector('[data-venue-halo="outer"]');
    const inner = container.querySelector('[data-venue-halo="inner"]');
    expect(outer?.getAttribute('fill')).toBe(match[1]!.toUpperCase());
    expect(inner?.getAttribute('fill')).toBe(match[2]!.toUpperCase());
    // The board's disc opacity and the live sizes (r210 and r130 of 420).
    expect(outer?.getAttribute('fill-opacity')).toBe('0.1');
    expect(inner?.getAttribute('fill-opacity')).toBe('0.1');
    expect(outer?.getAttribute('r')).toBe('14');
    expect(inner?.getAttribute('r')).toBe('8.67');
  });

  it.each(VENUE_GLYPH_KEYS.filter((key) => key !== 'bluebird'))(
    '%s strokes',
    (key) => {
      const group = heroMatch(
        key,
        /<g transform="translate\(20 20\) scale\(15\.0\)">([\s\S]*?)<\/g>/,
        'glyph group',
      );
      const strokes = [
        ...group[1]!.matchAll(/stroke="(#[0-9A-Fa-f]{6})"/g),
      ].map((match) => match[1]!.toUpperCase());
      expect(VENUE_NEON[key].shapeColors).toEqual(strokes);
    },
  );

  it('bluebird fill and outline', () => {
    const match = heroMatch(
      'bluebird',
      /<path d="[^"]*" fill="(#[0-9A-Fa-f]{6})" fill-opacity="0\.3" stroke="(#[0-9A-Fa-f]{6})"/,
      'filled bird path',
    );
    expect(VENUE_NEON.bluebird.fillColor).toBe(match[1]!.toUpperCase());
    expect(VENUE_NEON.bluebird.shapeColors).toEqual([match[2]!.toUpperCase()]);
  });
});

describe('the backdrop ground and tints match the handoff hero HTML', () => {
  it.each(VENUE_GLYPH_KEYS)('%s ground and tints', (key) => {
    const sky = heroMatch(
      key,
      /<linearGradient id="hs\d+" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="(#[0-9A-Fa-f]{6})"\/><stop offset="1" stop-color="(#[0-9A-Fa-f]{6})" stop-opacity="0\.22"\/>/,
      'sky gradient',
    );
    const radial = heroMatch(
      key,
      /<radialGradient id="hr\d+" cx="0\.15" cy="0\.2" r="0\.7"><stop offset="0" stop-color="(#[0-9A-Fa-f]{6})" stop-opacity="0\.28"\/>/,
      'radial tint gradient',
    );
    const ground = sky[1]!.toUpperCase();
    expect(VENUE_NEON[key].ground).toBe(ground);

    const { container } = render(
      <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
    );
    const art = container.querySelector('[data-venue-neon]') as HTMLElement;
    expect(art.style.background).not.toContain('color-mix');
    const layer = container.querySelector('svg[data-venue-ground]');
    expect(layer?.getAttribute('data-venue-ground')).toBe(ground);
    const sky0 = layer?.querySelector('linearGradient stop:nth-child(1)');
    const sky1 = layer?.querySelector('linearGradient stop:nth-child(2)');
    expect(sky0?.getAttribute('stop-color')).toBe(ground);
    // The board's tint is the venue's second colour at 22% by the bottom edge.
    expect(sky1?.getAttribute('stop-color')).toBe(sky[2]!.toUpperCase());
    expect(sky1?.getAttribute('stop-color')).toBe(VENUE_GLYPHS[key].to);
    expect(sky1?.getAttribute('stop-opacity')).toBe('0.22');
    const glow = layer?.querySelector('radialGradient');
    expect(glow?.getAttribute('cx')).toBe('0.15');
    expect(glow?.getAttribute('cy')).toBe('0.2');
    expect(glow?.getAttribute('r')).toBe('0.7');
    const glow0 = glow?.querySelector('stop');
    expect(glow0?.getAttribute('stop-color')).toBe(radial[1]!.toUpperCase());
    expect(glow0?.getAttribute('stop-color')).toBe(VENUE_GLYPHS[key].from);
    expect(glow0?.getAttribute('stop-opacity')).toBe('0.28');
    expect(layer?.querySelector('rect')?.getAttribute('fill')).toBe(ground);
  });

  it.each(VENUE_GLYPH_KEYS)(
    '%s silhouettes are cut from its own ground',
    (key) => {
      const { container } = render(
        <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
      );
      const { ground } = VENUE_NEON[key];
      const outdoor = container.querySelector(
        '[data-venue-backdrop="outdoor"]',
      );
      const arena = container.querySelector('[data-venue-backdrop="arena"]');
      if (outdoor) {
        expect(
          outdoor.querySelector('path:not([stroke])')?.getAttribute('fill'),
        ).toBe(ground);
      } else if (arena) {
        for (const rect of arena.querySelectorAll('rect[stroke]')) {
          expect(rect.getAttribute('fill')).toBe(ground);
        }
      } else {
        // The brick mortar is css (`repeating-linear-gradient`), which jsdom
        // does not keep, so only the family is asserted here.
        expect(
          container.querySelector('[data-venue-backdrop="street"]'),
        ).not.toBeNull();
      }
    },
  );
});

describe('the flagship card and the tile agree with the hero', () => {
  it.each(VENUE_GLYPH_KEYS)(
    '%s card strokes the same colours as the hero',
    (key) => {
      const hero = render(
        <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
      );
      const heroColours = glyphColours(hero.container);
      const card = render(<VenueNeonArt glyphKey={key} glyphSize={150} />);
      const cardColours = glyphColours(card.container);
      expect(cardColours.size).toBeGreaterThanOrEqual(1);
      for (const colour of cardColours) expect(heroColours).toContain(colour);
      if (key !== 'bluebird') {
        // Bluebird's card keeps its flat fill, so it draws one of the two.
        expect(cardColours).toEqual(heroColours);
      }
      expect(
        card.container.querySelector('svg[data-venue-glyph] linearGradient'),
      ).toBeNull();
      expect(
        card.container.querySelector(
          'svg[data-venue-glyph] g[filter] [stroke^="url("]',
        ),
      ).toBeNull();
    },
  );

  it.each(VENUE_GLYPH_KEYS)(
    '%s card draws the hero halo pair, not a soft halo',
    (key) => {
      const { container } = render(
        <VenueNeonArt glyphKey={key} glyphSize={150} />,
      );
      expect(container.querySelector('[data-venue-halo="soft"]')).toBeNull();
      expect(
        container
          .querySelector('[data-venue-halo="outer"]')
          ?.getAttribute('fill'),
      ).toBe(VENUE_NEON[key].halo.outer);
      expect(
        container
          .querySelector('[data-venue-halo="inner"]')
          ?.getAttribute('fill'),
      ).toBe(VENUE_NEON[key].halo.inner);
    },
  );

  it.each(Object.entries(VENUE_SLUG_GLYPHS))(
    "%s tile's gradient is two of the hero's colours",
    (slug, key) => {
      const hero = render(
        <VenueNeonArt glyphKey={key} glyphSize={163} glyphSizeSm={196} />,
      );
      const heroColours = glyphColours(hero.container);
      const tile = render(<VenueTile slug={slug} name={slug} />);
      const stops = [...tile.container.querySelectorAll('stop')].map((stop) =>
        stop.getAttribute('stop-color'),
      );
      expect(stops.length).toBeGreaterThanOrEqual(2);
      for (const stop of stops) expect(heroColours).toContain(stop);
    },
  );
});
