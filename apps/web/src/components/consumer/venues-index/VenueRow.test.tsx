// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VenueFeatureCard } from './VenueFeatureCard';
import { VenueRow } from './VenueRow';
import type { VenueWithDistance } from './venue-filter-defs';

vi.mock('next/link', () => ({
  default: ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...rest}>{children}</a>
  ),
}));

afterEach(cleanup);

function makeVenue(overrides: Partial<VenueWithDistance>): VenueWithDistance {
  return {
    id: 'v-1',
    name: 'Mission Ballroom',
    slug: 'mission-ballroom',
    city: 'Denver',
    timezone: 'America/Denver',
    websiteUrl: 'https://example.com',
    active: true,
    verified: true,
    address: null,
    capacity: 4000,
    venueType: 'Ballroom',
    about: null,
    neighborhood: 'RiNo',
    featured: false,
    lat: null,
    lng: null,
    upcomingCount: 54,
    guide: null,
    distanceMi: 3.6,
    ...overrides,
  };
}

describe('VenueRow', () => {
  it('uses the venue icon tile for a venue with a glyph', () => {
    const { container } = render(<VenueRow venue={makeVenue({})} />);
    const tiles = container.querySelectorAll('[data-venue-tile]');
    expect(tiles.length).toBeGreaterThan(0);
    tiles.forEach((tile) =>
      expect(tile.getAttribute('data-venue-tile')).toBe('mission'),
    );
  });

  it('falls back to the identity tile for a venue without one', () => {
    const { container } = render(
      <VenueRow
        venue={makeVenue({ name: 'New Room', slug: 'new-room-denver' })}
      />,
    );
    const tiles = container.querySelectorAll('[data-venue-tile]');
    expect(tiles.length).toBeGreaterThan(0);
    tiles.forEach((tile) =>
      expect(tile.getAttribute('data-venue-tile')).toBe('fallback'),
    );
  });

  it('links to the venue page and states the neighborhood', () => {
    const { container, getAllByText } = render(
      <VenueRow venue={makeVenue({})} />,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      '/venues/mission-ballroom',
    );
    expect(getAllByText('RiNo').length).toBeGreaterThan(0);
  });
});

describe('VenueFeatureCard', () => {
  it('shows the neon glyph art for a venue with a glyph', () => {
    const { container } = render(
      <VenueFeatureCard
        venue={makeVenue({
          name: 'Red Rocks Amphitheatre',
          slug: 'red-rocks-amphitheatre',
          featured: true,
        })}
      />,
    );
    expect(
      container.querySelectorAll('[data-venue-neon="redrocks"]').length,
    ).toBe(2);
  });

  it('keeps the identity art and monogram for a venue without one', () => {
    const { container, getAllByText } = render(
      <VenueFeatureCard
        venue={makeVenue({ name: 'New Room', slug: 'new-room-denver' })}
      />,
    );
    expect(container.querySelector('[data-venue-neon]')).toBeNull();
    expect(getAllByText('NR').length).toBe(2);
  });
});
