import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidElement } from 'react';
import type { InspectClientProps } from '@/components/admin/inspect/InspectClient';

const NOT_FOUND = 'NEXT_NOT_FOUND';
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error(NOT_FOUND);
  }),
}));
vi.mock('@/lib/auth', () => ({
  auth: async () => ({ getToken: async () => 'token' }),
  requireAdminUser: async () => undefined,
}));

const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class MockApiError extends Error {
    constructor(public readonly status: number) {
      super(`status ${status}`);
    }
  },
}));

/** Each path's answer; a function lets one path reject. A path with none is a 404. */
const responses = new Map<string, () => Promise<unknown>>();
const mockGet = vi.fn((path: string) => {
  const route = path.split('?')[0] ?? path;
  const answer = responses.get(route);
  return answer ? answer() : Promise.reject(new MockApiError(404));
});
vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  apiClient: { get: (path: string) => mockGet(path) },
}));
vi.mock('@/components/admin/inspect/InspectClient', () => ({
  InspectClient: () => null,
}));

import InspectPage from './page';

const run = (overrides: Record<string, unknown> = {}) => ({
  id: 'run-9',
  venueId: 'v-1',
  status: 'partial',
  reason: null,
  eventsFound: 28,
  eventsInserted: 0,
  durationMs: 212000,
  llmCostUsd: 0.14,
  errorMessage: null,
  createdAt: '2026-11-09T10:02:00.000Z',
  ...overrides,
});

const page = (id: string, httpStatus: number | null) => ({
  id,
  url: `https://example.com/${id}`,
  finalUrl: null,
  httpStatus,
  bytes: 1000,
  fetchMode: 'browser',
});

const render = async (
  pageParam?: string | string[],
  url?: string | string[],
) => {
  const element = await InspectPage({
    params: Promise.resolve({ id: 'v-1', runId: 'run-9' }),
    searchParams: Promise.resolve({
      ...(pageParam === undefined ? {} : { page: pageParam }),
      ...(url === undefined ? {} : { url }),
    }),
  });
  if (!isValidElement<InspectClientProps>(element)) {
    throw new Error('Expected the page to render the Inspect client');
  }
  return element.props;
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockGet.mockClear();
  responses.clear();
  responses.set('/v1/admin/venues/v-1', async () => ({
    id: 'v-1',
    name: 'Ball Arena',
    websiteUrl: 'https://example.com',
    latestRun: { id: 'run-10' },
  }));
  responses.set('/v1/admin/crawl/runs/run-9', async () => run());
  responses.set('/v1/admin/crawl/runs/run-9/pages', async () => [
    page('p1', 200),
    page('p2', 503),
    page('p3', 200),
  ]);
  responses.set('/v1/admin/crawl/runs', async () => [
    run({ id: 'run-10', status: 'success' }),
    run(),
    run({ id: 'run-8', status: 'failed' }),
    run({
      id: 'run-7',
      status: 'success',
      createdAt: '2026-11-07T10:01:00.000Z',
    }),
  ]);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe('/admin/venues/[id]/inspect/[runId]', () => {
  it('opens on the first failed page by default', async () => {
    const props = await render();
    expect(props.page?.id).toBe('p2');
    expect(props.pages?.map((one) => one.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('opens on the first page when none failed', async () => {
    responses.set('/v1/admin/crawl/runs/run-9/pages', async () => [
      page('p1', 200),
      page('p2', 200),
    ]);
    expect((await render()).page?.id).toBe('p1');
  });

  it('opens the page ?page= names, and ignores one that isn’t this run’s', async () => {
    expect((await render('p3')).page?.id).toBe('p3');
    expect((await render('elsewhere')).page?.id).toBe('p2');
    expect((await render(['p3', 'p3'])).page?.id).toBe('p2');
  });

  it('opens the page fetched from ?url= (Compare), by url then finalUrl', async () => {
    expect((await render(undefined, 'https://example.com/p3')).page?.id).toBe(
      'p3',
    );
    responses.set('/v1/admin/crawl/runs/run-9/pages', async () => [
      page('p1', 200),
      { ...page('p2', 503) },
      { ...page('p3', 200), finalUrl: 'https://example.com/landed' },
    ]);
    expect(
      (await render(undefined, 'https://example.com/landed')).page?.id,
    ).toBe('p3');
    expect((await render(undefined, 'https://nowhere.test/')).page?.id).toBe(
      'p2',
    );
  });

  it('fetches the venue, the run, its pages and the runs at once', async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    responses.set('/v1/admin/venues/v-1', async () => {
      await gate;
      return {
        id: 'v-1',
        name: 'Ball Arena',
        websiteUrl: 'https://example.com',
        latestRun: null,
      };
    });
    const pending = render();
    // The venue is held back: everything else must already have been asked.
    await vi.waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/v1/admin/venues/v-1'),
    );
    const paths = mockGet.mock.calls.map(([path]) => path);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/v1/admin/venues/v-1',
        '/v1/admin/crawl/runs/run-9',
        '/v1/admin/crawl/runs/run-9/pages',
        '/v1/admin/crawl/runs?venueId=v-1&limit=100',
      ]),
    );
    release();
    await pending;
  });

  it('hands over the venue, its latest run, and Compare’s earlier success', async () => {
    const props = await render();
    expect(props.venue).toEqual({
      id: 'v-1',
      name: 'Ball Arena',
      websiteUrl: 'https://example.com',
      latestRunId: 'run-10',
    });
    expect(props.run.id).toBe('run-9');
    expect(props.compare?.id).toBe('run-7');
    const paths = mockGet.mock.calls.map(([path]) => path);
    expect(paths).toContain('/v1/admin/crawl/runs?venueId=v-1&limit=100');
  });

  it('no earlier success is no Compare', async () => {
    responses.set('/v1/admin/crawl/runs', async () => [run()]);
    expect((await render()).compare).toBeNull();
  });

  it('is not found for an unknown venue (a 404), and logs it', async () => {
    responses.delete('/v1/admin/venues/v-1');
    await expect(render()).rejects.toThrow(NOT_FOUND);
    expect(errorSpy).toHaveBeenCalledWith(
      'InspectPage: could not load the venue or the run',
      expect.objectContaining({ id: 'v-1', runId: 'run-9' }),
    );
  });

  it('is not found for an unknown run (a 404)', async () => {
    responses.delete('/v1/admin/crawl/runs/run-9');
    await expect(render()).rejects.toThrow(NOT_FOUND);
  });

  it('any other failure of the venue or the run reaches the error boundary', async () => {
    responses.set('/v1/admin/venues/v-1', () =>
      Promise.reject(new MockApiError(500)),
    );
    await expect(render()).rejects.toThrow('status 500');
    responses.set('/v1/admin/venues/v-1', () =>
      Promise.reject(new TypeError('fetch failed')),
    );
    await expect(render()).rejects.toThrow('fetch failed');
    expect(errorSpy).toHaveBeenCalledWith(
      'InspectPage: could not load the venue or the run',
      expect.objectContaining({ runId: 'run-9' }),
    );
  });

  it('is not found for another venue’s run', async () => {
    responses.set('/v1/admin/crawl/runs/run-9', async () =>
      run({ venueId: 'v-2' }),
    );
    await expect(render()).rejects.toThrow(NOT_FOUND);
  });

  it('pages that fail to load are null (Couldn’t load), and log', async () => {
    responses.set('/v1/admin/crawl/runs/run-9/pages', () =>
      Promise.reject(new Error('boom')),
    );
    const props = await render();
    expect(props.pages).toBeNull();
    expect(props.page).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'InspectPage: could not load the pages',
      expect.objectContaining({ runId: 'run-9' }),
    );
  });

  it('a run with no pages has no page', async () => {
    responses.set('/v1/admin/crawl/runs/run-9/pages', async () => []);
    const props = await render();
    expect(props.pages).toEqual([]);
    expect(props.page).toBeNull();
  });
});
