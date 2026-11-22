import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string;
      sessionClaims: { metadata?: { role?: string } };
    } | null,
  },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { createApp } from '../app.js';
import { clearTables } from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';
import { feedback } from '@concert-crawl/db';
import { MAX_FEEDBACK_SCREENSHOT_CHARS } from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { apiLogger } from '../lib/logger.js';
import { MAX_FEEDBACK_BODY_BYTES } from './feedback.js';

const app = createApp();

function setAuth(userId: string): void {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'user' } },
  };
}

function clearAuth(): void {
  authState.current = null;
}

beforeEach(async () => {
  clearAuth();
  await clearTables();
});

describe('POST /v1/feedback', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'test',
        pageUrl: '/events',
      }),
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 422 when category is missing', async () => {
    setAuth('user-validate-1');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'test', pageUrl: '/events' }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('returns 422 when message is empty', async () => {
    setAuth('user-validate-2');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: '',
        pageUrl: '/events',
      }),
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });

  it('inserts feedback and returns 201', async () => {
    setAuth('user-insert-abc');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'idea',
        message: 'Love this app.',
        pageUrl: '/events',
        metadata: { theme: 'electric', build: 'dev', device: 'Mac' },
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean };
    expect(body).toEqual({ success: true });

    const rows = await testDb
      .select()
      .from(feedback)
      .where(eq(feedback.userId, 'user-insert-abc'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.category).toBe('idea');
    expect(rows[0]?.message).toBe('Love this app.');
    expect(rows[0]?.userId).toBe('user-insert-abc');
    expect(rows[0]?.pageUrl).toBe('/events');
    expect(rows[0]?.metadata).toMatchObject({
      theme: 'electric',
      build: 'dev',
      device: 'Mac',
    });
  });

  it('stores a venue suggestion from the fan modal', async () => {
    setAuth('user-venue-abc');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'venue_suggestion',
        message: 'Dazzle\ndazzledenver.com',
        pageUrl: '/venues',
        metadata: { theme: 'electric', build: 'dev', device: 'Mac' },
      }),
    });
    expect(res.status).toBe(201);
    const rows = await testDb
      .select()
      .from(feedback)
      .where(eq(feedback.userId, 'user-venue-abc'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.category).toBe('venue_suggestion');
    expect(rows[0]?.message).toBe('Dazzle\ndazzledenver.com');
  });

  it('refuses an error report, which no fan surface sends', async () => {
    setAuth('user-error-kind');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'error_report',
        message: 'Something broke.',
        pageUrl: '/events',
      }),
    });
    expect(res.status).toBe(422);
    const rows = await testDb
      .select()
      .from(feedback)
      .where(eq(feedback.userId, 'user-error-kind'));
    expect(rows).toHaveLength(0);
  });

  it('stores a problem report from an error page with its ids', async () => {
    setAuth('user-error-report');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'The page went blank',
        pageUrl: '/crews',
        metadata: {
          source: 'error',
          doing: 'Opening my crew',
          digest: '1234567890',
          sentryEventId: 'a1b2c3d4e5f6',
        },
      }),
    });
    expect(res.status).toBe(201);
    const [row] = await testDb
      .select()
      .from(feedback)
      .where(eq(feedback.userId, 'user-error-report'));
    expect(row?.metadata).toMatchObject({
      source: 'error',
      doing: 'Opening my crew',
      digest: '1234567890',
      sentryEventId: 'a1b2c3d4e5f6',
    });
  });

  it('rejects an error id that is not an id', async () => {
    setAuth('user-error-report-bad');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'x',
        pageUrl: '/crews',
        metadata: { source: 'error', digest: 'not an id; drop table' },
      }),
    });
    expect(res.status).toBe(422);
  });

  it('accepts only the error source it knows', async () => {
    setAuth('user-error-report-source');
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'x',
        pageUrl: '/crews',
        metadata: { source: 'anything' },
      }),
    });
    expect(res.status).toBe(422);
  });

  it('accepts metadata.screenshot: null (backwards-compat for stale clients)', async () => {
    const userId = `screenshot-null-user-${Date.now()}`;
    setAuth(userId);
    const res = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'idea',
        message: 'No screenshot attached.',
        pageUrl: '/events',
        metadata: {
          theme: 'electric',
          build: 'dev',
          device: 'Mac',
          screenshot: null,
        },
      }),
    });
    expect(res.status).toBe(201);
  });

  describe('metadata.screenshot', () => {
    const postWithScreenshot = async (userId: string, screenshot: unknown) => {
      setAuth(userId);
      const res = await app.request('/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'bug',
          message: 'Something broke.',
          pageUrl: '/events',
          metadata: { device: 'Mac', screenshot },
        }),
      });
      const [row] = await testDb
        .select()
        .from(feedback)
        .where(eq(feedback.userId, userId));
      return { status: res.status, metadata: row?.metadata };
    };

    it('keeps an inline png, jpeg, webp, gif or avif image the fan form sends', async () => {
      for (const [index, shot] of [
        'data:image/png;base64,AAAA',
        'data:image/jpeg;base64,/9j/4AAQ',
        'data:image/webp;base64,UklGRg==',
        'data:image/gif;base64,R0lGODlh',
        'data:image/avif;base64,AAAAIGZ0eXBhdmlm',
      ].entries()) {
        const { status, metadata } = await postWithScreenshot(
          `screenshot-kept-${index}`,
          shot,
        );
        expect(status).toBe(201);
        expect(metadata).toMatchObject({ device: 'Mac', screenshot: shot });
      }
    });

    it.each([
      ['a foreign https host', 'https://tracker.example.com/pixel.png'],
      ['an http URL', 'http://169.254.169.254/latest/meta-data'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['an svg data image', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
      ['a non-string', { src: 'https://tracker.example.com/pixel.png' }],
    ])('drops %s but still files the report', async (label, shot) => {
      const userId = `screenshot-dropped-${label.replace(/\W+/g, '-')}`;
      const { status, metadata } = await postWithScreenshot(userId, shot);
      expect(status).toBe(201);
      expect(metadata).toMatchObject({ device: 'Mac' });
      expect(metadata).not.toHaveProperty('screenshot');
    });

    it('logs why a screenshot was dropped, never the value', async () => {
      const warn = vi.spyOn(apiLogger, 'warn');
      try {
        await postWithScreenshot('screenshot-log-type', 'https://x.test/a.png');
        await postWithScreenshot('screenshot-log-string', 42);
        await postWithScreenshot(
          'screenshot-log-size',
          `data:image/png;base64,${'A'.repeat(MAX_FEEDBACK_SCREENSHOT_CHARS)}`,
        );
        await postWithScreenshot('screenshot-log-none', null);
        const drops = warn.mock.calls.filter(
          ([, message]) => message === 'feedback screenshot dropped',
        );
        expect(drops.map(([fields]) => fields)).toEqual([
          { reason: 'type' },
          { reason: 'not_string' },
          { reason: 'size' },
        ]);
      } finally {
        warn.mockRestore();
      }
    });

    it('answers 413 with JSON for a body over the limit, and stores nothing', async () => {
      setAuth('feedback-too-large');
      const res = await app.request('/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'bug',
          message: 'x',
          pageUrl: '/events',
          metadata: { device: 'A'.repeat(MAX_FEEDBACK_BODY_BYTES) },
        }),
      });
      expect(res.status).toBe(413);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Feedback is too large',
      });
      const rows = await testDb
        .select()
        .from(feedback)
        .where(eq(feedback.userId, 'feedback-too-large'));
      expect(rows).toHaveLength(0);
    });

    it('does not store a legacy screenshotDataUrl key', async () => {
      setAuth('screenshot-legacy-key');
      const res = await app.request('/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'bug',
          message: 'x',
          pageUrl: '/events',
          metadata: {
            screenshotDataUrl: 'https://tracker.example.com/pixel.png',
          },
        }),
      });
      expect(res.status).toBe(201);
      const [row] = await testDb
        .select()
        .from(feedback)
        .where(eq(feedback.userId, 'screenshot-legacy-key'));
      expect(row?.metadata).not.toHaveProperty('screenshotDataUrl');
    });
  });

  it('does not consume rate-limit token on 422 (malformed body)', async () => {
    const userId = `rate-limit-after-422-${Date.now()}`;
    setAuth(userId);

    // First request is malformed → 422
    const badRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'no category', pageUrl: '/events' }),
    });
    expect(badRes.status).toBe(422);

    // Second request is valid and should succeed, not 429
    const goodRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'bug',
        message: 'now valid',
        pageUrl: '/events',
      }),
    });
    expect(goodRes.status).toBe(201);
  });

  it('allows multiple submissions in the same session up to the cap (#828)', async () => {
    // Regression for #828: previously the rate limit was 1/hour and the
    // second submission failed with 429. Now beta testers can file
    // multiple items back-to-back up to the 10/hour cap.
    const userId = `multi-submit-user-${Date.now()}`;
    setAuth(userId);

    const payload = {
      category: 'bug',
      message: 'First report',
      pageUrl: '/events',
    };

    const firstRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    expect(firstRes.status).toBe(201);

    const secondRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, message: 'Second report' }),
    });
    expect(secondRes.status).toBe(201);
  });

  it('returns 429 once the per-hour cap is exhausted', async () => {
    // Use a unique userId per test run so no earlier rate-limit bucket counts
    const userId = `rate-limit-user-${Date.now()}`;
    setAuth(userId);

    const payload = {
      category: 'bug',
      message: 'report',
      pageUrl: '/events',
    };

    // Burn through all 10 allowed submissions.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await app.request('/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, message: `report ${attempt}` }),
      });
      expect(res.status).toBe(201);
    }

    // 11th must be rejected with Retry-After.
    const overflowRes = await app.request('/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, message: 'one too many' }),
    });
    expect(overflowRes.status).toBe(429);
    expect(Number(overflowRes.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
