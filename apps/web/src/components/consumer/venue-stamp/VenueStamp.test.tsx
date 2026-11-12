// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { VENUE_SLUG_GLYPHS } from '@/components/consumer/venue-glyph';
import { STAMP_ACCENTS, stampColorsFor } from '@/lib/passport/stamp';

import {
  DASHED_GLYPH_OPACITY,
  DASHED_RING,
  INNER_DASH,
  VenueStamp,
  glyphStrokeFor,
  stampRings,
} from './VenueStamp';

// Cervantes on the boards: ring and text #FFB838 (`to`), glyph #FF6A3D (`from`).
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

const outerSvg = (container: HTMLElement): SVGSVGElement => {
  const svg = rootOf(container).querySelector<SVGSVGElement>(':scope > svg');
  if (!svg) throw new Error('no svg rendered');
  return svg;
};

const tilts = (el: Element): boolean =>
  el.hasAttribute('transform') ||
  /rotate|transform/.test(el.getAttribute('style') ?? '');

describe('VenueStamp', () => {
  afterEach(cleanup);

  // The boards (`one-stamp-m`): a solid outer ring, a dashed inner ring, no fill.
  it("draws the boards' double ring: solid outside, dashed inside, unfilled", () => {
    const { container } = render(<VenueStamp {...KNOWN} size={58} />);
    expect(rootOf(container).dataset.venueStamp).toBe('solid');
    const circles = outerSvg(container).querySelectorAll(':scope > circle');
    expect(circles).toHaveLength(2);
    const [outer, inner] = Array.from(circles);
    expect(outer?.getAttribute('r')).toBe('27.5');
    expect(outer?.getAttribute('stroke-width')).toBe('2');
    expect(outer?.getAttribute('stroke-dasharray')).toBeNull();
    expect(outer?.getAttribute('fill')).toBe('none');
    expect(inner?.getAttribute('r')).toBe('23');
    expect(inner?.getAttribute('stroke-width')).toBe('0.9');
    expect(inner?.getAttribute('stroke-dasharray')).toBe(INNER_DASH);
    expect(inner?.getAttribute('fill')).toBe('none');
  });

  it('keeps the board ring geometry at the teaser size too', () => {
    expect(stampRings(50)).toEqual({ outer: 23.5, inner: 19 });
  });

  it('inks the rings in the venue ring colour and the glyph in its glyph colour, unmixed', () => {
    const { container } = render(<VenueStamp {...KNOWN} />);
    const svg = outerSvg(container);
    for (const circle of svg.querySelectorAll(':scope > circle')) {
      expect(circle.getAttribute('stroke')).toBe('#FFB838');
    }
    const glyph = container.querySelector('[data-venue-glyph="cervantes"] > g');
    expect(glyph?.getAttribute('stroke')).toBe('#FF6A3D');
    expect(container.innerHTML).not.toContain('color-mix');
  });

  it('glows in the ring colour', () => {
    const { container } = render(<VenueStamp {...KNOWN} />);
    expect(outerSvg(container).style.filter).toContain('#FFB8384D');
  });

  it('draws the bare glyph at 40% of the stamp', () => {
    const { container } = render(<VenueStamp {...KNOWN} size={58} />);
    const glyph = container.querySelector('[data-venue-glyph]');
    expect(Number(glyph?.getAttribute('width'))).toBeCloseTo(23.2);
    expect(Number(glyph?.getAttribute('x'))).toBeCloseTo(17.4);
    expect(container.querySelector('[data-venue-stamp-fallback]')).toBeNull();
  });

  // The boards' upcoming stamp: one grey dashed ring, a faint grey glyph.
  it('draws an upcoming show as one grey dashed ring around a faint grey glyph', () => {
    const { container } = render(
      <VenueStamp {...KNOWN} variant="dashed" size={58} />,
    );
    expect(rootOf(container).dataset.venueStamp).toBe('dashed');
    expect(rootOf(container).style.opacity).toBe('');
    const circles = outerSvg(container).querySelectorAll(':scope > circle');
    expect(circles).toHaveLength(1);
    expect(ringOf(container).getAttribute('stroke')).toBe(
      'var(--border-strong)',
    );
    expect(ringOf(container).getAttribute('stroke-width')).toBe('1.5');
    expect(ringOf(container).getAttribute('stroke-dasharray')).toBe(
      DASHED_RING,
    );
    const glyph = container.querySelector('[data-venue-glyph] > g');
    expect(glyph?.getAttribute('stroke')).toBe('var(--fg-subtle)');
    const faint = container.querySelector<SVGGElement>(
      '[data-venue-stamp-glyph]',
    );
    expect(faint?.style.opacity).toBe(String(DASHED_GLYPH_OPACITY));
    expect(faint?.style.filter).toBe('grayscale(1)');
    expect(outerSvg(container).style.filter).toBe('');
    expect(container.innerHTML).not.toContain('#FFB838');
  });

  it('falls back to the venue identity art inside the rings for a venue with no glyph', () => {
    const { container } = render(<VenueStamp {...UNKNOWN} />);
    expect(container.querySelector('[data-venue-glyph]')).toBeNull();
    const art = container.querySelector<HTMLElement>(
      '[data-venue-stamp-fallback]',
    );
    expect(art?.style.borderRadius).toBe('50%');
    expect(art?.style.overflow).toBe('hidden');
    const ring = ringOf(container).getAttribute('stroke');
    expect(STAMP_ACCENTS).toContain(ring);
    expect(ring).toBe(stampColorsFor(UNKNOWN.venueSlug).ring);
  });

  it('never renders "??" for a venue with no name', () => {
    const { container } = render(
      <VenueStamp venueSlug="not-a-venue" venueName="" />,
    );
    expect(container.textContent).not.toContain('??');
  });

  it('is never tilted, for any glyph or the fallback', () => {
    for (const venueSlug of [...Object.keys(VENUE_SLUG_GLYPHS), 'no-glyph']) {
      const { container } = render(
        <VenueStamp venueSlug={venueSlug} venueName="Venue" />,
      );
      for (const el of [
        rootOf(container),
        outerSvg(container),
        ringOf(container),
      ]) {
        expect(tilts(el), `${venueSlug}: ${el.tagName}`).toBe(false);
      }
      cleanup();
    }
  });

  it("draws the glyph at the boards' 1.8 stroke, and never under 1 CSS px", () => {
    expect(glyphStrokeFor(58)).toBe(1.8);
    for (const size of [28, 32, 38, 44]) {
      const units = glyphStrokeFor(size);
      expect(units * ((size * 0.4) / 24)).toBeGreaterThanOrEqual(1);
    }
  });

  it('renders at the passed size', () => {
    const { container } = render(<VenueStamp {...KNOWN} size={58} />);
    expect(rootOf(container).style.width).toBe('58px');
    expect(outerSvg(container).getAttribute('width')).toBe('58');
  });

  it('is decorative by default', () => {
    const root = rootOf(render(<VenueStamp {...KNOWN} />).container);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('role')).toBeNull();
  });

  it('names the venue when labelled', () => {
    const root = rootOf(render(<VenueStamp {...KNOWN} labelled />).container);
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('Cervantes');
    expect(root.getAttribute('aria-hidden')).toBeNull();
  });
});
