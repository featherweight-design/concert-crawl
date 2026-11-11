import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({
  publicApiClient: { get: (path: string) => mockGet(path) },
  ApiError: class ApiError extends Error {},
}));

// Denver's today pinned to 2026-11-11.
vi.mock('@/lib/time', () => ({
  denverTodayUtcMs: () => Date.UTC(2026, 10, 11),
}));

let launched = false;
vi.mock('@/lib/launch-mode', () => ({
  isPublicBrowseEnabled: () => launched,
}));

const row = (id: string, date: string) => ({
  id,
  artist: `Artist ${id}`,
  date,
  showTime: '20:00:00',
  genre: ['rock'],
  imageUrl: null,
  artistPhotoUrl: null,
  venue: { name: 'Venue', city: 'Denver, CO' },
});

const EVENTS = {
  data: [
    row('tonight', '2026-11-11'),
    row('sunday', '2026-11-15'),
    row('week-end', '2026-11-17'),
    row('next-week', '2026-11-18'),
  ],
  total: 4,
  limit: 10,
};

const VENUES = [
  { slug: 'busy', name: 'Busy', upcomingCount: 3 },
  { slug: 'quiet', name: 'Quiet', upcomingCount: 0 },
];

beforeEach(() => {
  mockGet.mockReset();
  mockGet.mockImplementation(async (path: string) =>
    path.startsWith('/v1/venues') ? VENUES : EVENTS,
  );
});

const render = async () => {
  const { default: LandingPage } = await import('./page');
  return (await LandingPage()) as { props: Record<string, unknown> };
};

describe('app/page — the private-beta landing data', () => {
  beforeEach(() => {
    launched = false;
  });

  it("keeps only this week's shows, and marks tonight's", async () => {
    const { props } = await render();
    const shows = props['inviteShows'] as { id: string; tonight: boolean }[];
    expect(shows.map((show) => show.id)).toEqual([
      'tonight',
      'sunday',
      'week-end',
    ]);
    expect(shows.map((show) => show.tonight)).toEqual([true, false, false]);
  });

  it('counts only venues with upcoming shows, and skips the week probe', async () => {
    const { props } = await render();
    expect(props['inviteVenues']).toEqual([{ slug: 'busy', name: 'Busy' }]);
    expect(mockGet.mock.calls.map(([path]) => path)).toEqual([
      '/v1/events?limit=10',
      '/v1/venues',
    ]);
  });
});

describe('app/page — the public landing data', () => {
  it('fetches the week count, not the venue row', async () => {
    launched = true;
    const { props } = await render();
    expect(props['inviteVenues']).toBeUndefined();
    const paths = mockGet.mock.calls.map(([path]) => path as string);
    expect(paths).not.toContain('/v1/venues');
    expect(paths.some((path) => path.includes('&to='))).toBe(true);
  });
});
