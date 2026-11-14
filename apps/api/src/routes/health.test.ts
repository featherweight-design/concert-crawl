import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { db } from '@concert-crawl/db';
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

const here = dirname(fileURLToPath(import.meta.url));

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

  // The keep-warm cron pings this route every 5 minutes. Hugh declined
  // paying to keep Neon awake, so a ping that touched the DB would be a bug.
  describe('as the keep-warm target', () => {
    it('is pinged every 5 minutes by the API cron', () => {
      const config = readFileSync(resolve(here, '../../vercel.json'), 'utf8');
      expect(config).toContain(
        '{ "path": "/v1/health", "schedule": "*/5 * * * *" }',
      );
    });

    it('answers without touching the database', async () => {
      vi.mocked(db.select).mockClear();
      vi.mocked(db.insert).mockClear();
      await app.request('/v1/health');
      expect(db.select).not.toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('imports nothing that reads data or calls Clerk', () => {
      const source = readFileSync(resolve(here, 'health.ts'), 'utf8');
      const imports = [...source.matchAll(/from '([^']+)'/g)].map(
        (match) => match[1],
      );
      expect(imports).toEqual(['hono']);
    });
  });
});
