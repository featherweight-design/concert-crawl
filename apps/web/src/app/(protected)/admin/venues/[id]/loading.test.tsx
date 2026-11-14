// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  CONTENT_GUTTER_Y,
  PAGE_MAX_WIDTH,
  VENUE_PAGE_GAP,
} from '@/components/admin/shell/content-pane';
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

  it('matches the shared values: 18 gap, 1080 cap, 24 gutter', () => {
    expect([VENUE_PAGE_GAP, PAGE_MAX_WIDTH, CONTENT_GUTTER_Y]).toEqual([
      18, 1080, 24,
    ]);
  });
});
