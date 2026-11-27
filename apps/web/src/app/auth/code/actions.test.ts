// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = vi.hoisted(() => ({ set: vi.fn(), delete: vi.fn() }));
vi.mock('next/headers', () => ({
  cookies: async () => jar,
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
  INVITE_COOKIE_PATH: '/',
  RETURN_PATH_COOKIE_NAME: 'return_path',
}));

import { releaseInviteCode, validateAndSetInviteCode } from './actions';

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

describe('releaseInviteCode', () => {
  it('clears the invite and the return-path cookies, and nothing else', async () => {
    jar.delete.mockClear();
    await releaseInviteCode();
    expect(jar.delete.mock.calls.map(([name]) => name).sort()).toEqual([
      'invite_verified',
      'return_path',
    ]);
    expect(jar.set).not.toHaveBeenCalled();
  });
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
