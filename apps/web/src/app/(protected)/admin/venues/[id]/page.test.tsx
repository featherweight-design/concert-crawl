import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidElement } from 'react';
import type { OverviewData } from '@/components/admin/venues/overview/overview-data';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
  requireAdminUser: async () => undefined,
}));

/** Each path's answer; a function lets one path reject. */
const responses = new Map<string, () => Promise<unknown>>();
const mockGet = vi.fn((path: string) => {
  const route = path.split('?')[0] ?? path;
  const answer = responses.get(route);
  return answer ? answer() : Promise.resolve([]);
});
vi.mock('@/lib/api', () => ({
  apiClient: { get: (path: string) => mockGet(path) },
}));
vi.mock('@/components/admin/VenueDetailsClient', () => ({
  VenueDetailsClient: () => null,
}));

import VenueDetailPage from './page';

const RUNS = '/v1/admin/crawl/runs';
const NEEDS_YOU = '/v1/admin/needs-you';
const SNOOZES = '/v1/admin/needs-you/snoozes';

const run = {
  id: 'r-1',
  status: 'success',
  reason: null,
  createdAt: '2026-11-11T10:02:00.000Z',
};

const render = async (tab?: string | string[]) => {
  const element = await VenueDetailPage({
    params: Promise.resolve({ id: 'v-1' }),
    searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
  });
  if (
    !isValidElement<{ initialTab: unknown; overview: OverviewData }>(element)
  ) {
    throw new Error('Expected the page to render the venue client');
  }
  return element.props;
};

const openedOn = async (tab?: string | string[]) =>
  (await render(tab)).initialTab;

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockGet.mockClear();
  responses.clear();
  responses.set('/v1/admin/venues/v-1', async () => ({
    id: 'v-1',
    name: 'Bluebird',
  }));
  responses.set('/v1/admin/venues/v-1/guide', async () => ({
    chips: [],
    insiderTip: null,
    publishedAt: null,
  }));
  responses.set(RUNS, async () => [run]);
  responses.set(NEEDS_YOU, async () => []);
  responses.set(SNOOZES, async () => []);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('/admin/venues/[id] ?tab=', () => {
  it('opens the tab the URL names', async () => {
    expect(await openedOn('runs')).toBe('runs');
    expect(await openedOn('guide')).toBe('guide');
  });

  it('opens Overview with no tab', async () => {
    expect(await openedOn()).toBe('overview');
  });

  it('opens Overview for an unknown or repeated tab, without throwing', async () => {
    expect(await openedOn('inspect')).toBe('overview');
    expect(await openedOn(['runs', 'source'])).toBe('overview');
  });
});

describe('/admin/venues/[id] Overview fetches', () => {
  it('asks for this venue’s last 14 runs, its Needs you items and snoozes', async () => {
    const { overview } = await render();
    const paths = mockGet.mock.calls.map(([path]) => path);
    expect(paths).toContain(`${RUNS}?venueId=v-1&limit=14`);
    expect(paths).toContain(`${NEEDS_YOU}?venueId=v-1`);
    expect(paths).toContain(`${SNOOZES}?venueId=v-1`);
    expect(overview).toEqual({ runs: [run], needsYou: [], snoozes: [] });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('a failed fetch is null for that slice only, and logs', async () => {
    responses.set(SNOOZES, () => Promise.reject(new Error('boom')));
    const { overview } = await render();
    expect(overview).toEqual({ runs: [run], needsYou: [], snoozes: null });
    expect(errorSpy).toHaveBeenCalledWith(
      'VenueDetailPage: could not load snoozes',
      expect.objectContaining({ id: 'v-1' }),
    );
  });

  it('a body of the wrong shape is null for that slice only, and logs', async () => {
    responses.set(RUNS, async () => ({ data: [run] }));
    const { overview } = await render();
    expect(overview).toEqual({ runs: null, needsYou: [], snoozes: [] });
    expect(errorSpy).toHaveBeenCalledWith(
      'VenueDetailPage: runs: unexpected shape',
      { id: 'v-1' },
    );
  });
});
