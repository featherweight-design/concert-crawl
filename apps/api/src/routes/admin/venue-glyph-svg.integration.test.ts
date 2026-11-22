import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

// Admin 3d-1a: saving a venue's own glyph through the style check.

const app = createApp();

const request = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const FILLED =
  '<svg viewBox="0 0 24 24"><path d="M4 20 L12 4 L20 20 Z" fill="#f00"/></svg>';
const OFF_GRID =
  '<svg viewBox="0 0 24 24" fill="none"><circle cx="22" cy="12" r="6"/></svg>';

describe('admin venue PATCH glyphSvg (3d-1a)', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    await clearTables();
  });

  it('saves a glyph as the style check rebuilds it, and clears it with null', async () => {
    const venue = await seedVenue();
    const res = await request('PATCH', `/v1/admin/venues/${venue.id}`, {
      // A drawing tool's stroke color is dropped; the renderer strokes it.
      glyphSvg:
        '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20 L12 4 L20 20" stroke="red"/></svg>',
    });
    expect(res.status).toBe(200);
    const [row] = await testDb
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id));
    expect(row?.glyphSvg).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 L12 4 L20 20"/></svg>',
    );

    await request('PATCH', `/v1/admin/venues/${venue.id}`, {
      glyphSvg: null,
    });
    const [cleared] = await testDb
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id));
    expect(cleared?.glyphSvg).toBeNull();
  });

  it('refuses a glyph that fails the style check, writing nothing', async () => {
    const venue = await seedVenue();
    for (const glyphSvg of [
      FILLED,
      OFF_GRID,
      '<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
    ]) {
      const res = await request('PATCH', `/v1/admin/venues/${venue.id}`, {
        glyphSvg,
      });
      expect(res.status).toBe(400);
    }
    const [row] = await testDb
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id));
    expect(row?.glyphSvg).toBeNull();
  });
});
