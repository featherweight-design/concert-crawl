import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAnthropicCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(
    class {
      messages = { create: mockAnthropicCreate };
    },
  ),
}));

const mockGetAuth = vi.fn();
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}));

const mockVenueRow = {
  id: 'venue-1',
  name: 'Ogden Theatre',
  slug: 'ogden-theatre',
  websiteUrl: 'https://ogdentheatre.com',
  city: 'Denver',
  address: '935 E Colfax Ave, Denver, CO 80218',
  venueType: null,
  active: true,
  verified: false,
  consecutiveFailures: 0,
  crawlDelayMs: 3000,
  lastCrawledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeQueryBuilder(resolveWith: unknown[] = []) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'from', 'where', 'orderBy', 'groupBy', 'limit'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (val: unknown[]) => void) => {
    resolve(resolveWith);
    return Promise.resolve(resolveWith);
  };
  return builder;
}

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockDb = {
  select: vi.fn().mockReturnValue(makeQueryBuilder([])),
  insert: vi.fn().mockReturnValue({ values: mockInsertValues }),
};
const mockCostTracking = { table: 'cost_tracking' };

vi.mock('@concert-crawl/db', () => ({
  db: mockDb,
  venues: {
    id: 'id',
    name: 'name',
    address: 'address',
    venueType: 'venue_type',
  },
  events: {},
  crawlRuns: {},
  auditLog: {},
  inviteCodes: {},
  costTracking: mockCostTracking,
}));

// Spread the real module so a new drizzle-orm import elsewhere in the app
// doesn't break this suite; only the operators it inspects are mocked.
vi.mock('drizzle-orm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('drizzle-orm')>()),
  eq: vi.fn().mockReturnValue(true),
  and: vi.fn().mockReturnValue(true),
  gte: vi.fn().mockReturnValue(true),
  ne: vi.fn().mockReturnValue(true),
  count: vi.fn().mockReturnValue(true),
  avg: vi.fn().mockReturnValue(true),
  desc: vi.fn().mockReturnValue(true),
  isNotNull: vi.fn().mockReturnValue(true),
}));

// Dynamic import after mock registration — required for ESM packages
const { createApp } = await import('../../app.js');

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  });
}

describe('POST /v1/admin/venues/:id/generate-about', () => {
  beforeEach(() => {
    mockGetAuth.mockReset();
    mockAnthropicCreate.mockReset();
    mockDb.select.mockReturnValue(makeQueryBuilder([]));
    mockDb.insert.mockClear();
    mockInsertValues.mockReset();
    mockInsertValues.mockResolvedValue(undefined);
  });

  const usage = {
    input_tokens: 1000,
    output_tokens: 200,
    cache_read_input_tokens: null,
    cache_creation_input_tokens: 500,
  };
  // calculateCost's Haiku rates: 1000 in, 200 out, 500 cache-write.
  const expectedCost = (
    1000 * (0.8 / 1_000_000) +
    200 * (4.0 / 1_000_000) +
    500 * (1.0 / 1_000_000)
  ).toFixed(6);
  const post = () =>
    createApp().request('/v1/admin/venues/venue-1/generate-about', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

  it('records the call’s cost as a venue-about row', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            capacity: 1600,
            venueType: 'Theater',
            neighborhood: 'Capitol Hill',
            about: 'A historic venue on Colfax Ave.',
          }),
        },
      ],
      usage,
    });
    const res = await post();
    expect(res.status).toBe(200);
    expect(mockDb.insert).toHaveBeenCalledWith(mockCostTracking);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    const row = mockInsertValues.mock.calls[0]?.[0];
    expect(row).toMatchObject({
      service: 'venue-about',
      costUsd: expectedCost,
      tokensUsed: '1200',
    });
    expect(JSON.parse(String(row?.metadata))).toEqual({
      venueId: 'venue-1',
      inputTokens: 1000,
      outputTokens: 200,
      cacheReadTokens: 0,
      cacheWriteTokens: 500,
    });
  });

  it('records the cost even when the reply doesn’t parse', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
      usage,
    });
    const res = await post();
    expect(res.status).toBe(503);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    expect(mockInsertValues.mock.calls[0]?.[0]).toMatchObject({
      service: 'venue-about',
      costUsd: expectedCost,
    });
  });

  it('a failed cost write never fails the draft', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockInsertValues.mockRejectedValue(new Error('db down'));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            capacity: null,
            venueType: 'Theater',
            neighborhood: 'Capitol Hill',
            about: 'A historic venue on Colfax Ave.',
          }),
        },
      ],
      usage,
    });
    const res = await post();
    expect(res.status).toBe(200);
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null);
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when venue not found', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([]));
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(404);
  });

  it('returns generated venue details on success', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            capacity: 1600,
            venueType: 'Theater',
            neighborhood: 'Capitol Hill',
            about:
              'A historic venue on Colfax Ave with a long live music tradition.',
          }),
        },
      ],
    });
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { capacity: number; venueType: string; about: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.capacity).toBe(1600);
    expect(body.data.venueType).toBe('Theater');
    expect(body.data.about).toMatch(/Colfax/);
  });

  it('strips markdown fences and parses successfully', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```json\n{"capacity":500,"venueType":"Bar","neighborhood":"RiNo","about":"A cozy neighborhood bar with live music."}\n```',
        },
      ],
    });
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { capacity: number; venueType: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.venueType).toBe('Bar');
    expect(body.data.capacity).toBe(500);
  });

  it('returns 503 when model returns completely invalid JSON', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot help with that.' }],
    });
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/invalid JSON/i);
  });

  it('returns 503 when Anthropic call throws', async () => {
    adminAuth();
    mockDb.select.mockReturnValue(makeQueryBuilder([mockVenueRow]));
    mockAnthropicCreate.mockRejectedValue(new Error('API rate limit exceeded'));
    const res = await createApp().request(
      '/v1/admin/venues/venue-1/generate-about',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(false);
  });
});
