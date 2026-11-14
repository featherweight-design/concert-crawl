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

import { auditLog, feedback } from '@concert-crawl/db';
import type {
  AdminFeedbackCounts,
  AdminFeedbackItem,
  AdminFeedbackStatus,
  FeedbackCategory,
} from '@concert-crawl/types';
import { eq } from 'drizzle-orm';
import { createApp } from '../../app.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();
const ADMIN_ID = 'user_clerk_admin_feedback';

function setAuth(role: 'admin' | 'user', userId = ADMIN_ID): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } };
}

const seedFeedback = async (
  status: AdminFeedbackStatus,
  category: FeedbackCategory = 'bug',
  extra: Partial<typeof feedback.$inferInsert> = {},
): Promise<string> => {
  const [row] = await testDb
    .insert(feedback)
    .values({
      userId: 'user_reporter',
      pageUrl: 'https://concertcrawl.app/browse',
      category,
      message: `A ${category} note`,
      status,
      ...extra,
    })
    .returning({ id: feedback.id });
  if (!row) throw new Error('seed failed');
  return row.id;
};

const readRow = async (id: string) => {
  const [row] = await testDb.select().from(feedback).where(eq(feedback.id, id));
  return row;
};

const patch = async (
  id: string,
  body: unknown,
): Promise<{ status: number; data: AdminFeedbackItem }> => {
  const res = await app.request(`/v1/admin/feedback/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data: AdminFeedbackItem };
  return { status: res.status, data: json.data };
};

const list = async (
  query = '',
): Promise<{ status: number; data: AdminFeedbackItem[] }> => {
  const res = await app.request(`/v1/admin/feedback${query}`);
  const json = (await res.json()) as { data: AdminFeedbackItem[] };
  return { status: res.status, data: json.data };
};

describe('admin feedback (integration)', () => {
  beforeEach(async () => {
    authState.current = null;
    await clearTables();
  });

  describe('PATCH resolved transitions', () => {
    it('records the acting admin and time when an item moves into Done', async () => {
      setAuth('admin');
      await seedUserProfile(ADMIN_ID, { handle: 'huey' });
      const id = await seedFeedback('unread');

      const before = Date.now();
      const res = await patch(id, { status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.data.status).toBe('resolved');
      expect(res.data.resolvedBy).toBe('huey');
      expect(JSON.stringify(res.data)).not.toContain(ADMIN_ID);

      const row = await readRow(id);
      expect(row?.resolvedBy).toBe(ADMIN_ID);
      expect(row?.resolvedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);

      const [audit] = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'feedback.update'));
      expect(audit?.actorId).toBe(ADMIN_ID);
      expect(audit?.targetId).toBe(id);
      expect(audit?.metadata).toEqual({
        status: { from: 'unread', to: 'resolved' },
        resolved: 'resolved',
      });
    });

    it.each<AdminFeedbackStatus>(['issue_opened', 'archived'])(
      'treats %s as Done',
      async (status) => {
        setAuth('admin');
        const id = await seedFeedback('flagged');
        await patch(id, { status });
        const row = await readRow(id);
        expect(row?.resolvedBy).toBe(ADMIN_ID);
        expect(row?.resolvedAt).not.toBeNull();
      },
    );

    it('clears both when a Done item is reopened', async () => {
      setAuth('admin');
      const id = await seedFeedback('resolved', 'bug', {
        resolvedBy: 'user_someone_else',
        resolvedAt: new Date('2026-11-01T00:00:00Z'),
      });

      const res = await patch(id, { status: 'read' });
      expect(res.status).toBe(200);
      expect(res.data.resolvedBy).toBeNull();
      expect(res.data.resolvedAt).toBeNull();

      const row = await readRow(id);
      expect(row?.resolvedBy).toBeNull();
      expect(row?.resolvedAt).toBeNull();

      const [audit] = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'feedback.update'));
      expect(audit?.metadata).toEqual({
        status: { from: 'resolved', to: 'read' },
        resolved: 'reopened',
      });
    });

    it('keeps the original resolver on a move within Done', async () => {
      setAuth('admin');
      const resolvedAt = new Date('2026-11-01T00:00:00Z');
      const id = await seedFeedback('resolved', 'bug', {
        resolvedBy: 'user_first_admin',
        resolvedAt,
      });

      await patch(id, { status: 'archived' });
      const row = await readRow(id);
      expect(row?.status).toBe('archived');
      expect(row?.resolvedBy).toBe('user_first_admin');
      expect(row?.resolvedAt?.toISOString()).toBe(resolvedAt.toISOString());
    });

    it('leaves the resolved columns alone on a move within To read or a notes edit', async () => {
      setAuth('admin');
      const id = await seedFeedback('unread');

      await patch(id, { status: 'flagged' });
      await patch(id, { adminNotes: 'looking' });

      const row = await readRow(id);
      expect(row?.status).toBe('flagged');
      expect(row?.adminNotes).toBe('looking');
      expect(row?.resolvedBy).toBeNull();
      expect(row?.resolvedAt).toBeNull();
    });

    it('returns null for a resolver with no profile, never the Clerk id', async () => {
      setAuth('admin');
      const id = await seedFeedback('unread');
      const res = await patch(id, { status: 'resolved' });
      expect(res.data.resolvedBy).toBeNull();
      expect(res.data.resolvedAt).not.toBeNull();
      expect(JSON.stringify(res.data)).not.toContain(ADMIN_ID);
    });

    it('returns 404 for an unknown id', async () => {
      setAuth('admin');
      const res = await patch('11111111-1111-1111-1111-111111111111', {
        status: 'resolved',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET / view filter', () => {
    it('splits statuses into To read and Done', async () => {
      setAuth('admin');
      for (const status of [
        'unread',
        'read',
        'flagged',
        'issue_opened',
        'resolved',
        'archived',
      ] as const) {
        await seedFeedback(status);
      }

      const toRead = await list('?view=to_read');
      expect(toRead.status).toBe(200);
      expect(toRead.data.map((item) => item.status).sort()).toEqual([
        'flagged',
        'read',
        'unread',
      ]);

      const done = await list('?view=done');
      expect(done.data.map((item) => item.status).sort()).toEqual([
        'archived',
        'issue_opened',
        'resolved',
      ]);

      expect((await list()).data).toHaveLength(6);
      // status and view combine with AND.
      expect((await list('?view=done&status=unread')).data).toEqual([]);
    });

    it('returns the resolver handle and time per item', async () => {
      setAuth('admin');
      await seedUserProfile('user_jules', { handle: 'jules' });
      await seedFeedback('resolved', 'idea', {
        resolvedBy: 'user_jules',
        resolvedAt: new Date('2026-11-10T12:00:00Z'),
      });

      const { data } = await list('?view=done');
      expect(data[0]?.resolvedBy).toBe('jules');
      expect(data[0]?.resolvedAt).toBe('2026-11-10T12:00:00.000Z');
      expect(JSON.stringify(data)).not.toContain('user_jules');
    });
  });

  describe('new categories', () => {
    it('stores and filters error_report and venue_suggestion', async () => {
      setAuth('admin');
      await seedFeedback('unread', 'error_report');
      await seedFeedback('unread', 'venue_suggestion');
      await seedFeedback('unread', 'bug');

      const errors = await list('?category=error_report');
      expect(errors.status).toBe(200);
      expect(errors.data.map((item) => item.category)).toEqual([
        'error_report',
      ]);

      const venues = await list('?category=venue_suggestion&view=to_read');
      expect(venues.data.map((item) => item.category)).toEqual([
        'venue_suggestion',
      ]);
    });
  });

  describe('GET /counts', () => {
    it('counts unread, To read and Done', async () => {
      setAuth('admin');
      await seedFeedback('unread');
      await seedFeedback('unread', 'venue_suggestion');
      await seedFeedback('read');
      await seedFeedback('flagged');
      await seedFeedback('resolved');
      await seedFeedback('archived');

      const res = await app.request('/v1/admin/feedback/counts');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: AdminFeedbackCounts };
      expect(json.data).toEqual({ unread: 2, toRead: 4, done: 2 });
    });

    it('is zero on an empty table', async () => {
      setAuth('admin');
      const res = await app.request('/v1/admin/feedback/counts');
      const json = (await res.json()) as { data: AdminFeedbackCounts };
      expect(json.data).toEqual({ unread: 0, toRead: 0, done: 0 });
    });
  });

  describe('Zod at the boundary', () => {
    it.each(['view=inbox', 'category=rumour', 'status=done'])(
      'rejects %s with 400',
      async (query) => {
        setAuth('admin');
        expect((await list(`?${query}`)).status).toBe(400);
      },
    );

    it('refuses non-admins', async () => {
      setAuth('user', 'user_plain');
      expect((await list()).status).toBe(403);
    });
  });
});
