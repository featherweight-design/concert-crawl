import { describe, it, expect, beforeEach, vi } from 'vitest';

// Admin 4a-3b: POST /v1/admin/events (Add a show by hand),
// GET /v1/admin/events/duplicate (its amber warning) and
// PUT /v1/admin/events/:id/lineup (the lineup save).

type MockAuth = {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
} | null;

const { authState } = vi.hoisted(() => {
  const state: { current: MockAuth } = { current: null };
  return { authState: state };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

import { randomUUID } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auditLog, eventArtists, events } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { testDb } from '../../test/helpers/db.js';
import {
  clearTables,
  seedArtist,
  seedEvent,
  seedVenue,
} from '../../test/helpers/seed.js';
import { todayInDenver } from '../../lib/time.js';

const app = createApp();
const ADMIN_USER_ID = 'admin_user';
const HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
};

const dayOffset = (days: number): string => {
  const base = new Date(`${todayInDenver()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

const lineupItemSchema = z.object({
  name: z.string(),
  role: z.enum(['headliner', 'support']),
  position: z.number(),
  artistId: z.string().nullable(),
  slug: z.string().nullable(),
});

const detailBodySchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    title: z.string(),
    manual: z.boolean(),
    createdBy: z.string().nullable(),
    verified: z.boolean(),
    lineupEditedAt: z.string().nullable(),
    venueName: z.string().nullable(),
    lineup: z.array(lineupItemSchema),
    mySubmissionId: z.string().nullable(),
  }),
});

const issuesBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    name: z.literal('ZodError'),
    issues: z.array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    ),
  }),
});

const duplicatesBodySchema = z.object({
  success: z.literal(true),
  data: z.object({
    duplicates: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        showTime: z.string().nullable(),
        manual: z.boolean(),
        hidden: z.boolean(),
      }),
    ),
  }),
});

const post = (body: unknown) =>
  app.request('/v1/admin/events', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  });

const putLineup = (id: string, lineup: unknown) =>
  app.request(`/v1/admin/events/${id}/lineup`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify({ lineup }),
  });

const getDuplicates = async (query: string) => {
  const res = await app.request(`/v1/admin/events/duplicate?${query}`, {
    headers: HEADERS,
  });
  expect(res.status).toBe(200);
  return duplicatesBodySchema.parse(await res.json()).data.duplicates;
};

/** The codes a 400 reports, as `path:message`. */
const issueCodes = async (res: Response): Promise<string[]> => {
  expect(res.status).toBe(400);
  return issuesBodySchema
    .parse(await res.json())
    .error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};

const linkedRows = (eventId: string) =>
  testDb
    .select({
      artistId: eventArtists.artistId,
      role: eventArtists.role,
      position: eventArtists.position,
    })
    .from(eventArtists)
    .where(eq(eventArtists.eventId, eventId))
    .orderBy(asc(eventArtists.position));

const storedEvent = async (id: string) => {
  const [row] = await testDb.select().from(events).where(eq(events.id, id));
  if (!row) throw new Error(`event ${id} missing`);
  return row;
};

const auditRows = (action: string) =>
  testDb.select().from(auditLog).where(eq(auditLog.action, action));

const validBody = (venueId: string) => ({
  venueId,
  title: 'Kaleo',
  date: dayOffset(20),
  doorsTime: '19:00',
  showTime: '20:00',
  ticketUrl: 'https://www.axs.com/events/kaleo',
  lineup: [
    { name: 'Kaleo', role: 'headliner' },
    { name: 'The Band of Heathens', role: 'support' },
  ],
});

beforeEach(async () => {
  authState.current = {
    userId: ADMIN_USER_ID,
    sessionClaims: { metadata: { role: 'admin' } },
  };
  await clearTables();
});

describe('POST /v1/admin/events', () => {
  it('adds a manual show, writes the bill from the names and links the matched artist', async () => {
    const venue = await seedVenue({ name: 'Mission Ballroom' });
    const kaleo = await seedArtist({ name: 'Kaleo' });

    const res = await post(validBody(venue.id));
    expect(res.status).toBe(201);
    const { data } = detailBodySchema.parse(await res.json());

    expect(data).toMatchObject({
      title: 'Kaleo',
      manual: true,
      createdBy: ADMIN_USER_ID,
      verified: true,
      venueName: 'Mission Ballroom',
      mySubmissionId: null,
    });
    expect(data.lineupEditedAt).not.toBeNull();
    // The unmatched support keeps its text and its place, with no link.
    expect(data.lineup).toEqual([
      {
        name: 'Kaleo',
        role: 'headliner',
        position: 0,
        artistId: kaleo.id,
        slug: kaleo.slug,
      },
      {
        name: 'The Band of Heathens',
        role: 'support',
        position: 1,
        artistId: null,
        slug: null,
      },
    ]);

    const row = await storedEvent(data.id);
    expect(row).toMatchObject({
      manual: true,
      createdBy: ADMIN_USER_ID,
      verified: true,
      status: 'upcoming',
      artist: 'Kaleo',
      canonicalArtist: 'kaleo',
      canonicalTitle: 'kaleo',
      headliners: ['Kaleo'],
      supportingArtists: ['The Band of Heathens'],
      canonicalHeadliners: ['kaleo'],
      doorsTime: '19:00:00',
      showTime: '20:00:00',
      ticketUrl: 'https://www.axs.com/events/kaleo',
    });
    expect(row.canonicalSupporting).toHaveLength(1);
    expect(await linkedRows(data.id)).toEqual([
      { artistId: kaleo.id, role: 'headliner', position: 0 },
    ]);
  });

  it('bills a picked artist under its stored name so it links', async () => {
    const venue = await seedVenue();
    const phoebe = await seedArtist({ name: 'Phoebe Bridgers' });

    const res = await post({
      ...validBody(venue.id),
      title: 'Phoebe Bridgers live',
      ticketUrl: '',
      lineup: [{ name: 'phoebe', role: 'headliner', artistId: phoebe.id }],
    });
    expect(res.status).toBe(201);
    const { data } = detailBodySchema.parse(await res.json());

    const row = await storedEvent(data.id);
    expect(row.headliners).toEqual(['Phoebe Bridgers']);
    expect(row.supportingArtists).toEqual([]);
    expect(row.ticketUrl).toBeNull();
    expect(await linkedRows(data.id)).toEqual([
      { artistId: phoebe.id, role: 'headliner', position: 0 },
    ]);
  });

  it('writes an event.create audit row naming the new show', async () => {
    const venue = await seedVenue();
    const res = await post(validBody(venue.id));
    const { data } = detailBodySchema.parse(await res.json());

    const rows = await auditRows('event.create');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorId: ADMIN_USER_ID,
      targetId: data.id,
      metadata: {
        title: 'Kaleo',
        venueId: venue.id,
        lineup: [
          { name: 'Kaleo', role: 'headliner' },
          { name: 'The Band of Heathens', role: 'support' },
        ],
      },
    });
  });

  it('still adds a show on a night the venue already has one, and the warning finds it', async () => {
    const venue = await seedVenue();
    const date = dayOffset(20);
    const crawled = await seedEvent(venue.id, {
      artist: 'Other Act',
      date,
      showTime: '20:00',
    });

    const before = await getDuplicates(
      `venueId=${venue.id}&date=${date}&title=Kaleo`,
    );
    expect(before.map((row) => row.id)).toEqual([crawled.id]);
    expect(before[0]).toMatchObject({ manual: false, hidden: false });

    const res = await post(validBody(venue.id));
    expect(res.status).toBe(201);
    const { data } = detailBodySchema.parse(await res.json());

    // The likeliest match (same title) comes first.
    const after = await getDuplicates(
      `venueId=${venue.id}&date=${date}&title=Kaleo`,
    );
    expect(after.map((row) => row.id)).toEqual([data.id, crawled.id]);
    expect(after[0]?.manual).toBe(true);
  });

  it('leaves cancelled shows and other nights and venues out of the warning', async () => {
    const venue = await seedVenue();
    const other = await seedVenue({ name: 'Other', slug: 'other' });
    const date = dayOffset(20);
    await seedEvent(venue.id, {
      artist: 'Cancelled',
      date,
      status: 'cancelled',
    });
    await seedEvent(venue.id, { artist: 'Next Night', date: dayOffset(21) });
    await seedEvent(other.id, { artist: 'Elsewhere', date });

    expect(await getDuplicates(`venueId=${venue.id}&date=${date}`)).toEqual([]);
  });

  it('answers a show already on the exact crawl key with 409 duplicate_show and its id', async () => {
    const venue = await seedVenue();
    const crawled = await seedEvent(venue.id, {
      artist: 'Kaleo',
      canonicalArtist: 'kaleo',
      date: dayOffset(20),
      showTime: '20:00',
    });

    const res = await post(validBody(venue.id));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      success: false,
      error: 'duplicate_show',
      existingId: crawled.id,
    });
    const rows = await testDb
      .select({ id: events.id })
      .from(events)
      .where(eq(events.manual, true));
    expect(rows).toEqual([]);
    expect(await auditRows('event.create')).toEqual([]);
  });

  it('adds only one of two identical shows sent at once', async () => {
    const venue = await seedVenue();
    const statuses = (
      await Promise.all([post(validBody(venue.id)), post(validBody(venue.id))])
    ).map((res) => res.status);
    expect(statuses.sort()).toEqual([201, 409]);
    const rows = await testDb
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.venueId, venue.id), eq(events.manual, true)));
    expect(rows).toHaveLength(1);
    expect(await linkedRows(rows[0]?.id ?? '')).toEqual([]);
  });

  describe('field errors, as codes the form maps', () => {
    const cases: {
      label: string;
      patch: (venueId: string) => Record<string, unknown>;
      code: string;
    }[] = [
      {
        label: 'no title',
        patch: () => ({ title: '  ' }),
        code: 'title:title_required',
      },
      {
        label: 'no venue',
        patch: () => ({ venueId: undefined }),
        code: 'venueId:venue_required',
      },
      {
        label: 'an unknown venue',
        patch: () => ({ venueId: randomUUID() }),
        code: 'venueId:venue_not_found',
      },
      {
        label: 'no date',
        patch: () => ({ date: undefined }),
        code: 'date:date_required',
      },
      {
        label: 'a past date',
        patch: () => ({ date: dayOffset(-1) }),
        code: 'date:date_past',
      },
      {
        label: 'a bad time',
        patch: () => ({ doorsTime: 'tonight' }),
        code: 'doorsTime:time_invalid',
      },
      {
        label: 'a show before doors',
        patch: () => ({ doorsTime: '20:00', showTime: '19:00' }),
        code: 'showTime:show_before_doors',
      },
      {
        label: 'a link with no scheme',
        patch: () => ({ ticketUrl: 'axs.com/events/kaleo' }),
        code: 'ticketUrl:ticket_url_invalid',
      },
      {
        label: 'a javascript: link',
        patch: () => ({ ticketUrl: 'javascript:alert(1)' }),
        code: 'ticketUrl:ticket_url_invalid',
      },
      {
        label: 'no headliner',
        patch: () => ({ lineup: [{ name: 'Opener', role: 'support' }] }),
        code: 'lineup:headliner_required',
      },
      {
        label: 'no lineup',
        patch: () => ({ lineup: undefined }),
        code: 'lineup:headliner_required',
      },
      {
        label: 'a blank name',
        patch: () => ({ lineup: [{ name: ' ', role: 'headliner' }] }),
        code: 'lineup.0.name:lineup_name_required',
      },
      {
        label: 'an unknown role',
        patch: () => ({ lineup: [{ name: 'Kaleo', role: 'opener' }] }),
        code: 'lineup.0.role:lineup_role_invalid',
      },
      {
        label: 'an unknown artist',
        patch: () => ({
          lineup: [
            { name: 'Kaleo', role: 'headliner', artistId: randomUUID() },
          ],
        }),
        code: 'lineup.0.artistId:artist_not_found',
      },
    ];

    it.each(cases)('reports $label', async ({ patch, code }) => {
      const venue = await seedVenue();
      const res = await post({ ...validBody(venue.id), ...patch(venue.id) });
      expect(await issueCodes(res)).toContain(code);
      expect(await testDb.select({ id: events.id }).from(events)).toEqual([]);
      expect(await auditRows('event.create')).toEqual([]);
    });
  });
});

describe('PUT /v1/admin/events/:id/lineup', () => {
  it('rewrites a crawled show’s bill, locks it and relinks, keeping unmatched names', async () => {
    const venue = await seedVenue();
    const crawled = await seedEvent(venue.id, {
      artist: 'Old Headliner',
      date: dayOffset(10),
      headliners: ['Old Headliner'],
      canonicalHeadliners: ['old headliner'],
      supportingArtists: ['Old Opener'],
      canonicalSupporting: ['old opener'],
    });
    const fresh = await seedArtist({ name: 'New Headliner' });
    const opener = await seedArtist({ name: 'Known Opener' });

    const res = await putLineup(crawled.id, [
      { name: 'New Headliner', role: 'headliner' },
      { name: 'Nobody Yet', role: 'support' },
      { name: 'Known Opener', role: 'support', artistId: opener.id },
    ]);
    expect(res.status).toBe(200);
    const { data } = detailBodySchema.parse(await res.json());
    expect(data.lineup.map(({ name, artistId }) => [name, artistId])).toEqual([
      ['New Headliner', fresh.id],
      ['Nobody Yet', null],
      ['Known Opener', opener.id],
    ]);

    const row = await storedEvent(crawled.id);
    expect(row).toMatchObject({
      headliners: ['New Headliner'],
      canonicalHeadliners: ['new headliner'],
      supportingArtists: ['Nobody Yet', 'Known Opener'],
      // The crawl key stays put, so the next crawl lands on this row.
      artist: 'Old Headliner',
      canonicalArtist: crawled.canonicalArtist,
      manual: false,
    });
    expect(row.canonicalSupporting).toHaveLength(2);
    expect(row.lineupEditedAt).not.toBeNull();
    expect(await linkedRows(crawled.id)).toEqual([
      { artistId: fresh.id, role: 'headliner', position: 0 },
      { artistId: opener.id, role: 'support', position: 2 },
    ]);

    const audits = await auditRows('event.lineup.update');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorId: ADMIN_USER_ID,
      targetId: crawled.id,
      metadata: {
        headliners: ['New Headliner'],
        supportingArtists: ['Nobody Yet', 'Known Opener'],
      },
    });
  });

  it('saves the lineup of a past show', async () => {
    const venue = await seedVenue();
    const past = await seedEvent(venue.id, { date: dayOffset(-30) });
    const res = await putLineup(past.id, [
      { name: 'Who Played', role: 'headliner' },
    ]);
    expect(res.status).toBe(200);
    expect((await storedEvent(past.id)).headliners).toEqual(['Who Played']);
  });

  it('keeps one consistent bill when two saves race', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: dayOffset(10) });
    const first = await seedArtist({ name: 'First Pick' });
    const second = await seedArtist({ name: 'Second Pick' });

    const statuses = (
      await Promise.all([
        putLineup(event.id, [{ name: 'First Pick', role: 'headliner' }]),
        putLineup(event.id, [{ name: 'Second Pick', role: 'headliner' }]),
      ])
    ).map((res) => res.status);
    expect(statuses).toEqual([200, 200]);

    const row = await storedEvent(event.id);
    const winner = row.headliners?.[0] === 'First Pick' ? first : second;
    expect(await linkedRows(event.id)).toEqual([
      { artistId: winner.id, role: 'headliner', position: 0 },
    ]);
  });

  it('answers 404 for an unknown show and writes no audit', async () => {
    const res = await putLineup(randomUUID(), [
      { name: 'A', role: 'headliner' },
    ]);
    expect(res.status).toBe(404);
    expect(await auditRows('event.lineup.update')).toEqual([]);
  });

  it('refuses a lineup with no headliner, writing nothing', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, {
      date: dayOffset(10),
      headliners: ['Kept'],
      canonicalHeadliners: ['kept'],
    });
    const res = await putLineup(event.id, [
      { name: 'Opener', role: 'support' },
    ]);
    expect(await issueCodes(res)).toContain('lineup:headliner_required');
    const row = await storedEvent(event.id);
    expect(row.headliners).toEqual(['Kept']);
    expect(row.lineupEditedAt).toBeNull();
  });
});

describe('auth', () => {
  const requests = (venueId: string, eventId: string) => [
    app.request('/v1/admin/events', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(validBody(venueId)),
    }),
    app.request(`/v1/admin/events/${eventId}/lineup`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({ lineup: [{ name: 'A', role: 'headliner' }] }),
    }),
    app.request(
      `/v1/admin/events/duplicate?venueId=${venueId}&date=${dayOffset(20)}`,
      { headers: HEADERS },
    ),
  ];

  it('answers 401 with no session and 403 for a non-admin, writing nothing', async () => {
    const venue = await seedVenue();
    const event = await seedEvent(venue.id, { date: dayOffset(10) });

    authState.current = null;
    const anonymous = await Promise.all(requests(venue.id, event.id));
    expect(anonymous.map((res) => res.status)).toEqual([401, 401, 401]);

    authState.current = {
      userId: 'fan_user',
      sessionClaims: { metadata: { role: 'user' } },
    };
    const fan = await Promise.all(requests(venue.id, event.id));
    expect(fan.map((res) => res.status)).toEqual([403, 403, 403]);

    expect(
      await testDb
        .select({ id: events.id })
        .from(events)
        .where(eq(events.manual, true)),
    ).toEqual([]);
    expect((await storedEvent(event.id)).lineupEditedAt).toBeNull();
    expect(await testDb.select().from(auditLog)).toEqual([]);
  });
});
