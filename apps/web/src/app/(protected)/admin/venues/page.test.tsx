// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { getVenues, getNeedsYou } = vi.hoisted(() => ({
  getVenues: vi.fn(),
  getNeedsYou: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  requireAdminUser: vi.fn(),
  auth: async () => ({ getToken: async () => 'token-1' }),
}));
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (path: string) =>
      path === '/v1/admin/venues' ? getVenues() : getNeedsYou(),
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/admin/AddVenueModal', () => ({
  AddVenueModal: () => null,
}));
vi.mock('@/lib/actions/venues', () => ({
  pauseCrawling: vi.fn(),
  recrawlVenue: vi.fn(),
}));

import AdminVenuesPage from './page';

const row = (id: string) => ({
  id,
  name: id,
  slug: id.toLowerCase(),
  active: true,
  verified: true,
  crawlPausedAt: null,
  blockedAt: null,
  consecutiveFailures: 0,
  robotsTxtAllowed: true,
  removedAt: null,
  neighborhood: null,
  eventCount: 1,
  lastRunStatus: 'success',
  latestRun: null,
});

const renderPage = async () => {
  const page = await AdminVenuesPage({});
  if (page) render(page);
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Venues page: the two loads are independent', () => {
  it("says Couldn't load when venues fails, even with Needs you loaded", async () => {
    getVenues.mockRejectedValue(new Error('venues down'));
    getNeedsYou.mockResolvedValue([{ venueId: 'Ball Arena' }]);
    await renderPage();
    expect(screen.getByText('Couldn’t load Venues')).toBeInTheDocument();
  });

  it('renders the list without dots or the chip when Needs you fails', async () => {
    getVenues.mockResolvedValue([row('Ball Arena')]);
    getNeedsYou.mockRejectedValue(new Error('needs-you down'));
    await renderPage();
    expect(screen.getByTestId('venue-row')).toBeInTheDocument();
    expect(screen.queryByTestId('needs-you-dot')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Needs a look/ })).toBeNull();
  });

  it('treats a malformed Needs you reply as no Needs you', async () => {
    getVenues.mockResolvedValue([row('Ball Arena')]);
    getNeedsYou.mockResolvedValue([{ venueId: 42 }]);
    await renderPage();
    expect(screen.getByTestId('venue-row')).toBeInTheDocument();
    expect(screen.queryByTestId('needs-you-dot')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Needs a look/ })).toBeNull();
  });

  it('dots a venue when both load', async () => {
    getVenues.mockResolvedValue([row('Ball Arena'), row('Globe Hall')]);
    getNeedsYou.mockResolvedValue([{ venueId: 'Globe Hall', kind: 'bug' }]);
    await renderPage();
    expect(screen.getAllByTestId('needs-you-dot')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /^Needs a look/ }),
    ).toHaveTextContent('1');
  });
});
