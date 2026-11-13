// Needs you answers: show-dropped, show-moved and low-confidence events. See answer-kit.ts for the handler shape.

import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { db, events } from '@concert-crawl/db';
import { idSchema } from '../../../../lib/id-schema.js';
import { setHiddenFromConsumer, verifyEvent } from '../event-actions.js';
import { mergeEvents } from '../event-merge.js';
import { updateEvent } from '../event-update.js';
import {
  type AnswerResult,
  define,
  fail,
  noParams,
  isoOrNull,
  eventIdOf,
  STATE_CHANGED,
} from './answer-kit.js';

const SHOW_KINDS = ['show-dropped', 'show-moved'] as const;

export const stillOn = define({
  slug: 'still_on',
  kinds: SHOW_KINDS,
  schema: noParams,
  run: async (item) => {
    const eventId = eventIdOf(item);
    if (eventId === null) return fail(400, 'Not a show item');
    const [existing] = await db
      .select({ firstMissingAt: events.firstMissingAt })
      .from(events)
      .where(eq(events.id, eventId));
    if (!existing) return fail(404, 'Event not found');
    // The same write as the admin Missing tab's Dismiss: the show stays listed.
    const updated = await updateEvent(eventId, { firstMissingAt: null });
    if (!updated) return fail(404, 'Event not found');
    return {
      ok: true,
      params: {},
      before: {
        eventId,
        firstMissingAt: existing.firstMissingAt?.toISOString() ?? null,
      },
    };
  },
  undo: {
    schema: z.object({ eventId: idSchema, firstMissingAt: isoOrNull }),
    run: async (before) => {
      if (before.firstMissingAt === null) {
        return { ok: true, restored: { eventId: before.eventId } };
      }
      // Only while the flag is still clear: a crawler re-stamp means the show
      // went missing again and the answer no longer describes it.
      const restored = await db
        .update(events)
        .set({
          firstMissingAt: new Date(before.firstMissingAt),
          updatedAt: new Date(),
        })
        .where(
          and(eq(events.id, before.eventId), isNull(events.firstMissingAt)),
        )
        .returning({ id: events.id });
      if (restored.length === 0) return fail(409, STATE_CHANGED);
      return {
        ok: true,
        restored: {
          eventId: before.eventId,
          firstMissingAt: before.firstMissingAt,
        },
      };
    },
  },
});

export const setStatusAnswer = (slug: 'postponed' | 'cancelled') =>
  define({
    slug,
    kinds: SHOW_KINDS,
    schema: noParams,
    run: async (item) => {
      const eventId = eventIdOf(item);
      if (eventId === null) return fail(400, 'Not a show item');
      // The existing event update: it ends any silent delisting and fans out
      // the watch notification when the status really changes.
      const updated = await updateEvent(eventId, { status: slug });
      if (!updated) return fail(404, 'Event not found');
      return { ok: true, params: {}, before: null };
    },
  });

const mergeResult = (
  result: Awaited<ReturnType<typeof mergeEvents>>,
  targetId: string,
): AnswerResult => {
  if (result.ok === 'source_not_found') return fail(404, 'Event not found');
  if (result.ok === 'target_not_found') {
    return fail(404, 'Target event not found');
  }
  return {
    ok: true,
    params: { toEventId: targetId },
    // The merge deletes the source row, so the answer's audit keeps it whole.
    before: { source: result.source },
    result: { mergedInto: targetId, referencesMoved: result.referencesMoved },
  };
};

export const moved = define({
  slug: 'moved',
  kinds: ['show-dropped'],
  schema: z.object({ toEventId: idSchema }),
  run: async (item, params, actorId) => {
    const eventId = eventIdOf(item);
    if (eventId === null) return fail(400, 'Not a show item');
    if (eventId === params.toEventId) {
      return fail(422, 'Source and target must differ');
    }
    return mergeResult(
      await mergeEvents({
        sourceId: eventId,
        targetId: params.toEventId,
        actorId,
        notifyWatchers: true,
        suggestion: null,
        audit: false,
      }),
      params.toEventId,
    );
  },
});

export const moveTo = define({
  slug: 'move_to',
  kinds: ['show-moved'],
  schema: noParams,
  run: async (item, _params, actorId) => {
    if (item.kind !== 'show-moved') return fail(400, 'Not a moved show');
    return mergeResult(
      await mergeEvents({
        sourceId: item.eventId,
        targetId: item.moveTo.eventId,
        actorId,
        notifyWatchers: true,
        suggestion: null,
        audit: false,
      }),
      item.moveTo.eventId,
    );
  },
});

// ---------------------------------------------------------------------------
// Low-confidence events
// ---------------------------------------------------------------------------

const eventState = async (eventId: string) => {
  const [row] = await db
    .select({
      hiddenFromConsumer: events.hiddenFromConsumer,
      verified: events.verified,
    })
    .from(events)
    .where(eq(events.id, eventId));
  return row ?? null;
};

export const notAConcert = define({
  slug: 'not_a_concert',
  kinds: ['event-low-confidence'],
  schema: noParams,
  run: async (item) => {
    const eventId = eventIdOf(item);
    if (eventId === null) return fail(400, 'Not an event item');
    const prior = await eventState(eventId);
    if (!prior) return fail(404, 'Event not found');
    await db.transaction((tx) => setHiddenFromConsumer(tx, [eventId], true));
    return {
      ok: true,
      params: {},
      before: { eventId, hiddenFromConsumer: prior.hiddenFromConsumer },
    };
  },
  undo: {
    schema: z.object({ eventId: idSchema, hiddenFromConsumer: z.boolean() }),
    run: async (before) => {
      const current = await eventState(before.eventId);
      if (!current?.hiddenFromConsumer) return fail(409, STATE_CHANGED);
      if (!before.hiddenFromConsumer) {
        await db.transaction((tx) =>
          setHiddenFromConsumer(tx, [before.eventId], false),
        );
      }
      return {
        ok: true,
        restored: {
          eventId: before.eventId,
          hiddenFromConsumer: before.hiddenFromConsumer,
        },
      };
    },
  },
});

export const itsAShow = define({
  slug: 'its_a_show',
  kinds: ['event-low-confidence'],
  schema: noParams,
  run: async (item) => {
    const eventId = eventIdOf(item);
    if (eventId === null) return fail(400, 'Not an event item');
    const prior = await eventState(eventId);
    if (!prior) return fail(404, 'Event not found');
    const updated = await verifyEvent(eventId);
    if (!updated) return fail(404, 'Event not found');
    return {
      ok: true,
      params: {},
      before: { eventId, verified: prior.verified },
    };
  },
  undo: {
    schema: z.object({ eventId: idSchema, verified: z.boolean() }),
    run: async (before) => {
      // Only while the event is still verified and still visible.
      const restored = await db
        .update(events)
        .set({ verified: before.verified, updatedAt: new Date() })
        .where(
          and(
            eq(events.id, before.eventId),
            eq(events.verified, true),
            eq(events.hiddenFromConsumer, false),
          ),
        )
        .returning({ id: events.id });
      if (restored.length === 0) return fail(409, STATE_CHANGED);
      return {
        ok: true,
        restored: { eventId: before.eventId, verified: before.verified },
      };
    },
  },
});

// ---------------------------------------------------------------------------
