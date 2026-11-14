import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '../../app.js';

// Auth and boundary validation only: every case here is refused before the
// route touches the database. Reads, writes and the resolved transitions are
// covered against a real database in feedback.integration.test.ts.

const mockGetAuth = vi.fn();
vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => mockGetAuth(),
}));

vi.mock('@concert-crawl/db', () => ({
  db: {},
  feedback: {},
  userProfiles: {},
  auditLog: {},
  inviteCodes: {},
  crawlRuns: {},
  notifications: {},
  events: { id: 'id', verified: 'verified' },
  priceSubmissions: { id: 'id', status: 'status' },
}));

const FEEDBACK_ID = '11111111-1111-1111-1111-111111111111';

function adminAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'admin_123',
    sessionClaims: { metadata: { role: 'admin' } },
  });
}

function userAuth() {
  mockGetAuth.mockReturnValue({
    userId: 'user_123',
    sessionClaims: { metadata: { role: 'user' } },
  });
}

const patch = (body: unknown) =>
  createApp().request(`/v1/admin/feedback/${FEEDBACK_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /v1/admin/feedback', () => {
  beforeEach(() => {
    mockGetAuth.mockReset();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null);
    const res = await createApp().request('/v1/admin/feedback');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    userAuth();
    const res = await createApp().request('/v1/admin/feedback');
    expect(res.status).toBe(403);
  });

  it.each([
    ['status=invalid_status'],
    ['category=rumour'],
    ['view=inbox'],
    ['view='],
    ['limit=0'],
  ])('rejects %s with 400', async (query) => {
    adminAuth();
    const res = await createApp().request(`/v1/admin/feedback?${query}`);
    expect(res.status).toBe(400);
  });
});

describe('GET /v1/admin/feedback/counts', () => {
  beforeEach(() => {
    mockGetAuth.mockReset();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null);
    const res = await createApp().request('/v1/admin/feedback/counts');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    userAuth();
    const res = await createApp().request('/v1/admin/feedback/counts');
    expect(res.status).toBe(403);
  });
});

describe('PATCH /v1/admin/feedback/:id', () => {
  beforeEach(() => {
    mockGetAuth.mockReset();
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockGetAuth.mockReturnValue(null);
    expect((await patch({ status: 'read' })).status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    userAuth();
    expect((await patch({ status: 'read' })).status).toBe(403);
  });

  it('returns 400 on empty body (no fields to update)', async () => {
    adminAuth();
    expect((await patch({})).status).toBe(400);
  });

  it('returns 400 on an invalid status value', async () => {
    adminAuth();
    expect((await patch({ status: 'totally_invalid' })).status).toBe(400);
  });

  it('returns 400 on a view name sent as a status', async () => {
    adminAuth();
    expect((await patch({ status: 'done' })).status).toBe(400);
  });

  it('returns 400 on a non-uuid id', async () => {
    adminAuth();
    const res = await createApp().request('/v1/admin/feedback/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    });
    expect(res.status).toBe(400);
  });
});
