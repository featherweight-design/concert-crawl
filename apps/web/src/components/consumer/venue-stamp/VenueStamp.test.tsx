// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { STAMP_ACCENTS } from '@/lib/stamp-accent';

import { DASHED_RING, VenueStamp, stampColor } from './VenueStamp';

const KNOWN = {
  venueSlug: 'cervantes-masterpiece-ballroom',
  venueName: 'Cervantes',
};
const UNKNOWN = { venueSlug: 'not-a-venue', venueName: 'The Velvet Room' };

const svgOf = (container: HTMLElement): SVGSVGElement => {
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('no svg rendered');
  return svg;
};

const ringOf = (container: HTMLElement): SVGCircleElement => {
  const ring = container.querySelector('svg > circle');
  if (!ring) throw new Error('no ring rendered');
  return ring as SVGCircleElement;
};

describe('VenueStamp', () => {
  afterEach(cleanup);

  it('draws a solid ring for an attended show', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(svgOf(container).dataset.venueStamp).toBe('solid');
    expect(ringOf(container).getAttribute('stroke-dasharray')).toBeNull();
  });

  it('draws a dashed ring for an upcoming show', () => {
    const { container } = render(
      <VenueStamp {...KNOWN} seed="Khruangbin" variant="dashed" />,
    );
    expect(svgOf(container).dataset.venueStamp).toBe('dashed');
    expect(ringOf(container).getAttribute('stroke-dasharray')).toBe(
      DASHED_RING,
    );
  });

  it('puts the venue glyph inside the ring for a known venue', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(
      container.querySelector('[data-venue-glyph="cervantes"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-venue-stamp-fallback]')).toBeNull();
  });

  it('falls back to the ring and initials for a venue with no glyph', () => {
    const { container } = render(<VenueStamp {...UNKNOWN} seed="Khruangbin" />);
    expect(container.querySelector('[data-venue-glyph]')).toBeNull();
    expect(
      container.querySelector('[data-venue-stamp-fallback]')?.textContent,
    ).toBe('VR');
    expect(ringOf(container)).not.toBeNull();
  });

  it('inks the ring and glyph in the seed accent, the same on every render', () => {
    const accent = stampColor('Khruangbin');
    expect(STAMP_ACCENTS).toContain(accent);
    const first = render(<VenueStamp {...KNOWN} seed="Khruangbin" />).container
      .innerHTML;
    cleanup();
    const second = render(<VenueStamp {...KNOWN} seed="Khruangbin" />).container
      .innerHTML;
    expect(first).toBe(second);
    expect(first).toContain(`stroke="${accent}"`);
  });

  it('is never tilted', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="Khruangbin" />);
    expect(container.innerHTML).not.toMatch(/rotate/);
  });

  it('renders at the passed size', () => {
    const { container } = render(<VenueStamp {...KNOWN} seed="x" size={44} />);
    expect(svgOf(container).getAttribute('width')).toBe('44');
  });

  it('is decorative by default', () => {
    const svg = svgOf(render(<VenueStamp {...KNOWN} seed="x" />).container);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('role')).toBeNull();
  });

  it('names the venue when labelled', () => {
    const svg = svgOf(
      render(<VenueStamp {...KNOWN} seed="x" labelled />).container,
    );
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Cervantes');
    expect(svg.getAttribute('aria-hidden')).toBeNull();
  });
});
