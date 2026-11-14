import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

import CodesRedirect from './page';
import PostersRedirect from './posters/page';

type Query = Record<string, string | string[] | undefined>;

describe('old invite-codes URLs', () => {
  it.each<[Query, string]>([
    [{}, '/admin/people/invite-codes'],
    [{ code: 'abc' }, '/admin/people/invite-codes?code=abc'],
  ])('forwards the Codes page %o to People', async (query, href) => {
    await expect(
      CodesRedirect({ searchParams: Promise.resolve(query) }),
    ).rejects.toThrow(`NEXT_REDIRECT ${href}`);
  });

  it.each<[Query, string]>([
    [{}, '/admin/people/invite-codes/posters'],
    [
      { code: 'code-1', look: 'paper', tabs: '1' },
      '/admin/people/invite-codes/posters?code=code-1&look=paper&tabs=1',
    ],
    [
      { look: 'neon', extra: ['a', 'b'] },
      '/admin/people/invite-codes/posters?look=neon&extra=a&extra=b',
    ],
  ])('forwards Posters %o with its query kept', async (query, href) => {
    await expect(
      PostersRedirect({ searchParams: Promise.resolve(query) }),
    ).rejects.toThrow(`NEXT_REDIRECT ${href}`);
  });

  it('forwards with no search params at all', async () => {
    await expect(PostersRedirect({})).rejects.toThrow(
      'NEXT_REDIRECT /admin/people/invite-codes/posters',
    );
  });
});
