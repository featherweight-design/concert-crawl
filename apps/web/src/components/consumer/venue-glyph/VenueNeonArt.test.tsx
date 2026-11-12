// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { VenueNeonArt } from './VenueNeonArt';

describe('VenueNeonArt', () => {
  it('draws the venue glyph large, behind a glow filter', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="church" glyphSize={196} />,
    );
    const art = container.querySelector('[data-venue-neon="church"]');
    expect(art).not.toBeNull();
    expect(art?.getAttribute('aria-hidden')).toBe('true');
    const glyph = art?.querySelector('svg[data-venue-glyph="church"]');
    expect(glyph?.getAttribute('width')).toBe('196');
    expect(glyph?.querySelector('filter feGaussianBlur')).not.toBeNull();
  });

  it('REGRESSION: Red Rocks is outdoor, a ridge and no brick', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="redrocks" glyphSize={196} />,
    );
    const art = container.querySelector('[data-venue-neon="redrocks"]');
    expect(art?.getAttribute('data-venue-setting')).toBe('outdoor');
    expect(art?.querySelector('[data-venue-backdrop="street"]')).toBeNull();
    const backdrop = art?.querySelector('[data-venue-backdrop="outdoor"]');
    expect(backdrop?.querySelector('path[stroke]')).not.toBeNull();
    expect(backdrop?.querySelectorAll('circle')).toHaveLength(32);
  });

  it('draws a skyline and the moon for Ball Arena', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="ballarena" glyphSize={196} />,
    );
    const art = container.querySelector('[data-venue-neon="ballarena"]');
    expect(art?.getAttribute('data-venue-setting')).toBe('arena');
    expect(art?.querySelector('[data-venue-backdrop="street"]')).toBeNull();
    const backdrop = art?.querySelector('[data-venue-backdrop="arena"]');
    expect(backdrop?.querySelectorAll('rect[stroke]')).toHaveLength(8);
    expect(backdrop?.querySelector('mask')).not.toBeNull();
  });

  it('keeps the brick layer for a street venue', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="ogden" glyphSize={196} />,
    );
    const art = container.querySelector('[data-venue-neon="ogden"]');
    expect(art?.getAttribute('data-venue-setting')).toBe('street');
    expect(art?.querySelector('[data-venue-backdrop="street"]')).not.toBeNull();
  });

  it('lets the setting prop override the venue default', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="ogden" glyphSize={196} setting="arena" />,
    );
    const art = container.querySelector('[data-venue-neon="ogden"]');
    expect(art?.getAttribute('data-venue-setting')).toBe('arena');
    expect(art?.querySelector('[data-venue-backdrop="arena"]')).not.toBeNull();
  });

  it('draws two flat halo discs and a neon outline for a filled glyph', () => {
    const { container } = render(
      <VenueNeonArt glyphKey="bluebird" glyphSize={196} />,
    );
    expect(container.querySelectorAll('circle[data-venue-halo]')).toHaveLength(
      2,
    );
    const bird = container.querySelector('svg[data-venue-glyph] path');
    expect(bird?.getAttribute('fill-opacity')).toBe('0.3');
    expect(bird?.getAttribute('stroke-width')).toBe('5.25');
    expect(bird?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('moves the sign right from sm only when asked', () => {
    const { container, rerender } = render(
      <VenueNeonArt glyphKey="redrocks" glyphSize={150} />,
    );
    expect(container.innerHTML).not.toContain('sm:justify-end');
    rerender(
      <VenueNeonArt glyphKey="redrocks" glyphSize={150} align="endFromSm" />,
    );
    expect(container.innerHTML).toContain('sm:justify-end');
  });
});
