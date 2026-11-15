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
  AdminFeedbackItem,
  AdminFeedbackStatus,
  FeedbackCategory,
} from '@concert-crawl/types';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createApp } from '../../app.js';
import { clearTables, seedUserProfile } from '../../test/helpers/seed.js';
import { testDb } from '../../test/helpers/db.js';

const app = createApp();

const countsBody = z.object({
  data: z.object({
    unread: z.number(),
    toRead: z.number(),
    done: z.number(),
    kinds: z.object({
      bugs: z.number(),
      ideas: z.number(),
      venues: z.number(),
    }),
  }),
});
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

    it('audits a resolve then a reopen as two status transitions', async () => {
      setAuth('admin');
      const id = await seedFeedback('flagged');

      await patch(id, { status: 'resolved' });
      await patch(id, { status: 'unread' });

      const audits = await testDb
        .select({ metadata: auditLog.metadata })
        .from(auditLog)
        .where(eq(auditLog.action, 'feedback.update'))
        .orderBy(asc(auditLog.createdAt));
      expect(audits.map((audit) => audit.metadata)).toEqual([
        { status: { from: 'flagged', to: 'resolved' }, resolved: 'resolved' },
        { status: { from: 'resolved', to: 'unread' }, resolved: 'reopened' },
      ]);
    });

    it('treats re-sending the current status as no transition', async () => {
      setAuth('admin');
      const resolvedAt = new Date('2026-11-01T00:00:00Z');
      const id = await seedFeedback('resolved', 'bug', {
        resolvedBy: 'user_first_admin',
        resolvedAt,
      });

      const res = await patch(id, { status: 'resolved', adminNotes: 'same' });
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('resolved');
      expect(res.data.adminNotes).toBe('same');

      const row = await readRow(id);
      expect(row?.resolvedBy).toBe('user_first_admin');
      expect(row?.resolvedAt?.toISOString()).toBe(resolvedAt.toISOString());

      const [audit] = await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, 'feedback.update'));
      expect(audit?.metadata).toBeNull();
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

    it('hands out only a checked screenshot, never an old unchecked one', async () => {
      setAuth('admin');
      const bad = await seedFeedback('unread', 'bug', {
        metadata: {
          device: 'Mac',
          screenshot: 'javascript:alert(1)',
          screenshotDataUrl: 'https://tracker.example.com/pixel.png',
        },
      });
      const legacy = await seedFeedback('unread', 'bug', {
        metadata: { screenshotDataUrl: 'data:image/png;base64,AAAA' },
      });
      const good = await seedFeedback('unread', 'bug', {
        metadata: { screenshot: 'data:image/gif;base64,R0lGODlh' },
      });

      const { data } = await list('?view=to_read');
      const byId = new Map(data.map((item) => [item.id, item.metadata]));
      expect(byId.get(bad)).toEqual({ device: 'Mac' });
      expect(byId.get(legacy)).toEqual({
        screenshot: 'data:image/png;base64,AAAA',
      });
      expect(byId.get(good)).toEqual({
        screenshot: 'data:image/gif;base64,R0lGODlh',
      });
      expect(JSON.stringify(data)).not.toContain('javascript:');
      expect(JSON.stringify(data)).not.toContain('tracker.example.com');
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
      const json = countsBody.parse(await res.json());
      expect(json.data).toEqual({
        unread: 2,
        toRead: 4,
        done: 2,
        kinds: { bugs: 3, ideas: 0, venues: 1 },
      });
    });

    it('counts each kind inside To read only, with error reports under Bugs', async () => {
      setAuth('admin');
      await seedFeedback('unread', 'bug');
      await seedFeedback('read', 'error_report');
      await seedFeedback('flagged', 'idea');
      await seedFeedback('unread', 'praise');
      await seedFeedback('resolved', 'bug');
      await seedFeedback('archived', 'venue_suggestion');

      const res = await app.request('/v1/admin/feedback/counts');
      const json = countsBody.parse(await res.json());
      expect(json.data.kinds).toEqual({ bugs: 2, ideas: 1, venues: 0 });
    });

    it('is zero on an empty table', async () => {
      setAuth('admin');
      const res = await app.request('/v1/admin/feedback/counts');
      const json = countsBody.parse(await res.json());
      expect(json.data).toEqual({
        unread: 0,
        toRead: 0,
        done: 0,
        kinds: { bugs: 0, ideas: 0, venues: 0 },
      });
    });
  });

  describe('kind, search and the submitter handle (P47-19 PR 4)', () => {
    it('filters Bugs to bug and error_report', async () => {
      setAuth('admin');
      await seedFeedback('unread', 'bug');
      await seedFeedback('unread', 'error_report');
      await seedFeedback('unread', 'idea');
      await seedFeedback('unread', 'venue_suggestion');

      const bugs = await list('?view=to_read&kind=bugs');
      expect(bugs.status).toBe(200);
      expect(bugs.data.map((item) => item.category).sort()).toEqual([
        'bug',
        'error_report',
      ]);
      const venues = await list('?kind=venues');
      expect(venues.data.map((item) => item.category)).toEqual([
        'venue_suggestion',
      ]);
      const ideas = await list('?kind=ideas');
      expect(ideas.data.map((item) => item.category)).toEqual(['idea']);
    });

    it('accepts a category inside its kind', async () => {
      setAuth('admin');
      await seedFeedback('unread', 'bug');
      await seedFeedback('unread', 'error_report');

      const { status, data } = await list('?kind=bugs&category=error_report');
      expect(status).toBe(200);
      expect(data.map((item) => item.category)).toEqual(['error_report']);
    });

    it('searches the message case-insensitively, with LIKE metacharacters literal', async () => {
      setAuth('admin');
      await seedFeedback('resolved', 'bug', { message: 'Map button is dead' });
      await seedFeedback('resolved', 'bug', { message: 'Price shows 50% off' });
      await seedFeedback('resolved', 'bug', { message: 'Price shows 500 off' });

      const map = await list('?view=done&search=MAP');
      expect(map.data.map((item) => item.message)).toEqual([
        'Map button is dead',
      ]);
      const percent = await list(
        `?view=done&search=${encodeURIComponent('50%')}`,
      );
      expect(percent.data.map((item) => item.message)).toEqual([
        'Price shows 50% off',
      ]);
      const underscore = await list('?view=done&search=_');
      expect(underscore.data).toEqual([]);
    });

    it('treats a blank search as no search', async () => {
      setAuth('admin');
      await seedFeedback('resolved');
      await seedFeedback('archived');

      const { status, data } = await list('?view=done&search=%20%20');
      expect(status).toBe(200);
      expect(data).toHaveLength(2);
    });

    it('returns the submitter handle, never the Clerk id, and null without a profile', async () => {
      setAuth('admin');
      await seedUserProfile('user_mira', { handle: 'mira.k' });
      await seedFeedback('unread', 'bug', { userId: 'user_mira' });
      await seedFeedback('unread', 'idea', { userId: 'user_no_profile' });
      await seedFeedback('unread', 'praise', { userId: null });

      const { data } = await list('?view=to_read');
      const byCategory = new Map(
        data.map((item) => [item.category, item.submittedBy]),
      );
      expect(byCategory.get('bug')).toBe('mira.k');
      expect(byCategory.get('idea')).toBeNull();
      expect(byCategory.get('praise')).toBeNull();
    });

    it('returns both handles on a PATCH answer', async () => {
      setAuth('admin');
      await seedUserProfile('user_mira', { handle: 'mira.k' });
      await seedUserProfile(ADMIN_ID, { handle: 'hugh' });
      const id = await seedFeedback('unread', 'bug', { userId: 'user_mira' });

      const { status, data } = await patch(id, { status: 'resolved' });
      expect(status).toBe(200);
      expect(data.submittedBy).toBe('mira.k');
      expect(data.resolvedBy).toBe('hugh');
    });
  });

  describe('Zod at the boundary', () => {
    it.each([
      'view=inbox',
      'category=rumour',
      'status=done',
      'kind=praise',
      'kind=bugs&category=idea',
      `search=${'x'.repeat(201)}`,
      `search=${encodeURIComponent(`${' '.repeat(300)}x`)}`,
      'search=%00',
    ])('rejects %s with 400', async (query) => {
      setAuth('admin');
      expect((await list(`?${query}`)).status).toBe(400);
    });

    it('refuses non-admins', async () => {
      setAuth('user', 'user_plain');
      expect((await list()).status).toBe(403);
    });
  });

  describe('GET /:id', () => {
    const getOne = (id: string) => app.request(`/v1/admin/feedback/${id}`);
    const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

    it('refuses a signed-out caller with 401', async () => {
      expect((await getOne(UNKNOWN_ID)).status).toBe(401);
    });

    it('refuses a non-admin with 403', async () => {
      setAuth('user', 'user_plain');
      expect((await getOne(UNKNOWN_ID)).status).toBe(403);
    });

    it('rejects a malformed id with 400', async () => {
      setAuth('admin');
      expect((await getOne('not-a-uuid')).status).toBe(400);
    });

    it('returns 404 for an unknown id', async () => {
      setAuth('admin');
      const res = await getOne(UNKNOWN_ID);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({
        success: false,
        error: 'Feedback not found',
      });
    });

    it('does not shadow /counts', async () => {
      setAuth('admin');
      const res = await getOne('counts');
      expect(res.status).toBe(200);
      expect(countsBody.safeParse(await res.json()).success).toBe(true);
    });

    it('returns the item exactly as the list row, both handles included', async () => {
      setAuth('admin');
      await seedUserProfile(ADMIN_ID, { handle: 'huey' });
      await seedUserProfile('user_reporter', { handle: 'reporter' });
      const id = await seedFeedback('flagged');
      await patch(id, { status: 'resolved', adminNotes: 'done' });

      const res = await getOne(id);
      expect(res.status).toBe(200);
      const row = (await list()).data.find((each) => each.id === id);
      expect(row?.submittedBy).toBe('reporter');
      expect(row?.resolvedBy).toBe('huey');
      expect(await res.json()).toEqual({ success: true, data: row });
    });
  });
});
