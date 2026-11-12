import { beforeEach, describe, expect, it, vi } from 'vitest';

// pauseCrawling used to send only `reason`, so a note or a resume choice never
// reached POST /v1/admin/venues/:id/crawl-pause. These assert the whole body
// goes through, and that a reason-only pause still sends a valid body.

vi.mock('@clerk/nextjs/server', () => ({
  auth: () => Promise.resolve({ getToken: () => Promise.resolve('token-1') }),
  currentUser: () => Promise.resolve(null),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { apiPost } = vi.hoisted(() => ({ apiPost: vi.fn() }));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: apiPost, delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const { pauseCrawling } = await import('./venues');

beforeEach(() => {
  apiPost.mockReset().mockResolvedValue({});
});

describe('pauseCrawling — request body', () => {
  it('sends the note and resume with the reason', async () => {
    await pauseCrawling('venue-1', {
      reason: 'other',
      note: 'venue asked us to stop',
      resume: { mode: 'in_days', days: 14 },
    });

    expect(apiPost).toHaveBeenCalledWith(
      '/v1/admin/venues/venue-1/crawl-pause',
      'token-1',
      {
        reason: 'other',
        note: 'venue asked us to stop',
        resume: { mode: 'in_days', days: 14 },
      },
    );
  });

  it('sends a resume date', async () => {
    await pauseCrawling('venue-1', {
      reason: 'site_broken_or_moved',
      resume: { mode: 'on', date: '2026-12-01' },
    });

    expect(apiPost.mock.calls[0]?.[2]).toEqual({
      reason: 'site_broken_or_moved',
      resume: { mode: 'on', date: '2026-12-01' },
    });
  });

  it('sends a reason-only pause as just the reason', async () => {
    await pauseCrawling('venue-1', { reason: 'waiting_on_permission' });

    expect(apiPost.mock.calls[0]?.[2]).toStrictEqual({
      reason: 'waiting_on_permission',
    });
  });
});
