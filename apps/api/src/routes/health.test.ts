import { describe, it, expect, vi } from 'vitest';
import { createApp } from '../app.js';

// Spread the real module so a new drizzle-orm import elsewhere in the app
// doesn't break this suite; only the operators it inspects are mocked.
vi.mock('drizzle-orm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('drizzle-orm')>()),
  eq: vi.fn(),
}));
vi.mock('@concert-crawl/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
  venues: {},
  auditLog: {},
  inviteCodes: {},
}));
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

describe('GET /v1/health', () => {
  const app = createApp();

  it('returns 200 with status ok', async () => {
    const res = await app.request('/v1/health');
    expect(res.status).toBe(200);
  });

  it('returns JSON with status, timestamp, and version', async () => {
    const res = await app.request('/v1/health');
    const body = (await res.json()) as Record<string, unknown>;
    expect(body['status']).toBe('ok');
    expect(typeof body['timestamp']).toBe('string');
    expect(typeof body['version']).toBe('string');
  });

  it('returns a valid ISO 8601 timestamp', async () => {
    const res = await app.request('/v1/health');
    const body = (await res.json()) as Record<string, unknown>;
    const date = new Date(body['timestamp'] as string);
    expect(date.toISOString()).toBe(body['timestamp']);
  });
});
