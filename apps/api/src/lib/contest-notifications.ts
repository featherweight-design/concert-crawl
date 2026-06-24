import { db, notifications } from '@concert-crawl/db'
import { apiLogger } from './logger.js'

/**
 * Input for the contest notification fan-out.
 *
 * Modeled as a discriminated union on `action` so the compiler enforces the
 * resolution invariant at every call site — without it, calling with
 * `action: 'resolve'` and `resolution: undefined` would silently drop the
 * key during JSON.stringify and break downstream consumers (and tests) that
 * read `metadata.resolution`.
 *
 * `action: 'resolve'` requires `resolution` and produces rows with
 * `category = 'contest.resolved'`. The metadata blob is `{ submissionId,
 * contestId, resolution }`.
 *
 * `action: 'defer'` does NOT carry a resolution (`resolution?: never`) and
 * produces rows with `category = 'contest.needs_info'`. The metadata blob is
 * `{ submissionId, contestId, eventId, role, kind: 'defer', reason }`.
 *
 * The two shapes differ deliberately — they were inlined in the resolve and
 * defer handlers at different points and the integration tests pin each
 * shape's keys. Lift verbatim, do not "harmonize" — downstream consumer
 * surfaces (issue #737) read the keys as-is.
 */
interface ContestNotificationInputBase {
  contestId: string
  parentSubmissionId: string
  challengerSubmissionId: string
  parentUserId: string | null
  challengerUserId: string | null
  eventId: string
  reason: string
}

export type ContestNotificationInput =
  | (ContestNotificationInputBase & {
      action: 'resolve'
      resolution: 'parent_wins' | 'challenger_wins'
    })
  | (ContestNotificationInputBase & {
      action: 'defer'
      resolution?: never
    })

interface Recipient {
  userId: string
  submissionId: string
  role: 'parent' | 'challenger'
}

/**
 * Write `user_notification` rows for the parent + challenger submitters of a
 * contest. Deduped when both ids are the same user (self-contest, defensive
 * only — in practice `parentUserId === challengerUserId` is impossible at
 * insert time because BOTH counter-creation routes enforce a self-dispute 403
 * with the same "Cannot dispute your own submission" error:
 *   - POST /v1/submissions/:id/dispute (apps/api/src/routes/submissions.ts)
 *   - POST /v1/events/:eventId/price-submissions when `disputedSubmissionId`
 *     is set (apps/api/src/routes/price-submissions.ts — the counter path
 *     bypasses the rate limiter, so the explicit guard is what blocks it).
 * We still dedupe defensively here for any future codepath that bypasses
 * those gates. The §4.6 partial unique index is a separate guarantee — it
 * prevents two pending counters against the same parent, not self-contest.
 * Skipped entirely when both ids are null.
 *
 * `notifications.metadata` is a `text` column (see packages/db schema), so
 * the metadata blob is JSON.stringify'd here. Inserting a raw object would
 * surface a Postgres type error at runtime.
 *
 * Best-effort: any insert failure is logged via apiLogger.warn and swallowed.
 * The helper never throws to the caller — resolve/defer call this AFTER their
 * transaction commits, and a notification failure must not roll back (or
 * appear to roll back) the already-committed admin action.
 */
export async function writeContestNotifications(
  input: ContestNotificationInput,
): Promise<{ written: number }> {
  const recipients: Recipient[] = []
  if (input.parentUserId !== null) {
    recipients.push({
      userId: input.parentUserId,
      submissionId: input.parentSubmissionId,
      role: 'parent',
    })
  }
  if (
    input.challengerUserId !== null &&
    input.challengerUserId !== input.parentUserId
  ) {
    recipients.push({
      userId: input.challengerUserId,
      submissionId: input.challengerSubmissionId,
      role: 'challenger',
    })
  }

  if (recipients.length === 0) return { written: 0 }

  const category =
    input.action === 'resolve' ? 'contest.resolved' : 'contest.needs_info'
  const title =
    input.action === 'resolve'
      ? 'Your price submission was reviewed.'
      : 'More info requested on your price submission.'

  // Branch metadata shape on action — the two inline blocks emitted different
  // blobs and the integration tests pin each shape's keys. Resolve: minimal
  // (submissionId, contestId, resolution). Defer: includes eventId, role,
  // kind:'defer', and a denormalized reason for consumer surfacing.
  const buildMetadata = (recipient: Recipient): string => {
    if (input.action === 'resolve') {
      return JSON.stringify({
        submissionId: recipient.submissionId,
        contestId: input.contestId,
        resolution: input.resolution,
      })
    }
    return JSON.stringify({
      submissionId: recipient.submissionId,
      contestId: input.contestId,
      eventId: input.eventId,
      role: recipient.role,
      kind: 'defer',
      reason: input.reason,
    })
  }

  const rows = recipients.map((recipient) => ({
    userId: recipient.userId,
    type: 'user_notification' as const,
    category,
    title,
    body: input.reason,
    actionUrl: `/events/${input.eventId}`,
    metadata: buildMetadata(recipient),
  }))

  try {
    await db.insert(notifications).values(rows)
    return { written: rows.length }
  } catch (notifyErr) {
    apiLogger.warn(
      { contestId: input.contestId, action: input.action, err: notifyErr },
      'Failed to write contest notifications; admin action itself already committed.',
    )
    return { written: 0 }
  }
}
