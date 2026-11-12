// @vitest-environment jsdom

import React from 'react';
import type { ArtistDetailResponse } from '@concert-crawl/types';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent';
import {
  ARTIST_CARD_RADIUS,
  ARTIST_CARD_RATIO,
  ARTIST_CARD_TILT,
  ArtistStageShell,
} from '@/components/consumer/artist-page/ArtistStage';
import { NF_FOLLOW_SIZES } from '@/components/consumer/artist-page/definitions/constants';
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy';
import { MONTH_TILE_SIZE } from '@/components/consumer/events-list/DayTile';

import ArtistLoading from './loading';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
  usePathname: () => '/artists/nightjar-choir',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => null, isSignedIn: false }),
}));

vi.mock('@/theme', () => ({
  useTheme: () => ({ theme: 'electric', setTheme: () => undefined }),
}));

vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: () => null,
}));

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    ...rest
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...rest}>{children}</a>
  ),
}));

afterEach(cleanup);

const LOADED: ArtistDetailResponse = {
  artist: {
    slug: 'nightjar-choir',
    name: 'Nightjar Choir',
    spotifyArtistId: null,
    photoUrl: null,
  },
  shows: [],
  past: [],
  history: { count: 0, venues: [] },
  following: null,
  myOpenReport: null,
  match: null,
};

// Board `06-states/bp-s-load_artist_m`, on the stage geometry the loaded page
// uses (README rule 9: skeletons hold the layout).
describe('artist route skeleton', () => {
  it('stands the stage up with the same shell the loaded page uses', () => {
    const skeleton = render(<ArtistLoading />).container;
    const loaded = render(<ArtistPageContent data={LOADED} />).container;

    const stageClass = (root: Element) =>
      root.querySelector('[data-testid="hero-band"]')?.className;
    expect(stageClass(skeleton)).toBeDefined();
    expect(stageClass(skeleton)).toBe(stageClass(loaded));
    // The shell is the one export both render, so a geometry change moves both.
    expect(ArtistStageShell).toBeTypeOf('function');
  });

  it("draws the portrait as the tilted card, not the board's old circle", () => {
    const { getByTestId } = render(<ArtistLoading />);
    const card = getByTestId('stage-card-skeleton');
    expect(card.style.transform).toBe(`rotate(${ARTIST_CARD_TILT}deg)`);
  });

  // Addendum 3: the skeleton is the loaded card exactly, 200 × 250 at −2° in
  // the 200px mobile slot, with the same radius and outline, on desktop too.
  it('matches the loaded card: 4:5 in the same slot, −2°, same radius and outline', () => {
    expect(ARTIST_CARD_TILT).toBe(-2);
    expect(ARTIST_CARD_RATIO).toBe('4 / 5');

    const skeleton = render(<ArtistLoading />).getByTestId(
      'stage-card-skeleton',
    );
    const loaded = render(<ArtistPageContent data={LOADED} />).getByTestId(
      'stage-card',
    );

    expect(skeleton.style.aspectRatio).toBe('4 / 5');
    // No width or height of its own on any viewport: it fills the slot the
    // loaded card fills.
    expect(skeleton.className).toBe('');
    expect(skeleton.parentElement?.className).toBe(
      loaded.parentElement?.className,
    );
    // LOADED has no shows, so its ring is the neutral one the skeleton wears.
    expect(skeleton.style.transform).toBe(loaded.style.transform);
    expect(skeleton.style.borderRadius).toBe(loaded.style.borderRadius);
    expect(skeleton.style.boxShadow).toBe(loaded.style.boxShadow);
    expect(skeleton.style.borderRadius).toBe(`${ARTIST_CARD_RADIUS}px`);
  });

  it('keeps the back control live while the data loads', () => {
    const { container } = render(<ArtistLoading />);
    expect(container.querySelector('button[aria-label="Back"]')).not.toBeNull();
  });

  it('reserves the follow pill at the height the loaded control uses', () => {
    const { container } = render(<ArtistLoading />);
    const heights = Array.from(
      container.querySelectorAll<HTMLElement>('[style]'),
    ).map((node) => node.style.height);
    expect(heights).toContain(`${NF_FOLLOW_SIZES.primary.height}px`);
    // Mobile reserves it in the same block the loaded page puts it in.
    expect(
      container.querySelector('.ap-shell > .ap-block-follow'),
    ).not.toBeNull();
  });

  // Addendum 2 board `11-artist-skeleton/load-artist-m`.
  it('draws two carded rows of three lines each, with neutral edges', () => {
    const { getAllByTestId } = render(<ArtistLoading />);
    const rows = getAllByTestId('artist-row-skeleton');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.style.borderLeftColor).toBe('var(--border-strong)');
    }
    for (const lines of getAllByTestId('artist-row-skeleton-lines')) {
      expect(lines.children).toHaveLength(3);
    }
    // The tile wears the loaded row's own size classes, so nothing shifts.
    for (const tile of getAllByTestId('artist-row-skeleton-tile')) {
      expect(tile.className).toContain(MONTH_TILE_SIZE);
    }
  });

  it('draws two genre-chip pills under the name, not one bar', () => {
    const { getByTestId } = render(<ArtistLoading />);
    const pills = Array.from(
      getByTestId('genre-chip-skeletons').children,
    ).filter((node): node is HTMLElement => node instanceof HTMLElement);
    expect(pills).toHaveLength(2);
    expect(pills.map((pill) => pill.style.width)).toEqual(['92px', '76px']);
    for (const pill of pills) {
      expect(pill.style.height).toBe('24px');
      expect(pill.style.borderRadius).toBe('999px');
    }
  });

  it('announces itself once', () => {
    const { getAllByRole } = render(<ArtistLoading />);
    const status = getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]?.textContent).toBe(ARTIST_COPY.loadingArtist);
  });
});
