import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TestAuth {
  userId: string;
  sessionClaims: { metadata?: { role?: string } };
}

const { authState, mockCreate } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null };
  return { authState: state, mockCreate: vi.fn() };
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

import { and, eq } from 'drizzle-orm';
import { auditLog, costTracking, venues } from '@concert-crawl/db';
import { createApp } from '../../app.js';
import { clearTables, seedVenue } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

// Admin 3d-1b: glyph drafting. The glyph_svg save is venue-glyph-svg.integration.test.ts.

const app = createApp();

const request = (method: string, path: string, body?: unknown) =>
  app.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const GOOD =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20 L12 4 L20 20"/></svg>';
const FILLED =
  '<svg viewBox="0 0 24 24"><path d="M4 20 L12 4 L20 20 Z" fill="#f00"/></svg>';
const OFF_GRID =
  '<svg viewBox="0 0 24 24" fill="none"><circle cx="22" cy="12" r="6"/></svg>';

const reply = (text: string) => ({
  content: [{ type: 'text', text }],
  usage: { input_tokens: 1200, output_tokens: 800 },
});

const draftsReply = (
  drafts: { label: string; source?: string; svg: string }[],
) => reply(JSON.stringify({ drafts }));

// A 1 × 1 PNG.
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('admin glyph drafting (3d-1)', () => {
  beforeEach(async () => {
    authState.current = {
      userId: 'admin_1',
      sessionClaims: { metadata: { role: 'admin' } },
    };
    mockCreate.mockReset();
    await clearTables();
  });

  it('returns the drafts that pass, hides the rest by reason, and records the cost', async () => {
    const venue = await seedVenue({ name: 'Dazzle' });
    mockCreate.mockResolvedValue(
      draftsReply([
        { label: 'Glass and note', source: 'marquee-night.jpg', svg: GOOD },
        { label: 'Keys', source: 'name', svg: FILLED },
        { label: 'Star', svg: OFF_GRID },
        { label: 'Mic', source: 'somewhere-else.png', svg: GOOD },
      ]),
    );

    const res = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {
        references: [
          { name: 'marquee-night.jpg', mediaType: 'image/png', data: PIXEL },
        ],
        steer: 'the cocktail glass on the neon sign',
      },
    );
    expect(res.status).toBe(200);
    const { data } = (await res.json()) as {
      data: {
        drafts: { label: string; source: unknown; svg: string }[];
        hidden: Record<string, number>;
        asked: number;
      };
    };
    expect(data.asked).toBe(4);
    expect(data.drafts.map((draft) => [draft.label, draft.source])).toEqual([
      ['Glass and note', { kind: 'reference', name: 'marquee-night.jpg' }],
      ['Mic', { kind: 'name' }],
    ]);
    expect(data.drafts[0]?.svg).toContain('stroke="currentColor"');
    expect(data.hidden).toEqual({ fill: 1, offGrid: 1, invalid: 0, total: 2 });

    // The image went inline, ahead of the prompt.
    const sent = mockCreate.mock.calls[0]?.[0] as {
      messages: { content: { type: string }[] }[];
    };
    expect(sent.messages[0]?.content.map((block) => block.type)).toEqual([
      'image',
      'text',
    ]);
    // The steer reaches the prompt, quoted.
    expect(JSON.stringify(sent)).toContain(
      'the cocktail glass on the neon sign',
    );

    const costs = await testDb
      .select()
      .from(costTracking)
      .where(eq(costTracking.service, 'venue-glyph'));
    expect(costs).toHaveLength(1);
    expect(JSON.parse(costs[0]?.metadata ?? '{}')).toMatchObject({
      venueId: venue.id,
      inputTokens: 1200,
      outputTokens: 800,
    });
    expect(Number(costs[0]?.costUsd)).toBeGreaterThan(0);
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.action, 'venue.glyph_draft'),
          eq(auditLog.targetId, venue.id),
        ),
      );
    expect(audits).toHaveLength(1);

    // Nothing is stored on the venue.
    const [row] = await testDb
      .select()
      .from(venues)
      .where(eq(venues.id, venue.id));
    expect(row?.glyphSvg).toBeNull();
  });

  it('counts an unreadable or short reply as hidden drafts, not an error', async () => {
    const venue = await seedVenue();
    mockCreate.mockResolvedValueOnce(reply('Sorry, here are some ideas'));
    const unreadable = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {},
    );
    expect(unreadable.status).toBe(200);
    expect(((await unreadable.json()) as { data: unknown }).data).toMatchObject(
      {
        drafts: [],
        hidden: { invalid: 4, total: 4 },
      },
    );

    mockCreate.mockResolvedValueOnce(
      reply(
        `\`\`\`json\n${JSON.stringify({ drafts: [{ label: 'A', svg: GOOD }] })}\n\`\`\``,
      ),
    );
    const short = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {},
    );
    expect(((await short.json()) as { data: unknown }).data).toMatchObject({
      hidden: { invalid: 3, total: 3 },
    });

    // One malformed draft hides only itself.
    mockCreate.mockResolvedValueOnce(
      reply(
        JSON.stringify({
          drafts: [
            { label: 'A', svg: GOOD },
            { label: 'B' },
            { label: 'C', svg: GOOD },
            { label: 'D', svg: GOOD },
          ],
        }),
      ),
    );
    const mixed = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {},
    );
    expect(((await mixed.json()) as { data: unknown }).data).toMatchObject({
      hidden: { invalid: 1, total: 1 },
    });
  });

  it('answers 503 when the call fails, 422 for an unreadable image, 404 for no venue, 400 for a bad reference', async () => {
    const venue = await seedVenue();
    mockCreate.mockRejectedValueOnce(new Error('overloaded'));
    expect(
      (await request('POST', `/v1/admin/venues/${venue.id}/glyph-drafts`, {}))
        .status,
    ).toBe(503);
    // The failed attempt is audited.
    const failed = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, 'venue.glyph_draft'));
    expect(failed.map((audit) => audit.metadata)).toEqual([
      { references: 0, steered: false, failed: true },
    ]);

    const withImage = {
      references: [{ name: 'a.png', mediaType: 'image/png', data: PIXEL }],
    };
    mockCreate.mockRejectedValueOnce(
      Object.assign(new Error('image does not match the media type'), {
        status: 400,
      }),
    );
    expect(
      (
        await request(
          'POST',
          `/v1/admin/venues/${venue.id}/glyph-drafts`,
          withImage,
        )
      ).status,
    ).toBe(422);
    // A 400 that isn't about an image is an outage, not the image.
    mockCreate.mockRejectedValueOnce(
      Object.assign(new Error('Your credit balance is too low'), {
        status: 400,
      }),
    );
    expect(
      (
        await request(
          'POST',
          `/v1/admin/venues/${venue.id}/glyph-drafts`,
          withImage,
        )
      ).status,
    ).toBe(503);

    expect(
      (
        await request(
          'POST',
          '/v1/admin/venues/00000000-0000-0000-0000-000000000000/glyph-drafts',
          {},
        )
      ).status,
    ).toBe(404);

    expect(
      (await request('POST', '/v1/admin/venues/not-a-uuid/glyph-drafts', {}))
        .status,
    ).toBe(400);

    const bad = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {
        references: [
          { name: 'x.svg', mediaType: 'image/svg+xml', data: PIXEL },
        ],
      },
    );
    expect(bad.status).toBe(400);
    for (const body of [
      { references: Array.from({ length: 4 }, () => withImage.references[0]) },
      { prompt: 'unknown keys are refused' },
    ]) {
      expect(
        (
          await request(
            'POST',
            `/v1/admin/venues/${venue.id}/glyph-drafts`,
            body,
          )
        ).status,
      ).toBe(400);
    }

    // Over three full references is refused before it is parsed.
    const huge = await request(
      'POST',
      `/v1/admin/venues/${venue.id}/glyph-drafts`,
      {
        references: [
          {
            name: 'a.png',
            mediaType: 'image/png',
            data: 'A'.repeat(3_100_000),
          },
        ],
      },
    );
    expect(huge.status).toBe(413);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });
});
