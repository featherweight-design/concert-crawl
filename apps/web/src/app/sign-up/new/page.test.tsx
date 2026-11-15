import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  }),
  cookies: vi.fn(),
  publicBrowse: vi.fn(),
  verify: vi.fn(),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('next/headers', () => ({ cookies: mocks.cookies }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/launch-mode', () => ({
  isPublicBrowseEnabled: mocks.publicBrowse,
}));
vi.mock('@/lib/invite-cookie', () => ({
  INVITE_COOKIE_NAME: 'invite_verified',
  verifyInviteCookie: mocks.verify,
}));
vi.mock('./SignUpFlow', () => ({ SignUpFlow: () => null }));
vi.mock('@/app/legal/TermsBody', () => ({ TermsBody: () => null }));
vi.mock('@/app/legal/PrivacyBody', () => ({ PrivacyBody: () => null }));
vi.mock('@/app/legal/BetaBody', () => ({ BetaBody: () => null }));

import SignUpNewPage from './page';

interface Props {
  beta: boolean;
  inviteCode: string | null;
  changeHref: string;
  legal: { beta: unknown };
}

beforeEach(() => {
  vi.stubEnv('INVITE_COOKIE_SECRET', 'secret');
  mocks.auth.mockReset().mockResolvedValue({ userId: null });
  mocks.redirect.mockClear();
  mocks.publicBrowse.mockReset().mockReturnValue(false);
  mocks.verify.mockReset().mockReturnValue({ code: 'BETA-AB12-CD34' });
  mocks.cookies.mockReset().mockResolvedValue({
    get: (name: string) =>
      name === 'invite_verified' ? { value: 'signed' } : undefined,
  });
});

const visit = async (params: Record<string, string | string[]> = {}) =>
  (await SignUpNewPage({ searchParams: Promise.resolve(params) })) as {
    props: Props;
  };

describe('/sign-up/new', () => {
  it('sends a signed-in visitor to the same /auth/complete target as the stock page', async () => {
    mocks.auth.mockResolvedValue({ userId: 'user_1' });
    await expect(
      visit({ redirect_url: '/e/abc', tier: 'premium' }),
    ).rejects.toThrow(
      'NEXT_REDIRECT:/auth/complete?return=%2Fe%2Fabc&tier=premium',
    );
  });

  it('before launch, reads the invite code from the signed cookie', async () => {
    const { props } = await visit();
    expect(props.beta).toBe(true);
    expect(props.inviteCode).toBe('BETA-AB12-CD34');
    expect(props.legal.beta).not.toBeNull();
  });

  it('before launch, shows no chip for a forged or missing cookie', async () => {
    mocks.verify.mockReturnValue(null);
    expect((await visit()).props.inviteCode).toBeNull();
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    expect((await visit()).props.inviteCode).toBeNull();
  });

  it('after launch, has no invite, no Beta Agreement, and never reads the cookie', async () => {
    mocks.publicBrowse.mockReturnValue(true);
    const { props } = await visit();
    expect(props.beta).toBe(false);
    expect(props.inviteCode).toBeNull();
    expect(props.legal.beta).toBeNull();
    expect(mocks.cookies).not.toHaveBeenCalled();
  });

  it('carries only a safe destination to "Use a different code"', async () => {
    expect((await visit({ redirect_url: '/e/abc' })).props.changeHref).toBe(
      '/auth/code?redirect_url=%2Fe%2Fabc',
    );
    expect(
      (await visit({ redirect_url: 'https://evil.test' })).props.changeHref,
    ).toBe('/auth/code');
  });
});
