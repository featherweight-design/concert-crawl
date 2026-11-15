import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const isFeatureEnabled = vi.fn();
vi.mock('../lib/feature-flags.js', () => ({ isFeatureEnabled }));

// The viewer the gate resolves when the flag is not on for everyone.
const auth = vi.hoisted(() => ({
  current: null as {
    userId: string;
    sessionClaims: { metadata: { role: string } };
  } | null,
}));
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => auth.current,
}));

const { requireFlag } = await import('./feature-flag.js');

const buildApp = () => {
  const app = new Hono();
  app.use('*', requireFlag('crews'));
  app.get('/thing', (ctx) => ctx.json({ success: true }));
  return app;
};

describe('requireFlag', () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset();
  });

  it('passes the request through when the flag is on', async () => {
    isFeatureEnabled.mockResolvedValue(true);
    const res = await buildApp().request('/thing');
    expect(res.status).toBe(200);
  });

  it('answers 404 when the flag is off', async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const res = await buildApp().request('/thing');
    expect(res.status).toBe(404);
  });

  it('answers exactly as an unrouted path does', async () => {
    isFeatureEnabled.mockResolvedValue(false);
    const gated = await buildApp().request('/thing');
    // Baseline from an ungated app, so this compares the gate's answer against
    // a genuine unrouted path rather than against itself.
    const unrouted = await new Hono().request('/no-such-path');
    expect(await gated.text()).toBe(await unrouted.text());
    expect(gated.headers.get('content-type')).toBe(
      unrouted.headers.get('content-type'),
    );
  });

  // The gate runs before the router's clerkMiddleware, so it has to find out who
  // is asking itself when the flag is at Me or Beta rather than Everyone.
  it('asks again with the viewer when the flag is not on for everyone', async () => {
    auth.current = {
      userId: 'beta-user',
      sessionClaims: { metadata: { role: 'beta' } },
    };
    isFeatureEnabled.mockImplementation(
      async (_key: string, viewer?: { userId: string; role: string | null }) =>
        viewer?.role === 'beta',
    );
    const res = await buildApp().request('/thing');
    expect(res.status).toBe(200);
    expect(isFeatureEnabled).toHaveBeenLastCalledWith('crews', {
      userId: 'beta-user',
      role: 'beta',
    });
    auth.current = null;
  });

  it('does not look the viewer up for a flag that is on for everyone', async () => {
    isFeatureEnabled.mockResolvedValue(true);
    await buildApp().request('/thing');
    expect(isFeatureEnabled).toHaveBeenCalledTimes(1);
  });

  it('answers 404 when the flag lookup throws', async () => {
    isFeatureEnabled.mockRejectedValue(new Error('boom'));
    const res = await buildApp().request('/thing');
    expect(res.status).toBe(404);
  });
});
