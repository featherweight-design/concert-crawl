// The Needs you answer table: one row per drawn answer slug, each calling the
// existing domain logic (see the extractions in routes/admin/lib). A row runs
// an answer and, when its option is undoable, knows how to take it back from
// the `before` snapshot the answer returned.
//
// Navigation-only slugs (edit_then_list, review) are not endpoints; they are
// listed in NAVIGATION_SLUGS and the route rejects them with 400.

import { z } from 'zod';
import type { NeedsYouItem, NeedsYouKind } from '@concert-crawl/types';

export const NAVIGATION_SLUGS: ReadonlySet<string> = new Set([
  'edit_then_list',
  'review',
]);

export type AnswerFailureStatus = 400 | 404 | 409 | 422 | 500;

export type AnswerResult =
  | {
      ok: true;
      /** The prior state an undo needs. Null for answers with no undo. */
      before: Record<string, unknown> | null;
      /** The params the answer ran with, as recorded on the audit row. */
      params: Record<string, unknown>;
      /** Anything worth returning to the caller. */
      result?: Record<string, unknown>;
    }
  | AnswerFailure;

/** A refused answer. `code` is the API's stable discriminator, when it has one. */
export interface AnswerFailure {
  ok: false;
  status: AnswerFailureStatus;
  error: string;
  code?: string;
}

export type UndoResult =
  | { ok: true; restored: Record<string, unknown> }
  | { ok: false; status: AnswerFailureStatus; error: string };

export interface AnswerHandler {
  slug: string;
  kinds: readonly NeedsYouKind[];
  run: (
    item: NeedsYouItem,
    rawParams: unknown,
    actorId: string,
  ) => Promise<AnswerResult>;
  undo?: (before: unknown, actorId: string) => Promise<UndoResult>;
}

export const fail = (
  status: AnswerFailureStatus,
  error: string,
  code?: string,
): AnswerFailure => ({
  ok: false,
  status,
  error,
  ...(code === undefined ? {} : { code }),
});

export const STATE_CHANGED = 'This item has changed since it was answered';

interface UndoSpec<U extends z.ZodType> {
  schema: U;
  run: (before: z.infer<U>, actorId: string) => Promise<UndoResult>;
}

// Builds a handler that validates its params (and its undo snapshot) with Zod
// before touching anything.
export const define = <S extends z.ZodType, U extends z.ZodType>(spec: {
  slug: string;
  kinds: readonly NeedsYouKind[];
  schema: S;
  run: (
    item: NeedsYouItem,
    params: z.infer<S>,
    actorId: string,
  ) => Promise<AnswerResult>;
  undo?: UndoSpec<U>;
}): AnswerHandler => {
  const { undo } = spec;
  return {
    slug: spec.slug,
    kinds: spec.kinds,
    run: async (item, rawParams, actorId) => {
      const parsed = spec.schema.safeParse(rawParams);
      if (!parsed.success) {
        return fail(
          400,
          `Invalid params: ${parsed.error.issues.map((issue) => `${issue.path.join('.') || 'params'} ${issue.message}`).join('; ')}`,
        );
      }
      return spec.run(item, parsed.data, actorId);
    },
    ...(undo
      ? {
          undo: async (before: unknown, actorId: string) => {
            const parsed = undo.schema.safeParse(before);
            if (!parsed.success) {
              return fail(422, 'The recorded prior state is unreadable');
            }
            return undo.run(parsed.data, actorId);
          },
        }
      : {}),
  };
};

export const noParams = z.object({});
export const isoOrNull = z.string().datetime({ offset: true }).nullable();

export const eventIdOf = (item: NeedsYouItem): string | null =>
  item.kind === 'show-dropped' ||
  item.kind === 'show-moved' ||
  item.kind === 'event-low-confidence'
    ? item.eventId
    : null;
