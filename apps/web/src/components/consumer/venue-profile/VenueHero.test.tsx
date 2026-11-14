// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VenueHero } from './VenueHero';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

afterEach(cleanup);

describe('VenueHero', () => {
  it('draws the neon glyph for a venue with one', () => {
    const { container } = render(
      <VenueHero slug="the-church-nightclub" name="The Church Nightclub" />,
    );
    expect(
      container.querySelector('[data-venue-neon="church"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('svg[data-venue-glyph="church"]'),
    ).not.toBeNull();
  });

  it('draws the desktop sign about a quarter larger than before', () => {
    const { container } = render(
      <VenueHero slug="the-church-nightclub" name="The Church Nightclub" />,
    );
    const glyph = container.querySelector(
      'svg[data-venue-glyph="church"]',
    ) as SVGElement;
    expect(glyph.style.getPropertyValue('--vn-size')).toBe('254px');
    expect(glyph.style.getPropertyValue('--vn-size-sm')).toBe('245px');
  });

  it('keeps the identity art for a venue without one', () => {
    const { container } = render(
      <VenueHero slug="new-room-denver" name="New Room" />,
    );
    expect(container.querySelector('[data-venue-neon]')).toBeNull();
    // Scoped to the identity wrapper: the BackChip's own chevron svg would
    // satisfy a page-wide query even with the fallback art gone.
    expect(
      container.querySelector('[data-testid="venue-hero-identity"]')
        ?.childElementCount,
    ).toBeGreaterThan(0);
  });

  // Addendum 2 item 16: on Light the backdrop goes pale; the glyph is not
  // recoloured. The wash is gated on the Light theme alone.
  it('washes the backdrop pale on the Light theme only', () => {
    const { container } = render(
      <VenueHero slug="the-church-nightclub" name="The Church Nightclub" />,
    );
    const wash = container.querySelector(
      '[data-testid="venue-hero-light-wash"]',
    );
    expect(wash).not.toBeNull();
    expect(wash).toHaveClass('hidden', '[[data-theme=light]_&]:block');
    expect(wash?.getAttribute('style')).toContain('var(--bg) 45%');
    // The glyph is drawn in its own gradient, not a theme colour.
    expect(
      container
        .querySelector('svg[data-venue-glyph="church"]')
        ?.innerHTML.includes('var(--'),
    ).toBe(false);
  });
});
