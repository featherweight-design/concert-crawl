// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VENUE_SLUG_GLYPHS } from '@/components/consumer/venue-glyph';
import { STAMP_ACCENTS, stampAccentFor } from '@/lib/passport/stamp';

import {
  DASHED_OPACITY,
  DASHED_RING,
  VenueStamp,
  glyphStrokeFor,
} from './VenueStamp';

const KNOWN = {
  venueSlug: 'cervantes-masterpiece-ballroom',
  venueName: 'Cervantes',
};
const UNKNOWN = { venueSlug: 'not-a-venue', venueName: 'The Velvet Room' };

const rootOf = (container: HTMLElement): HTMLElement => {
  const root = container.querySelector<HTMLElement>('[data-venue-stamp]');
  if (!root) throw new Error('no stamp rendered');
  return root;
};

const ringOf = (container: HTMLElement): SVGCircleElement => {
  const ring = container.querySelector<SVGCircleElement>(
    '[data-venue-stamp-ring]',
  );
  if (!ring) throw new Error('no ring rendered');
  return ring;
};

const tilts = (el: Element): boolean =>
  el.hasAttribute('transform') ||
  /rotate|transform/.test(el.getAttribute('style') ?? '');

describe('VenueStamp', () => {
  afterEach(cleanup);

  it('draws a solid, undimmed ring for an attended show', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(rootOf(container).dataset.venueStamp).toBe('solid');
    expect(rootOf(container).style.opacity).toBe('');
    expect(ringOf(container).getAttribute('stroke-dasharray')).toBeNull();
  });

  it('draws a dashed ring and dims the whole stamp for an upcoming show', () => {
    const { container } = render(
      <VenueStamp {...KNOWN} seed="Khruangbin" variant="dashed" />,
    );
    expect(rootOf(container).dataset.venueStamp).toBe('dashed');
    expect(rootOf(container).style.opacity).toBe(String(DASHED_OPACITY));
    expect(ringOf(container).getAttribute('stroke-dasharray')).toBe(
      DASHED_RING,
    );
    expect(ringOf(container).getAttribute('opacity')).toBeNull();
  });

  it('grounds the ring on the theme surface so pale accents hold on light themes', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(ringOf(container).getAttribute('fill')).toBe('var(--surface-2)');
  });

  it('puts the venue glyph inside the ring for a known venue', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(
      container.querySelector('[data-venue-glyph="cervantes"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-venue-stamp-fallback]')).toBeNull();
  });

  it('falls back to the venue identity art inside the ring for a venue with no glyph', () => {
    const { container } = render(<VenueStamp {...UNKNOWN} seed="Khruangbin" />);
    expect(container.querySelector('[data-venue-glyph]')).toBeNull();
    const art = container.querySelector<HTMLElement>(
      '[data-venue-stamp-fallback]',
    );
    expect(art?.style.borderRadius).toBe('50%');
    expect(art?.style.overflow).toBe('hidden');
    expect(ringOf(container).getAttribute('fill')).toBe('none');
  });

  it('never renders "??" for a venue with no name', () => {
    const { container } = render(
      <VenueStamp venueSlug="not-a-venue" venueName="" seed="x" />,
    );
    expect(container.textContent).not.toContain('??');
  });

  it('inks the stamp from the seed accent, the same on every render', () => {
    const accent = stampAccentFor('Khruangbin');
    expect(STAMP_ACCENTS).toContain(accent);
    const first = render(<VenueStamp {...KNOWN} seed="Khruangbin" />).container
      .innerHTML;
    cleanup();
    const second = render(<VenueStamp {...KNOWN} seed="Khruangbin" />).container
      .innerHTML;
    expect(first).toBe(second);
    expect(ringOf(document.body).getAttribute('stroke')).toBe(
      `color-mix(in oklch, ${accent} 55%, var(--fg))`,
    );
  });

  it('is never tilted, for any glyph or the fallback', () => {
    for (const venueSlug of [...Object.keys(VENUE_SLUG_GLYPHS), 'no-glyph']) {
      const { container } = render(
        <VenueStamp venueSlug={venueSlug} venueName="Venue" seed="x" />,
      );
      const root = rootOf(container);
      const outer = root.querySelector(':scope > svg');
      if (!outer) throw new Error('no svg rendered');
      for (const el of [root, outer, ringOf(container)]) {
        expect(tilts(el), `${venueSlug}: ${el.tagName}`).toBe(false);
      }
      cleanup();
    }
  });

  it('keeps the glyph stroke at least 1 CSS px at the default size', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="x" />);
    const group = container.querySelector('[data-venue-glyph] > g');
    const units = Number(group?.getAttribute('stroke-width'));
    expect(units).toBe(glyphStrokeFor(28));
    // 28px across a 40-unit box, the glyph grid scaled 21.6 / 24 into it.
    expect(units * (28 / 40) * (21.6 / 24)).toBeGreaterThanOrEqual(1);
  });

  it('renders at the passed size', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="x" size={44} />);
    expect(rootOf(container).style.width).toBe('44px');
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('44');
  });

  it('is decorative by default', () => {
    const root = rootOf(render(<VenueStamp {...KNOWN} seed="x" />).container);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
  });

  it('names the venue when labelled', () => {
    const root = rootOf(
      render(<VenueStamp {...KNOWN} seed="x" labelled />).container,
    );
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Cervantes');
    expect(root.getAttribute('aria-hidden')).toBeNull();
  });
});
