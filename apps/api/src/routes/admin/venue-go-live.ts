import { zValidator } from '@hono/zod-validator';
import {
  db,
  feedback,
  venueSuggestionDismissals,
  venues,
} from '@concert-crawl/db';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { validationHook } from '../../lib/validator.js';
import { getAuthUser } from '../../middleware/auth.js';
import type { AdminVariables } from './index.js';
import { queueVenueCrawl } from './lib/crawl-trigger.js';

// Admin 3c-3: the writes that take a draft venue live, and the Start list of
// venues fans asked for. Mounted from admin/venues.ts, ahead of `/:id`, so
// `/suggestions` is never read as a venue id.
//
// A draft is `active = false AND went_live_at IS NULL` (plan decision 1). Ask
// the venue accepts any venue that is not removed; Go live refuses anything
// but a draft with a 409.

export const venueGoLiveAdminRouter = new Hono<AdminVariables>();

const idParamSchema = z.object({ id: z.uuid() });

const permissionAnswerSchema = z.object({
  answer: z.enum(['yes', 'no']),
});

const suggestionNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

/**
 * The key two spellings of one venue name share: lower case, letters and
 * digits only. "The Fox  Theatre" and "the fox theatre!" are one suggestion.
 */
export const venueNameKey = (name: string): string =>
  name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * A fan's suggestion is free text: the venue name on the first line and,
 * optionally, its website on the second. Null when there is no name.
 */
export const parseSuggestion = (
  message: string,
): { name: string; websiteUrl: string | null } | null => {
  const [first = '', second = ''] = message.split('\n');
  const name = first.trim().slice(0, 120);
  if (venueNameKey(name) === '') return null;
  const site = second.trim();
  return { name, websiteUrl: site === '' ? null : site.slice(0, 300) };
};

type DraftVenue = { id: string; robotsTxtAllowed: boolean | null };

/** Why a venue is not a draft: it is missing, removed, or already live. */
const notDraftResponse = async (id: string) => {
  const [venue] = await db
    .select({ removedAt: venues.removedAt })
    .from(venues)
    .where(eq(venues.id, id));
  if (!venue || venue.removedAt !== null) return { status: 404 as const };
  return { status: 409 as const };
};

const draftWhere = (id: string) =>
  and(
    eq(venues.id, id),
    eq(venues.active, false),
    isNull(venues.wentLiveAt),
    isNull(venues.removedAt),
  );

// POST /v1/admin/venues/:id/ask: the admin has written to the venue for
// permission. Sets only `permission_asked_at` (decision 7a): nothing is paused,
// so `venue-auto-resume.ts` never touches it. Allowed on a draft and on a live
// venue the crawler is blocked at (the Needs you button); only a removed venue
// is refused.
venueGoLiveAdminRouter.post(
  '/:id/ask',
  zValidator('param', idParamSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const [venue] = await db
      .update(venues)
      .set({ permissionAskedAt: new Date() })
      .where(and(eq(venues.id, id), isNull(venues.removedAt)))
      .returning({
        id: venues.id,
        permissionAskedAt: venues.permissionAskedAt,
      });
    if (!venue) {
      return ctx.json({ success: false, error: 'Venue not found' }, 404);
    }
    ctx.set('auditAction', 'venue.ask_permission');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    return ctx.json({ success: true, data: venue });
  },
);

// POST /v1/admin/venues/:id/permission-answer: They said yes / They said no.
// Either answer ends the wait, so the 14-day reminder stops. The answer is
// kept in the audit row.
venueGoLiveAdminRouter.post(
  '/:id/permission-answer',
  zValidator('param', idParamSchema, validationHook),
  zValidator('json', permissionAnswerSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const { answer } = ctx.req.valid('json');
    const [venue] = await db
      .update(venues)
      .set({ permissionAskedAt: null })
      .where(
        and(
          eq(venues.id, id),
          isNull(venues.removedAt),
          isNotNull(venues.permissionAskedAt),
        ),
      )
      .returning({ id: venues.id });
    if (!venue) {
      const refusal = await notDraftResponse(id);
      return ctx.json(
        {
          success: false,
          error:
            refusal.status === 404
              ? 'Venue not found'
              : 'This venue is not waiting on an answer',
          ...(refusal.status === 409 && { code: 'not_waiting' }),
        },
        refusal.status,
      );
    }
    ctx.set('auditAction', 'venue.permission_answer');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', getAuthUser(ctx).userId);
    ctx.set('auditMeta', { answer });
    return ctx.json({ success: true, data: { id, answer } });
  },
);

// POST /v1/admin/venues/:id/go-live: the only writer that sets `active` and
// `went_live_at` together (decision 1). Option A (decision 4): the venue goes
// live and a normal crawl is queued at once; test rows are never published.
// robots.txt is never overridden, so a disallowing venue cannot go live.
venueGoLiveAdminRouter.post(
  '/:id/go-live',
  zValidator('param', idParamSchema, validationHook),
  async (ctx) => {
    const { id } = ctx.req.valid('param');
    const actor = getAuthUser(ctx).userId;

    const [draft]: DraftVenue[] = await db
      .select({ id: venues.id, robotsTxtAllowed: venues.robotsTxtAllowed })
      .from(venues)
      .where(draftWhere(id));
    if (!draft) {
      const refusal = await notDraftResponse(id);
      return ctx.json(
        {
          success: false,
          error:
            refusal.status === 404
              ? 'Venue not found'
              : 'This venue is already live',
          ...(refusal.status === 409 && { code: 'not_draft' }),
        },
        refusal.status,
      );
    }
    if (draft.robotsTxtAllowed === false) {
      return ctx.json(
        {
          success: false,
          error:
            'robots.txt disallows crawling this venue. We never override it.',
          code: 'robots_disallowed',
        },
        409,
      );
    }

    // The guard repeats the draft check, so two admins pressing Go live at once
    // cannot both win: the loser's update matches no row.
    const [live] = await db
      .update(venues)
      .set({ active: true, wentLiveAt: new Date(), permissionAskedAt: null })
      .where(draftWhere(id))
      .returning({ id: venues.id, wentLiveAt: venues.wentLiveAt });
    if (!live) {
      return ctx.json(
        {
          success: false,
          error: 'This venue is already live',
          code: 'not_draft',
        },
        409,
      );
    }

    // The venue is live whatever happens next. A crawl that could not be
    // queued is reported, not rolled back: the nightly crawl picks the venue up.
    const queued = await queueVenueCrawl(id, actor, false);
    const crawl =
      queued.ok === 'queued'
        ? { queued: true as const, triggerId: queued.triggerId }
        : { queued: false as const, reason: queued.ok };

    ctx.set('auditAction', 'venue.go_live');
    ctx.set('auditTargetId', id);
    ctx.set('auditActorId', actor);
    ctx.set('auditMeta', { crawlQueued: crawl.queued });
    return ctx.json({
      success: true,
      data: { id, wentLiveAt: live.wentLiveAt, crawl },
    });
  },
);

// GET /v1/admin/venues/suggestions: "Venues people asked for". Fan
// suggestions grouped by normalized name, most asked first, with active
// dismissals left out (decision 6). Empty until fans can suggest a venue.
venueGoLiveAdminRouter.get('/suggestions', async (ctx) => {
  const rows = await db
    .select({
      userId: feedback.userId,
      id: feedback.id,
      message: feedback.message,
      createdAt: feedback.createdAt,
    })
    .from(feedback)
    .where(eq(feedback.category, 'venue_suggestion'))
    .orderBy(desc(feedback.createdAt));

  const dismissed = await db
    .select({ nameKey: venueSuggestionDismissals.nameKey })
    .from(venueSuggestionDismissals)
    .where(isNull(venueSuggestionDismissals.clearedAt));
  const hidden = new Set(dismissed.map((row) => row.nameKey));

  type Group = {
    name: string;
    websiteUrl: string | null;
    fans: Set<string>;
    latestAt: Date;
  };
  const groups = new Map<string, Group>();
  // Newest first, so the first row of a group names it and dates its latest ask.
  for (const row of rows) {
    const parsed = parseSuggestion(row.message);
    if (!parsed) continue;
    const key = venueNameKey(parsed.name);
    if (hidden.has(key)) continue;
    // A fan who has left has no user id: each such row stands for one fan.
    const fan = row.userId ?? row.id;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        name: parsed.name,
        websiteUrl: parsed.websiteUrl,
        fans: new Set([fan]),
        latestAt: row.createdAt,
      });
      continue;
    }
    group.fans.add(fan);
    group.websiteUrl ??= parsed.websiteUrl;
  }

  const data = [...groups.values()]
    .map((group) => ({
      name: group.name,
      websiteUrl: group.websiteUrl,
      fans: group.fans.size,
      latestAt: group.latestAt,
    }))
    .sort(
      (left, right) =>
        right.fans - left.fans ||
        right.latestAt.getTime() - left.latestAt.getTime(),
    );
  return ctx.json({ success: true, data });
});

// POST /v1/admin/venues/suggestions/dismiss: Not for us. Idempotent: a name
// already dismissed stays dismissed, with its first row.
venueGoLiveAdminRouter.post(
  '/suggestions/dismiss',
  zValidator('json', suggestionNameSchema, validationHook),
  async (ctx) => {
    const { name } = ctx.req.valid('json');
    const nameKey = venueNameKey(name);
    if (nameKey === '') {
      return ctx.json({ success: false, error: 'Name has no letters' }, 400);
    }
    const actor = getAuthUser(ctx).userId;
    await db
      .insert(venueSuggestionDismissals)
      .values({ nameKey, displayName: name, dismissedBy: actor })
      .onConflictDoNothing();
    ctx.set('auditAction', 'venue.suggestion.dismiss');
    ctx.set('auditActorId', actor);
    ctx.set('auditMeta', { name });
    return ctx.json({ success: true, data: { name } });
  },
);

// POST /v1/admin/venues/suggestions/undo: Undo on Not for us. Clears the
// active dismissal, 404 when there is none.
venueGoLiveAdminRouter.post(
  '/suggestions/undo',
  zValidator('json', suggestionNameSchema, validationHook),
  async (ctx) => {
    const { name } = ctx.req.valid('json');
    const actor = getAuthUser(ctx).userId;
    const [cleared] = await db
      .update(venueSuggestionDismissals)
      .set({ clearedAt: new Date(), clearedBy: actor })
      .where(
        and(
          eq(venueSuggestionDismissals.nameKey, venueNameKey(name)),
          isNull(venueSuggestionDismissals.clearedAt),
        ),
      )
      .returning({ id: venueSuggestionDismissals.id });
    if (!cleared) {
      return ctx.json(
        { success: false, error: 'That suggestion is not dismissed' },
        404,
      );
    }
    ctx.set('auditAction', 'venue.suggestion.undo');
    ctx.set('auditActorId', actor);
    ctx.set('auditMeta', { name });
    return ctx.json({ success: true, data: { name } });
  },
);
