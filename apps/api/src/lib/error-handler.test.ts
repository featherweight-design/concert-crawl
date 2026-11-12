import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

// Sentry mock must be hoisted before the module under test imports it,
// mirroring apps/api/src/routes/admin/prices.integration.test.ts:5-14.
const tags = vi.hoisted(() => new Map<string, string>());

vi.mock('@sentry/hono/node', async () => {
  const actual =
    await vi.importActual<typeof import('@sentry/hono/node')>(
      '@sentry/hono/node',
    );
  return {
    ...actual,
    captureException: vi.fn(),
    // Runs the callback against a recording scope so tests can read the tags.
    withScope: vi.fn((callback: (scope: unknown) => void) =>
      callback({
        setTag: (key: string, value: string) => tags.set(key, value),
        setTags: (all: Record<string, string>) => {
          for (const [key, value] of Object.entries(all)) tags.set(key, value);
        },
      }),
    ),
  };
});

vi.mock('./logger.js', () => ({
  apiLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const { captureException } = await import('@sentry/hono/node');
const { apiLogger } = await import('./logger.js');
const { errorHandler } = await import('./error-handler.js');

function appWithHandler() {
  const app = new Hono();
  app.post(
    '/validated',
    zValidator('json', z.object({ name: z.string() })),
    (ctx) => ctx.json({ success: true }),
  );
  app.get('/users/:id/boom', () => {
    throw new Error('kaboom');
  });
  app.get('/boom', () => {
    throw new Error('kaboom');
  });
  app.get('/upstream-down', () => {
    throw new HTTPException(503, { message: 'Upstream unavailable' });
  });
  app.onError(errorHandler);
  return app;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tags.clear();
    delete process.env['SENTRY_USER_HASH_KEY'];
  });

  // The production regression: 12 Sentry error-level events (CONCERT-CRAWL-API-A/B)
  // from clients POSTing unparseable bodies, which also tripped the
  // sustained-error-volume monitor.
  it('returns 400 and does NOT report to Sentry for an unparseable JSON body', async () => {
    const res = await appWithHandler().request('/validated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      success: false,
      error: 'Malformed JSON in request body',
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports unexpected errors to Sentry as a 500', async () => {
    const res = await appWithHandler().request('/boom');

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      success: false,
      error: 'Internal server error',
    });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(apiLogger.error).toHaveBeenCalled();
  });

  // A 5xx HTTPException means something on our side failed, so it keeps the
  // pre-existing treatment: reported to Sentry and answered as a generic 500.
  it('still reports 5xx HTTPExceptions to Sentry', async () => {
    const res = await appWithHandler().request('/upstream-down');

    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('logs client errors at warn, not error', async () => {
    await appWithHandler().request('/validated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'nope',
    });

    expect(apiLogger.warn).toHaveBeenCalled();
    expect(apiLogger.error).not.toHaveBeenCalled();
  });

  it('tags the route pattern, never the raw URL', async () => {
    await appWithHandler().request('/users/user_abc123/boom');

    expect(tags.get('route')).toBe('/users/:id/boom');
    expect([...tags.values()].join(' ')).not.toContain('user_abc123');
  });

  it('tags tier unknown and omits userHash for an anonymous request', async () => {
    process.env['SENTRY_USER_HASH_KEY'] = 'test-key';
    await appWithHandler().request('/boom');

    expect(tags.get('tier')).toBe('unknown');
    expect(tags.has('userHash')).toBe(false);
  });

  it('tags tier and a hashed user, never the raw Clerk id', async () => {
    process.env['SENTRY_USER_HASH_KEY'] = 'test-key';
    const app = signedInApp({ metadata: { plan: 'Supporter' } });
    await app.request('/boom');

    expect(tags.get('tier')).toBe('supporter');
    expect(tags.get('userHash')).toMatch(/^[0-9a-f]{16}$/);
    expect([...tags.values()].join(' ')).not.toContain('user_2abcSECRET');
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  // Tagging is best effort: if hashing throws, the original error must still
  // be captured, logged and answered as a 500, not lost to a bare Hono 500.
  it('still captures, logs and answers when the user hash throws', async () => {
    process.env['SENTRY_USER_HASH_KEY'] = 'test-key';
    const importKey = vi
      .spyOn(crypto.subtle, 'importKey')
      .mockRejectedValue(new Error('crypto unavailable'));
    try {
      const res = await signedInApp({}).request('/boom');

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Internal server error',
      });
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'kaboom' }),
        expect.anything(),
      );
      expect(apiLogger.error).toHaveBeenCalledTimes(1);
      expect(tags.has('userHash')).toBe(false);
      // The tags that do not depend on the hash survive, and the failure is
      // logged rather than silent.
      expect(tags.get('route')).toBe('/boom');
      expect(tags.has('tier')).toBe(true);
      expect(apiLogger.warn).toHaveBeenCalledTimes(1);
    } finally {
      importKey.mockRestore();
    }
  });

  it('leaves userHash off when the key is unset', async () => {
    await signedInApp({}).request('/boom');

    expect(tags.has('userHash')).toBe(false);
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});

function signedInApp(sessionClaims: unknown) {
  const app = new Hono();
  app.use('*', async (ctx, next) => {
    ctx.set(
      'clerkAuth' as never,
      { userId: 'user_2abcSECRET', sessionClaims } as never,
    );
    await next();
  });
  app.get('/boom', () => {
    throw new Error('kaboom');
  });
  app.onError(errorHandler);
  return app;
}
