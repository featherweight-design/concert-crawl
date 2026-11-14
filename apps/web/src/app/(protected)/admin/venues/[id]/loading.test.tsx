// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  CONTENT_GUTTER_Y,
  PAGE_MAX_WIDTH,
  VENUE_PAGE_GAP,
} from '@/components/admin/shell/content-pane';
import { UNDERLINE_TAB_HEIGHT } from '@/components/admin/primitives/geometry';
import { VENUE_HEADER_HEIGHT } from '@/components/admin/venues/venue-header-geometry';
import VenueDetailLoading from './loading';

afterEach(cleanup);

describe('venue page loading (07/loading-venue-page)', () => {
  it('uses the loaded page’s column so nothing jumps on load', () => {
    render(<VenueDetailLoading />);
    const column = screen.getByTestId('venue-page-skeleton');
    expect(column.style.gap).toBe(`${VENUE_PAGE_GAP}px`);
    expect(column.style.maxWidth).toBe(`${PAGE_MAX_WIDTH}px`);
    expect(column.style.paddingBottom).toBe(`${CONTENT_GUTTER_Y}px`);
  });

  it('sizes the header and tab strip as the loaded page draws them', () => {
    render(<VenueDetailLoading />);
    // No 150px block: the loaded header is the only thing above the tabs.
    expect(
      screen.getByTestId('venue-header-skeleton-desktop').style.height,
    ).toBe(`${VENUE_HEADER_HEIGHT.desktop}px`);
    expect(screen.getByTestId('venue-header-skeleton-phone').style.height).toBe(
      `${VENUE_HEADER_HEIGHT.phone}px`,
    );
    expect(screen.getByTestId('venue-tabs-skeleton').style.height).toBe(
      `${UNDERLINE_TAB_HEIGHT + 1}px`,
    );
  });

  it('derives the header height from VenueHeader’s parts', () => {
    // Desktop: 26px name at 1.5 (39) + 6 + 22 chip, over the 56 tile.
    // Phone: 22px name (33) + 2 + 12.5px neighbourhood (18.75) + 6 + 22,
    // then 12 and the 36 buttons.
    expect(VENUE_HEADER_HEIGHT).toEqual({ desktop: 67, phone: 129.75 });
    expect(UNDERLINE_TAB_HEIGHT).toBe(40);
  });

  it('matches the shared values: 18 gap, 1080 cap, 24 gutter', () => {
    expect([VENUE_PAGE_GAP, PAGE_MAX_WIDTH, CONTENT_GUTTER_Y]).toEqual([
      18, 1080, 24,
    ]);
  });
});
