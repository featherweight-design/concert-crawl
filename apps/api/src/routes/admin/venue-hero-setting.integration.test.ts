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

import { and, eq } from 'drizzle-orm';
import { auditLog, venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

// Admin 3e-3: the setting a venue's hero art draws, saved through the venue
// PATCH. The column and its enum came with migration 0116.

const app = createApp();

const patch = (id: string, body: unknown) =>
  app.request(`/v1/admin/venues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const heroOf = async (id: string) => {
  const [row] = await testDb.select().from(venues).where(eq(venues.id, id));
  return row?.heroSetting;
};

describe('admin venue PATCH heroSetting (3e-3)', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    await clearTables();
  });

  it('saves each of the six settings, and clears it with null', async () => {
    const venue = await seedVenue();
    for (const heroSetting of [
      'street',
      'outdoor',
      'arena',
      'theater',
      'club',
      'gallery',
    ]) {
      const res = await patch(venue.id, { heroSetting });
      expect(res.status).toBe(200);
      expect(await heroOf(venue.id)).toBe(heroSetting);
    }
    const cleared = await patch(venue.id, { heroSetting: null });
    expect(cleared.status).toBe(200);
    expect(await heroOf(venue.id)).toBeNull();
  });

  it('refuses a setting that is not one of the six, writing nothing', async () => {
    const venue = await seedVenue();
    const res = await patch(venue.id, { heroSetting: 'stadium' });
    expect(res.status).toBe(400);
    expect(await heroOf(venue.id)).toBeNull();
  });

  it('leaves the setting alone when the PATCH does not send it', async () => {
    const venue = await seedVenue();
    await patch(venue.id, { heroSetting: 'club' });
    const res = await patch(venue.id, { description: 'A jazz room.' });
    expect(res.status).toBe(200);
    expect(await heroOf(venue.id)).toBe('club');
  });

  it('keeps the setting a change replaced in the audit, and none for an unchanged one', async () => {
    const venue = await seedVenue();
    await patch(venue.id, { heroSetting: 'club' });
    await patch(venue.id, { heroSetting: 'theater' });
    await patch(venue.id, { heroSetting: 'theater' });
    const updates = await testDb
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, 'venue.update'),
          eq(auditLog.targetId, venue.id),
        ),
      );
    expect(updates.map((audit) => audit.metadata)).toEqual([
      { heroSetting: { before: null, after: 'club' } },
      { heroSetting: { before: 'club', after: 'theater' } },
      null,
    ]);
  });
});
