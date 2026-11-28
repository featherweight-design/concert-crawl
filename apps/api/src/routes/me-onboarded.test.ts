import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  userId: 'user_1' as string | null,
  publicMetadata: {} as Record<string, unknown>,
  getUserFails: false,
  updateUserMetadata: vi.fn(),
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => (state.userId ? { userId: state.userId } : null),
}));

vi.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: () =>
        state.getUserFails
          ? Promise.reject(new Error('clerk down'))
          : Promise.resolve({ publicMetadata: state.publicMetadata }),
      updateUserMetadata: state.updateUserMetadata,
    },
  }),
}));

import { meOnboardedRouter } from './me-onboarded.js';

const app = new Hono().route('/v1/me', meOnboardedRouter);

const post = (body: unknown = {}) =>
  app.request('/v1/me/onboarded', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_x');
  state.userId = 'user_1';
  state.publicMetadata = { role: 'user', plan: 'premium_gifted' };
  state.getUserFails = false;
  state.updateUserMetadata.mockReset().mockResolvedValue({});
});

describe('POST /v1/me/onboarded', () => {
  it('stamps onboardedAt, merging so role and plan are kept', async () => {
    const res = await post();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.onboardedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
    // Only the new key is sent: updateUserMetadata merges it into the rest.
    expect(state.updateUserMetadata).toHaveBeenCalledWith('user_1', {
      publicMetadata: { onboardedAt: json.data.onboardedAt },
    });
  });

  it('keeps the first stamp on a repeat call', async () => {
    state.publicMetadata.onboardedAt = '2026-11-27T10:00:00.000Z';
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).data.onboardedAt).toBe(
      '2026-11-27T10:00:00.000Z',
    );
    expect(state.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('replaces a malformed stored value', async () => {
    state.publicMetadata.onboardedAt = 'yesterday';
    const res = await post();
    expect(res.status).toBe(200);
    expect(state.updateUserMetadata).toHaveBeenCalledTimes(1);
  });

  it('is 401 signed out', async () => {
    state.userId = null;
    expect((await post()).status).toBe(401);
    expect(state.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('rejects a body with fields: the server sets the time', async () => {
    const res = await post({ onboardedAt: '2020-01-01T00:00:00.000Z' });
    expect(res.status).toBe(400);
    expect(state.updateUserMetadata).not.toHaveBeenCalled();
  });

  it('is 502 when Clerk fails', async () => {
    state.getUserFails = true;
    expect((await post()).status).toBe(502);
  });

  it('is 503 with no Clerk key', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '');
    expect((await post()).status).toBe(503);
  });
});
