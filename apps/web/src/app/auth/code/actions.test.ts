// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: async () => ({ set: vi.fn(), delete: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock('@/lib/api', () => ({ serviceKeyHeaders: () => ({}) }));
vi.mock('@/lib/invite-cookie', () => ({
  signInviteCookie: () => 'signed',
  INVITE_COOKIE_NAME: 'invite_verified',
  INVITE_COOKIE_MAX_AGE: 60,
  RETURN_PATH_COOKIE_NAME: 'return_path',
}));

import { validateAndSetInviteCode } from './actions';

const CODE = 'BETA-AB12-CD34';

const answer = (status: number, body: unknown): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
      }),
    ),
  );
};

beforeEach(() => {
  vi.stubEnv('INVITE_COOKIE_SECRET', 'secret');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// `code-ended-fan-m`: 410 is "expired" or "ended" (revoked); the body says which.
describe('validateAndSetInviteCode 410 answers', () => {
  it('maps a revoked code (error "ended") to ended', async () => {
    answer(410, { success: false, error: 'ended' });
    expect(await validateAndSetInviteCode(CODE)).toEqual({
      ok: false,
      error: 'ended',
    });
  });

  it('keeps an expired code as expired', async () => {
    answer(410, { success: false, error: 'expired' });
    expect(await validateAndSetInviteCode(CODE)).toEqual({
      ok: false,
      error: 'expired',
    });
  });

  it('reads a 410 with no usable body as expired, the older answer', async () => {
    answer(410, 'gone');
    expect(await validateAndSetInviteCode(CODE)).toEqual({
      ok: false,
      error: 'expired',
    });
  });
});
