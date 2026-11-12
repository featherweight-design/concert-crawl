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

  it('sets the FLAGSHIP chip in neon yellow on both cards', () => {
    const { getAllByTestId } = render(
      <VenueFeatureCard
        venue={makeVenue({
          name: 'Red Rocks Amphitheatre',
          slug: 'red-rocks-amphitheatre',
        })}
      />,
    );
    const chips = getAllByTestId('flagship-chip');
    expect(chips).toHaveLength(2);
    chips.forEach((chip) => {
      expect(chip.style.color).toBe('rgb(255, 227, 107)');
    });
  });

  it('gives both cards a gradient edge and a glow', () => {
    const { getByTestId } = render(<VenueFeatureCard venue={makeVenue({})} />);
    ['venue-feature-card-desktop', 'venue-feature-card-mobile'].forEach(
      (id) => {
        const card = getByTestId(id);
        expect(card.style.border).toBe('1px solid transparent');
        expect(card.style.background).toContain(
          'linear-gradient(var(--surface-1), var(--surface-1)) padding-box',
        );
        expect(card.style.background).toContain(
          'linear-gradient(135deg, var(--signal), var(--genre-metal) 50%, var(--accent)) border-box',
        );
        expect(card.style.boxShadow).toBe(
          '0 10px 40px -10px color-mix(in oklab, var(--accent) 35%, transparent), 0 0 24px -6px color-mix(in oklab, var(--warning) 25%, transparent)',
        );
      },
    );
  });

  it('puts one gradient span on the name in each card', () => {
    const { container } = render(
      <VenueFeatureCard
        venue={makeVenue({
          name: 'Red Rocks Amphitheatre',
          slug: 'red-rocks-amphitheatre',
        })}
      />,
    );
    expect(
      container.querySelectorAll('[data-venue-name-gradient]'),
    ).toHaveLength(2);
  });
});
