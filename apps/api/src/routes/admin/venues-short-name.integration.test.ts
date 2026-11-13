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
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { eq } from 'drizzle-orm';
import { auditLog, venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const setAuth = (userId = 'admin_1'): void => {
  authState.current = {
    userId,
    sessionClaims: { metadata: { role: 'admin' } },
  };
};

const patchVenue = (id: string, body: unknown) =>
  app.request(`/v1/admin/venues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const storedShortName = async (id: string) => {
  const [row] = await testDb
    .select({ shortName: venues.shortName })
    .from(venues)
    .where(eq(venues.id, id));
  return row?.shortName;
};

const updateAudits = async () =>
  testDb.select().from(auditLog).where(eq(auditLog.action, 'venue.update'));

describe('venue short name (B+ addendum 4, item 4)', () => {
  beforeEach(async () => {
    setAuth();
    await clearTables();
  });

  it('sets a trimmed short name and audits it as a venue update', async () => {
    const venue = await seedVenue({
      name: "Cervantes' Masterpiece Ballroom",
      slug: 'cervantes',
    });
    setAuth('admin_h');

    const res = await patchVenue(venue.id, { shortName: "  Cervantes'  " });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { shortName: string | null } };
    expect(body.data.shortName).toBe("Cervantes'");
    expect(await storedShortName(venue.id)).toBe("Cervantes'");
    const audits = await updateAudits();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: 'admin_h',
      targetId: venue.id,
    });
  });

  it('clears the short name when sent empty or whitespace', async () => {
    const venue = await seedVenue({
      name: 'Bluebird Theater',
      slug: 'bluebird',
      shortName: 'Bluebird',
    });

    const res = await patchVenue(venue.id, { shortName: '   ' });

    expect(res.status).toBe(200);
    expect(await storedShortName(venue.id)).toBeNull();
    expect(await updateAudits()).toHaveLength(1);
  });

  it('clears the short name when sent null', async () => {
    const venue = await seedVenue({ slug: 'ogden', shortName: 'Ogden' });

    const res = await patchVenue(venue.id, { shortName: null });

    expect(res.status).toBe(200);
    expect(await storedShortName(venue.id)).toBeNull();
  });

  it('accepts 20 characters and rejects 21, writing nothing and auditing nothing', async () => {
    const venue = await seedVenue({ slug: 'long', shortName: 'Keep me' });

    const atCap = await patchVenue(venue.id, { shortName: 'x'.repeat(20) });
    expect(atCap.status).toBe(200);
    expect(await storedShortName(venue.id)).toBe('x'.repeat(20));

    const over = await patchVenue(venue.id, { shortName: 'y'.repeat(21) });
    expect(over.status).toBe(400);
    expect(await storedShortName(venue.id)).toBe('x'.repeat(20));
    // Only the accepted save is audited.
    expect(await updateAudits()).toHaveLength(1);
  });

  it('counts the cap after trimming', async () => {
    const venue = await seedVenue({ slug: 'padded' });

    const res = await patchVenue(venue.id, {
      shortName: `  ${'z'.repeat(20)}  `,
    });

    expect(res.status).toBe(200);
    expect(await storedShortName(venue.id)).toBe('z'.repeat(20));
  });

  it('leaves the short name alone when a PATCH does not mention it', async () => {
    const venue = await seedVenue({ slug: 'mission', shortName: 'Mission' });

    const res = await patchVenue(venue.id, { neighborhood: 'RiNo' });

    expect(res.status).toBe(200);
    expect(await storedShortName(venue.id)).toBe('Mission');
  });

  it('is on the admin venue detail', async () => {
    const venue = await seedVenue({ slug: 'gothic', shortName: 'Gothic' });

    const res = await app.request(`/v1/admin/venues/${venue.id}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { shortName: string | null } };
    expect(body.data.shortName).toBe('Gothic');
  });

  it('is on the public venue list and detail, null when unset', async () => {
    await seedVenue({
      name: 'Red Rocks Amphitheatre',
      slug: 'red-rocks',
      shortName: 'Red Rocks',
    });
    await seedVenue({ name: 'Globe Hall', slug: 'globe-hall' });

    const list = (await (await app.request('/v1/venues')).json()) as {
      data: { slug: string; shortName: string | null }[];
    };
    expect(list.data.map((row) => [row.slug, row.shortName]).sort()).toEqual([
      ['globe-hall', null],
      ['red-rocks', 'Red Rocks'],
    ]);

    const detailRes = await app.request('/v1/venues/red-rocks');
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as {
      data: { venue: { shortName: string | null } };
    };
    expect(detail.data.venue.shortName).toBe('Red Rocks');
  });
});
