import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('./ForgotFlow', () => ({ ForgotFlow: () => null }));

import ForgotPage from './page';

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue({ userId: null });
  mocks.redirect.mockClear();
});

const visit = (redirect_url?: string | string[]) =>
  ForgotPage({
    searchParams: Promise.resolve(redirect_url ? { redirect_url } : {}),
  });

describe('/sign-in/forgot', () => {
  it('lets a signed-out visitor through with the sanitized return path', async () => {
    const tree = (await visit('/events/42')) as { props: { returnTo: string } };
    expect(tree.props.returnTo).toBe('/events/42');
  });

  it('sends a signed-in visitor straight to where they were headed', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    await expect(visit('/watching')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/watching');
  });

  it('falls back to /events for an off-site return path', async () => {
    for (const bad of ['//evil.com', 'https://evil.com']) {
      const tree = (await visit(bad)) as { props: { returnTo: string } };
      expect(tree.props.returnTo).toBe('/events');
    }
  });
});
