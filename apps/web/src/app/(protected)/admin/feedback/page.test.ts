import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  permanentRedirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

import FeedbackRedirect from './page';

type Query = Record<string, string | string[] | undefined>;

describe('old /admin/feedback URL', () => {
  it.each<[Query, string]>([
    [{}, '/admin/operations'],
    [{ status: 'unread' }, '/admin/operations?status=unread'],
    [{ tag: ['a', 'b'] }, '/admin/operations?tag=a&tag=b'],
  ])('forwards %o to Operations with its query kept', async (query, href) => {
    await expect(
      FeedbackRedirect({ searchParams: Promise.resolve(query) }),
    ).rejects.toThrow(`NEXT_REDIRECT ${href}`);
  });

  it('forwards with no search params at all', async () => {
    await expect(FeedbackRedirect({})).rejects.toThrow(
      'NEXT_REDIRECT /admin/operations',
    );
  });
});
