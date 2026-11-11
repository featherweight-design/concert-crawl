// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { VENUE_GLYPH_KEYS } from './definitions/glyphs';
import {
  VENUE_SLUG_GLYPHS,
  venueGlyphKey,
} from './definitions/venue-glyph-keys';
import { VenueGlyph } from './VenueGlyph';
import { VenueTile } from './VenueTile';

/**
 * The web app doesn't depend on `@concert-crawl/db`, so the drift check reads
 * the venue slugs straight out of the seed's `SEED_VENUES` block.
 */
function seedVenueSlugs(): string[] {
  const seed = readFileSync(
    path.resolve(__dirname, '../../../../../../packages/db/seed.ts'),
    'utf8',
  );
  const block = /export const SEED_VENUES[\s\S]*?\n\];/.exec(seed)?.[0] ?? '';
  return [...block.matchAll(/slug: '([a-z0-9-]+)'/g)].map((match) => match[1]!);
}

/** Onboarded straight to prod, so the seed never had them (checked 2026-11-11). */
const PROD_ONLY_SLUGS = ['ball-arena', 'the-black-box', 'the-church-nightclub'];

describe('venue slug to glyph map', () => {
  it('gives every seed venue a glyph', () => {
    const slugs = seedVenueSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((slug) => venueGlyphKey(slug) === null)).toEqual([]);
  });

  it('gives the prod-only venues a glyph', () => {
    for (const slug of PROD_ONLY_SLUGS) {
      expect(venueGlyphKey(slug)).not.toBeNull();
    }
  });

  it('uses every glyph exactly once', () => {
    expect(Object.values(VENUE_SLUG_GLYPHS).sort()).toEqual(
      [...VENUE_GLYPH_KEYS].sort(),
    );
  });

  it('returns null for an unknown slug, including Object prototype keys', () => {
    expect(venueGlyphKey('a-venue-we-add-later')).toBeNull();
    expect(venueGlyphKey('constructor')).toBeNull();
  });
});

describe('VenueTile', () => {
  it('draws the glyph for a known venue', () => {
    const { container } = render(
      <VenueTile slug="red-rocks-amphitheatre" name="Red Rocks Amphitheatre" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-venue-tile')).toBe('redrocks');
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('falls back to a neutral initial tile for an unknown venue', () => {
    const { container } = render(
      <VenueTile slug="new-venue" name="  the new room" />,
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('data-venue-tile')).toBe('fallback');
    expect(svg?.textContent).toBe('T');
    expect(svg?.querySelector('rect')?.getAttribute('stroke')).toBe(
      'var(--border-strong)',
    );
  });

  it('sits on the theme surface, not a fixed colour', () => {
    const { container } = render(<VenueTile slug="hi-dive" name="Hi-Dive" />);
    expect(container.querySelector('rect')?.getAttribute('fill')).toBe(
      'var(--surface-1)',
    );
  });

  it('is decorative by default', () => {
    const { container } = render(<VenueTile slug="hi-dive" name="Hi-Dive" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('role')).toBeNull();
  });

  it('names the venue when labelled', () => {
    const { getByRole } = render(
      <VenueTile slug="hi-dive" name="Hi-Dive" labelled />,
    );
    expect(getByRole('img', { name: 'Hi-Dive' })).toBeTruthy();
  });

  it('gives each tile its own gradient ids', () => {
    const { container } = render(
      <>
        <VenueTile slug="hi-dive" name="Hi-Dive" />
        <VenueTile slug="hi-dive" name="Hi-Dive" />
      </>,
    );
    const ids = [...container.querySelectorAll('linearGradient')].map(
      (gradient) => gradient.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('VenueGlyph', () => {
  it('fills the Bluebird bird and strokes everything else', () => {
    const { container } = render(<VenueGlyph glyphKey="bluebird" />);
    const path = container.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('none');
    expect(path?.getAttribute('fill')).toMatch(/^url\(#/);
  });

  it('draws circles for the Church rose window', () => {
    const { container } = render(<VenueGlyph glyphKey="church" />);
    expect(container.querySelectorAll('circle').length).toBe(8);
  });
});
