import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('./SignInFlow', () => ({ SignInFlow: () => null }));

import SignInNewPage from './page';

beforeEach(() => {
  mocks.auth.mockReset().mockResolvedValue({ userId: null });
  mocks.redirect.mockClear();
});

const visit = (redirect_url?: string | string[]) =>
  SignInNewPage({
    searchParams: Promise.resolve(redirect_url ? { redirect_url } : {}),
  });

describe('/sign-in/new', () => {
  it('lets a signed-out visitor through with the sanitized return path', async () => {
    const tree = (await visit('/events/42')) as { props: { returnTo: string } };
    expect(tree.props.returnTo).toBe('/events/42');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('sends a signed-in visitor straight to where they were headed', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    await expect(visit('/watching')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/watching');
  });

  it('falls back to /events for an off-site or malformed return path', async () => {
    for (const bad of ['//evil.com', 'https://evil.com', '/%5Cevil.com']) {
      const tree = (await visit(bad)) as { props: { returnTo: string } };
      expect(tree.props.returnTo).toBe('/events');
    }
  });

  it('passes how a Google attempt ended, and nothing it does not know', async () => {
    const read = async (google: string) =>
      (
        (await SignInNewPage({
          searchParams: Promise.resolve({ google }),
        })) as { props: { google: string | null } }
      ).props.google;
    expect(await read('refused')).toBe('refused');
    expect(await read('cancelled')).toBe('cancelled');
    expect(await read('<script>')).toBeNull();
  });

  it('takes the first of a repeated parameter', async () => {
    const tree = (await visit(['/artists/a', '/events'])) as {
      props: { returnTo: string };
    };
    expect(tree.props.returnTo).toBe('/artists/a');
  });
});
