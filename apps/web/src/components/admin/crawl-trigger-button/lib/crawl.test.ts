import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(),
  },
}));

import { triggerVenueCrawl } from './crawl';

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({ triggerId: 'trigger-1' });
});

describe('triggerVenueCrawl', () => {
  it('sends force in the body only when forced', async () => {
    await triggerVenueCrawl('venue-1', 'token', true);
    expect(mockPost).toHaveBeenLastCalledWith(
      '/v1/admin/crawl/venue-1',
      'token',
      { force: true },
    );
  });

  it('sends an empty body when not forced', async () => {
    await triggerVenueCrawl('venue-1', 'token', false);
    expect(mockPost).toHaveBeenLastCalledWith(
      '/v1/admin/crawl/venue-1',
      'token',
      {},
    );
    await triggerVenueCrawl('venue-1', 'token');
    expect(mockPost).toHaveBeenLastCalledWith(
      '/v1/admin/crawl/venue-1',
      'token',
      {},
    );
  });

  it('returns the queued trigger id', async () => {
    expect(await triggerVenueCrawl('venue-1', 'token')).toEqual({
      triggerId: 'trigger-1',
    });
  });
});
