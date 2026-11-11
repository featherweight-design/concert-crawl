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
