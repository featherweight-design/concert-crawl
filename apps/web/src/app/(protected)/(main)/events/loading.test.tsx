// @vitest-environment jsdom

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '@/test-utils/match-media';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

let authUserId: string | null = 'user_entitled';

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ userId: authUserId }),
}));

let urlSearch = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(urlSearch),
}));

import EventsLoading from './loading';

const renderLoading = async () => render(await EventsLoading());

// The fallback's pink wave follows reduced motion through matchMedia, which
// jsdom doesn't ship.
beforeEach(() => {
  stubMatchMedia(false);
  urlSearch = '';
});

// The page draws a shelf only in the list view with no crew lens
// (isShelfSlotOpen); the fallback must not ghost one anywhere else.
describe('EventsLoading follow shelf slot', () => {
  it('draws the follow shelf skeleton in the plain list view', async () => {
    authUserId = 'user_entitled';
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton')).not.toBeNull();
  });

  it('draws it for an explicit list view with other filters', async () => {
    authUserId = 'user_entitled';
    urlSearch = 'view=list&genre=rock';
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton')).not.toBeNull();
  });

  it('draws no shelf skeleton in the calendar view', async () => {
    authUserId = 'user_entitled';
    urlSearch = 'view=cal';
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton')).toBeNull();
  });

  it('draws no shelf skeleton under a crew lens', async () => {
    authUserId = 'user_entitled';
    urlSearch = 'crew=crew_1';
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton')).toBeNull();
  });

  it('gives a signed-out visitor the starter head with its body line', async () => {
    authUserId = null;
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton-body')).not.toBeNull();
  });

  it('draws no body line for a signed-in viewer', async () => {
    authUserId = 'user_entitled';
    const { queryByTestId } = await renderLoading();
    expect(queryByTestId('follow-shelf-skeleton-body')).toBeNull();
  });
});

describe('EventsLoading B+ first load', () => {
  it('shows the pink wave beside "Loading shows" and skeleton rows', async () => {
    authUserId = 'user_entitled';
    const { getByRole, getAllByTestId, container } = await renderLoading();
    expect(getByRole('status').textContent).toContain(
      CONSUMER_COPY.loadingShows,
    );
    expect(getAllByTestId('browse-row-skeleton').length).toBeGreaterThan(0);
    // The hand-rolled pulse and top progress bar are gone (rule 9 and 10).
    expect(container.innerHTML).not.toContain('skeletonPulse');
    expect(container.innerHTML).not.toContain('navProgress');
  });
});

describe('EventsLoading overflow', () => {
  it('does not let the full-bleed skeleton row leak horizontal overflow', async () => {
    // The browse page's overflow regression (#33) came from this exact
    // -mx-4 card row; page.tsx clips it at <main> and the fallback must too.
    authUserId = 'user_entitled';
    const { container } = await renderLoading();
    const main = container.querySelector('main');
    expect(main?.className).toContain('overflow-x-clip');
  });
});
