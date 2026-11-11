// @vitest-environment jsdom
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

  it('keeps the identity art for a venue without one', () => {
    const { container } = render(
      <VenueHero slug="new-room-denver" name="New Room" />,
    );
    expect(container.querySelector('[data-venue-neon]')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
