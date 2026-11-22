import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GuidePagesResult } from '../../lib/guide-pages.js';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState, mockCreate, mockReadPages } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state, mockCreate: vi.fn(), mockReadPages: vi.fn() };
});

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

// The page reader's robots.txt and pacing are guide-pages.test.ts; here it
// hands back pages so the route's drafting is what's tested.
vi.mock('../../lib/guide-pages.js', () => ({
  readGuidePages: mockReadPages,
}));

import { and, eq } from 'drizzle-orm';
import {
  adminSettings,
  auditLog,
  costTracking,
  venueGuideChips,
  venues,
} from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

// Admin 3d-2: drafting the first-timer guide from the venue's own pages.

const app = createApp();

const draft = (id: string) =>
  app.request(`/v1/admin/venues/${id}/guide-drafts`, { method: 'POST' });

const FAQ = 'https://dazzledenver.com/faq';
const ACCESS = 'https://dazzledenver.com/accessibility';

const twoPages: GuidePagesResult = {
  attempts: [
    { url: FAQ, status: 'read' },
    { url: ACCESS, status: 'read' },
    { url: 'https://dazzledenver.com/info', status: 'disallowed' },
    { url: 'https://dazzledenver.com/policies', status: 'notFound' },
  ],
  pages: [
    { url: FAQ, text: 'Parking: garage, about $15.', lastModified: null },
    {
      url: ACCESS,
      text: 'Step-free entry from Curtis St.',
      lastModified: 'Tue, 02 Jan 2024 00:00:00 GMT',
    },
  ],
};

const reply = (text: string) => ({
  content: [{ type: 'text', text }],
  usage: { input_tokens: 3000, output_tokens: 400 },
});

const sectionsReply = (sections: unknown[]) =>
  reply(JSON.stringify({ sections }));

const audits = (venueId: string) =>
  testDb
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, 'venue.guide.draft'),
        eq(auditLog.targetId, venueId),
      ),
    );

describe('admin guide drafting (3d-2)', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    mockCreate.mockReset();
    mockReadPages.mockReset();
    await clearTables();
  });

  it('drafts sections from the pages, tags each one, and stores nothing', async () => {
    const venue = await seedVenue({
      websiteUrl: 'https://dazzledenver.com',
      crawlDelayMs: 5_000,
    });
    mockReadPages.mockResolvedValue(twoPages);
    mockCreate.mockResolvedValue(
      sectionsReply([
        {
          chip: 'parking',
          body: ' Garage under the arts complex, about $15. ',
          source: 1,
          check: null,
        },
        {
          chip: 'accessibility',
          body: 'Step-free entry from Curtis St.',
          source: 2,
          check: 'The page is from 2024.',
        },
        // Unknown key, a repeat, a page that doesn't exist, an empty body and
        // a bad shape: each is dropped, leaving its section blank.
        { chip: 'insider_tip', body: 'Sit at the bar.', source: 1 },
        { chip: 'parking', body: 'Second take.', source: 1 },
        { chip: 'transit', body: 'Light rail.', source: 9 },
        { chip: 'age_policy', body: '   ', source: 1 },
        { chip: 'will_call', body: 42, source: 1 },
      ]),
    );

    const res = await draft(venue.id);
    expect(res.status).toBe(200);
    const { data } = await res.json();

    expect(mockReadPages).toHaveBeenCalledWith(
      'https://dazzledenver.com/',
      5_000,
    );
    expect(data.sources).toEqual(twoPages.attempts);
    expect(data.sections).toHaveLength(8);
    const byChip = Object.fromEntries(
      data.sections.map((section: { chipType: string }) => [
        section.chipType,
        section,
      ]),
    );
    expect(byChip.parking).toEqual({
      chipType: 'parking',
      state: 'drafted',
      body: 'Garage under the arts complex, about $15.',
      sourceUrl: FAQ,
      note: null,
    });
    expect(byChip.accessibility).toEqual({
      chipType: 'accessibility',
      state: 'check',
      body: 'Step-free entry from Curtis St.',
      sourceUrl: ACCESS,
      note: 'The page is from 2024.',
    });
    for (const key of ['transit', 'age_policy', 'will_call', 'bag_check']) {
      expect(byChip[key]).toMatchObject({
        state: 'blank',
        body: '',
        sourceUrl: null,
      });
    }
    // The Insider tip is never drafted.
    expect(JSON.stringify(data)).not.toContain('Sit at the bar');

    // The prompt quotes the pages as data and carries the page date.
    const sent = mockCreate.mock.calls[0]?.[0];
    const prompt: string = sent.messages[0].content;
    expect(prompt).toContain(JSON.stringify(FAQ));
    expect(prompt).toContain('last modified "Tue, 02 Jan 2024 00:00:00 GMT"');
    expect(prompt).not.toContain('insider');

    // Cost recorded under its own service, with the figure in the response.
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'venue-guide-draft'));
    expect(costs).toHaveLength(1);
    expect(JSON.parse(costs[0]?.metadata ?? '{}')).toMatchObject({
      venueId: venue.id,
      pages: 2,
      inputTokens: 3000,
      outputTokens: 400,
    });
    expect(data.costUsd).toBeCloseTo(Number(costs[0]?.costUsd), 6);

    expect((await audits(venue.id)).map((row) => row.metadata)).toEqual([
      { tried: 4, read: 2, drafted: 1, check: 1 },
    ]);
    const chips = await testDb
      .select()
      .from(venueGuideChips)
      .where(eq(venueGuideChips.venueId, venue.id));
    expect(chips).toEqual([]);
    const [row] = await testDb
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id));
    expect(row?.insiderTip).toBeNull();
  });

  it('cuts a body over the field cap to fit and marks it Check this', async () => {
    const venue = await seedVenue();
    mockReadPages.mockResolvedValue(twoPages);
    mockCreate.mockResolvedValue(
      sectionsReply([{ chip: 'parking', body: 'a '.repeat(300), source: 1 }]),
    );
    const { data } = await (await draft(venue.id)).json();
    const parking = data.sections.find(
      (section: { chipType: string }) => section.chipType === 'parking',
    );
    expect(parking.state).toBe('check');
    expect(parking.body.length).toBeLessThanOrEqual(400);
    expect(parking.note).toBe('Cut to fit. Check the end.');
  });

  it('asks nothing and charges nothing when no page could be read', async () => {
    const venue = await seedVenue();
    mockReadPages.mockResolvedValue({
      attempts: [
        { url: FAQ, status: 'notFound' },
        { url: 'https://dazzledenver.com/info', status: 'disallowed' },
      ],
      pages: [],
    });
    const res = await draft(venue.id);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(data.costUsd).toBeNull();
    expect(data.sources).toHaveLength(2);
    expect(
      data.sections.every(
        (section: { state: string }) => section.state === 'blank',
      ),
    ).toBe(true);
    expect((await audits(venue.id)).map((row) => row.metadata)).toEqual([
      { tried: 2, read: 0, drafted: 0, check: 0 },
    ]);
  });

  it('is a 503, audited as failed, when the call fails or the reply is unreadable', async () => {
    const venue = await seedVenue();
    mockReadPages.mockResolvedValue(twoPages);
    mockCreate.mockRejectedValueOnce(new Error('overloaded'));
    expect((await draft(venue.id)).status).toBe(503);

    mockCreate.mockResolvedValueOnce(reply('Here is your guide!'));
    const unreadable = await draft(venue.id);
    expect(unreadable.status).toBe(503);
    expect(JSON.stringify(await unreadable.json())).toContain('unreadable');

    expect((await audits(venue.id)).map((row) => row.metadata)).toEqual([
      { tried: 4, read: 2, failed: true },
      { tried: 4, read: 2, failed: true, unreadable: true },
    ]);
    // The unreadable reply was still paid for.
    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'venue-guide-draft'));
    expect(costs).toHaveLength(1);
  });

  it('refuses a non-UUID id, an unknown venue and a venue with no usable website', async () => {
    expect((await draft('not-a-uuid')).status).toBe(400);
    expect((await draft('00000000-0000-4000-8000-000000000000')).status).toBe(
      404,
    );
    const venue = await seedVenue({ websiteUrl: 'ftp://dazzle.example' });
    expect((await draft(venue.id)).status).toBe(400);
    expect(mockReadPages).not.toHaveBeenCalled();
  });

  it('holds back from a removed venue, a paused crawl and a blocked site', async () => {
    const now = new Date();
    for (const overrides of [
      { removedAt: now },
      { crawlPausedAt: now },
      { blockedAt: now },
    ]) {
      const key = Object.keys(overrides)[0];
      const venue = await seedVenue({
        name: `Venue ${key}`,
        slug: `venue-${key.toLowerCase()}`,
        ...overrides,
      });
      expect((await draft(venue.id)).status).toBe(409);
    }
    expect(mockReadPages).not.toHaveBeenCalled();
  });

  it('reads nothing and asks nothing once "If it runs out" stops the spent budget', async () => {
    const venue = await seedVenue();
    await testDb.insert(adminSettings).values({
      llmMonthlyBudgetUsd: '1',
      llmBudgetFallbackToStructured: true,
    });
    await testDb
      .insert(costTracking)
      .values({ service: 'venue-about', costUsd: '2', recordedAt: new Date() });
    const res = await draft(venue.id);
    expect(res.status).toBe(409);
    expect(mockReadPages).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect((await audits(venue.id)).map((row) => row.metadata)).toEqual([
      { failed: true, overBudget: true },
    ]);
  });

  it('reads the JSON past a sentence around it', async () => {
    const venue = await seedVenue();
    mockReadPages.mockResolvedValue(twoPages);
    mockCreate.mockResolvedValue(
      reply(
        `Here is the guide:\n${JSON.stringify({ sections: [{ chip: 'parking', body: 'Garage.', source: 1 }] })}\nHope it helps.`,
      ),
    );
    const res = await draft(venue.id);
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.sections[1]).toMatchObject({
      chipType: 'parking',
      state: 'drafted',
    });
  });

  it('is admin only', async () => {
    const venue = await seedVenue();
    authState.current = { userId: 'user_1', sessionClaims: {} };
    expect((await draft(venue.id)).status).toBe(403);
    expect(mockReadPages).not.toHaveBeenCalled();
  });
});
