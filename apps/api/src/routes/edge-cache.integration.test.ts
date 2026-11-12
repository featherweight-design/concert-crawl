import { describe, it, expect, beforeEach, vi } from 'vitest';

const { authState } = vi.hoisted(() => ({
  authState: { current: null as { userId: string } | null },
}));

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { createApp } from '../app.js';
import { PUBLIC_EDGE_CACHE } from '../lib/edge-cache.js';
import { clearTables, seedEvent, seedVenue } from '../test/helpers/seed.js';

const app = createApp();

const cacheOf = (res: Response) => res.headers.get('cache-control');
const varies = (res: Response) =>
  (res.headers.get('vary') ?? '').toLowerCase().includes('authorization');

describe('edge cache headers on public reads', () => {
  let eventId: string;
  let slug: string;

  beforeEach(async () => {
    authState.current = null;
    await clearTables();
    const venue = await seedVenue({ name: 'Gothic', slug: 'gothic' });
    slug = venue.slug;
    const event = await seedEvent(venue.id, { date: '2099-01-01' });
    eventId = event.id;
  });

  it('lets the edge hold the reads that are the same for everyone', async () => {
    for (const path of ['/v1/events/genres', '/v1/venues']) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
      expect(cacheOf(res)).toBe(PUBLIC_EDGE_CACHE);
      expect(varies(res)).toBe(true);
    }
  });

  it('keeps the CORS Vary beside Authorization', async () => {
    const res = await app.request('/v1/events/genres', {
      headers: { Origin: 'http://localhost:3000' },
    });
    const vary = (res.headers.get('vary') ?? '').toLowerCase();
    expect(vary).toContain('authorization');
    expect(vary).toContain('origin');
  });

  it('lets the edge hold an anonymous list, event, related and venue page', async () => {
    for (const path of [
      '/v1/events?limit=5',
      `/v1/events/${eventId}`,
      `/v1/events/${eventId}/related`,
      `/v1/venues/${slug}`,
    ]) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
      expect(cacheOf(res), path).toBe(PUBLIC_EDGE_CACHE);
      expect(varies(res), path).toBe(true);
    }
  });

  it('keeps a signed-in answer out of any shared cache', async () => {
    authState.current = { userId: 'user_a' };
    for (const path of [
      '/v1/events?limit=5',
      `/v1/events/${eventId}`,
      `/v1/events/${eventId}/related`,
      `/v1/venues/${slug}`,
    ]) {
      const res = await app.request(path, {
        headers: { Authorization: 'Bearer t' },
      });
      expect(res.status).toBe(200);
      expect(cacheOf(res), path).toBe('private, no-store');
      expect(varies(res), path).toBe(true);
    }
  });

  it('caches nothing when the request carries an Authorization header, even one that resolves to anonymous', async () => {
    // getAuth() is null here (a bad or expired token), yet the header was sent.
    for (const path of [
      '/v1/events/genres',
      '/v1/venues',
      '/v1/events?limit=5',
      `/v1/events/${eventId}`,
      `/v1/venues/${slug}`,
    ]) {
      const res = await app.request(path, {
        headers: { Authorization: 'Bearer expired' },
      });
      expect(res.status, path).toBe(200);
      expect(cacheOf(res), path).toBe('private, no-store');
      expect(varies(res), path).toBe(true);
    }
  });

  it('never marks an error cacheable', async () => {
    for (const path of [
      '/v1/events/00000000-0000-4000-8000-000000000000',
      '/v1/venues/no-such-venue',
      '/v1/events?taste=1',
    ]) {
      const res = await app.request(path);
      expect(res.status, path).toBeGreaterThanOrEqual(400);
      expect(cacheOf(res) ?? '', path).not.toContain('public');
    }
  });
});
