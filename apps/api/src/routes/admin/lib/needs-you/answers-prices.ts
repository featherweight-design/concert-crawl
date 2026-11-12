// Needs you answers: price checks, price batches and bug reports. See answer-kit.ts for the handler shape.

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, feedback } from '@concert-crawl/db';
import type { NeedsYouItem } from '@concert-crawl/types';
import { idSchema } from '../../../../lib/id-schema.js';
import { resolveContest } from '../contest-resolve.js';
import { setSubmissionStatus } from '../price-submission-status.js';
import { type AnswerResult, define, fail, noParams } from './answer-kit.js';

export const resolveContestAnswer = (
  slug: 'use_checked_price' | 'keep_listed_price',
  resolution: 'challenger_wins' | 'parent_wins',
) =>
  define({
    slug,
    kinds: ['price-check'],
    schema: z.object({ reason: z.string().min(10).max(2000) }),
    run: async (item, params) => {
      if (item.kind !== 'price-check') return fail(400, 'Not a price check');
      const outcome = await resolveContest(
        item.contestId,
        resolution,
        params.reason,
      );
      if (outcome.ok === 'not_found') return fail(404, 'Contest not found');
      if (outcome.ok === 'precondition_failed') {
        return fail(409, outcome.reason);
      }
      return {
        ok: true,
        params: { reason: params.reason },
        before: null,
        result: {
          resolution,
          parentId: outcome.parent.id,
          challengerId: outcome.challenger.id,
          eventPriceUpdated: outcome.eventPriceUpdated,
          orphanedCounterIds: outcome.orphanedCounterIds,
        },
      };
    },
  });

export const approveAll = define({
  slug: 'approve_all',
  kinds: ['price-batch'],
  schema: z.object({
    submissionIds: z.array(idSchema).min(1).max(500).optional(),
  }),
  run: async (item, params) => {
    if (item.kind !== 'price-batch') return fail(400, 'Not a price batch');
    const offered = new Set(item.submissionIds);
    const ids = params.submissionIds ?? item.submissionIds;
    const outside = ids.filter((id) => !offered.has(id));
    if (outside.length > 0) {
      return fail(
        422,
        `Not part of this batch: ${outside.slice(0, 5).join(', ')}`,
      );
    }
    const approved: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    // One at a time through the same path as the admin approve button, so cred
    // and pricedrop fan-out run per submission.
    for (const id of new Set(ids)) {
      const outcome = await setSubmissionStatus(id, 'corroborated');
      if (outcome.ok === true) approved.push(id);
      else
        skipped.push({
          id,
          reason: outcome.ok === 'contest_lockout' ? 'in a contest' : 'missing',
        });
    }
    if (approved.length === 0) {
      return fail(409, 'No submission in the batch could be approved');
    }
    return {
      ok: true,
      params: params.submissionIds ? { submissionIds: ids } : {},
      before: null,
      result: { approved, skipped },
    };
  },
});

// ---------------------------------------------------------------------------
// Bugs
// ---------------------------------------------------------------------------

// "Send reply and resolve" is not here on purpose: the reply API is 5d and its
// delivery to the reporter is Phase 6, so a reply would have nowhere to go.
const resolveBug = async (item: NeedsYouItem): Promise<AnswerResult> => {
  if (item.kind !== 'bug') return fail(400, 'Not a bug');
  const [updated] = await db
    .update(feedback)
    .set({ status: 'resolved' })
    .where(eq(feedback.id, item.feedbackId))
    .returning({ id: feedback.id });
  if (!updated) return fail(404, 'Feedback not found');
  return { ok: true, params: {}, before: null };
};

export const resolveOnly = define({
  slug: 'resolve',
  kinds: ['bug'],
  schema: noParams,
  run: (item) => resolveBug(item),
});
