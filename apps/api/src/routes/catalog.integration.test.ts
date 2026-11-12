import { describe, it, expect, beforeEach, vi } from 'vitest';
import { auditLog } from '@concert-crawl/db';

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}));

import { createApp } from '../app.js';
import { clearTables, seedCrawlRun, seedVenue } from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';

const app = createApp();

const generation = async (): Promise<string> => {
  const res = await app.request('/v1/catalog/generation');
  expect(res.status).toBe(200);
  const body = (await res.json()) as { data: { generation: string } };
  return body.data.generation;
};

describe('GET /v1/catalog/generation — integration', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('is a fixed "0" with no crawl and no admin action, never an error', async () => {
    expect(await generation()).toBe('0');
  });

  it('carries no personal data and is not cached by a shared cache (the web holds it for a minute)', async () => {
    const res = await app.request('/v1/catalog/generation');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(Object.keys((await res.json()).data)).toEqual(['generation']);
  });

  it('moves when a crawl run lands', async () => {
    const venue = await seedVenue();
    await seedCrawlRun(venue.id, {
      createdAt: new Date('2026-11-12T09:00:00Z'),
    });
    const first = await generation();
    expect(first).toBe(String(Date.parse('2026-11-12T09:00:00Z')));
    await seedCrawlRun(venue.id, {
      createdAt: new Date('2026-11-12T10:00:00Z'),
    });
    expect(await generation()).toBe(String(Date.parse('2026-11-12T10:00:00Z')));
  });

  it('moves when an admin action is audited, and takes the later of the two', async () => {
    const venue = await seedVenue();
    await seedCrawlRun(venue.id, {
      createdAt: new Date('2026-11-12T09:00:00Z'),
    });
    await testDb.insert(auditLog).values({
      actorId: 'admin_1',
      action: 'venue.update',
      createdAt: new Date('2026-11-12T11:30:00Z'),
    });
    expect(await generation()).toBe(String(Date.parse('2026-11-12T11:30:00Z')));
  });
});
