import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT ${href}`);
  },
}));

import InviteCodePosterRedirect from './page';

const visit = (query: Record<string, string> = {}) =>
  InviteCodePosterRedirect({
    params: Promise.resolve({ id: 'code-1' }),
    searchParams: Promise.resolve(query),
  });

describe('old poster URL', () => {
  it.each([
    [{}, '/admin/invite-codes/posters?code=code-1'],
    [
      { look: 'paper', tabs: '1' },
      '/admin/invite-codes/posters?code=code-1&look=paper&tabs=1',
    ],
    [{ look: 'neon', tabs: 'yes' }, '/admin/invite-codes/posters?code=code-1'],
  ])('redirects %o to the Posters tab', async (query, href) => {
    await expect(visit(query)).rejects.toThrow(`NEXT_REDIRECT ${href}`);
  });
});
