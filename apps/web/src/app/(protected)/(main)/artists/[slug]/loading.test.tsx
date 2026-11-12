// @vitest-environment jsdom

import React from 'react';
import type { ArtistDetailResponse } from '@concert-crawl/types';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtistPageContent } from '@/components/consumer/artist-page/ArtistPageContent';
import { ArtistStageShell } from '@/components/consumer/artist-page/ArtistStage';
import {
  AP_SKELETON_CARD,
  NF_FOLLOW_SIZES,
} from '@/components/consumer/artist-page/definitions/constants';
import { ARTIST_COPY } from '@/components/consumer/artist-page/definitions/copy';

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
    expect(card.style.transform).toBe(`rotate(${AP_SKELETON_CARD.tilt}deg)`);
  });

  // Addendum 2 item 11 (`11-artist-skeleton/load-artist-m`).
  it('draws the mobile card at 190 × 230, tilted −2.5°', () => {
    expect(AP_SKELETON_CARD).toEqual({ width: 190, height: 230, tilt: -2.5 });
    const { getByTestId } = render(<ArtistLoading />);
    const card = getByTestId('stage-card-skeleton');
    expect(card.className).toContain('w-[190px]');
    expect(card.className).toContain('h-[230px]');
    expect(card.style.transform).toBe('rotate(-2.5deg)');
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

  it('draws three carded rows with neutral edges', () => {
    const { getAllByTestId } = render(<ArtistLoading />);
    const rows = getAllByTestId('artist-row-skeleton');
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.style.borderLeftColor).toBe('var(--border-strong)');
    }
  });

  it('announces itself once', () => {
    const { getAllByRole } = render(<ArtistLoading />);
    const status = getAllByRole('status');
    expect(status).toHaveLength(1);
    expect(status[0]?.textContent).toBe(ARTIST_COPY.loadingArtist);
  });
});
