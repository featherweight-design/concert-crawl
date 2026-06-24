import { db, notifications } from '@concert-crawl/db'
import { apiLogger } from './logger.js'

/**
 * Input for the contest notification fan-out.
 *
 * `action: 'resolve'` requires `resolution` and produces rows with
 * `category = 'contest.resolved'`. The metadata blob is `{ submissionId,
 * contestId, resolution }`.
 *
 * `action: 'defer'` does NOT carry a resolution and produces rows with
 * `category = 'contest.needs_info'`. The metadata blob is `{ submissionId,
 * contestId, eventId, role, kind: 'defer', reason }`.
 *
 * The two shapes differ deliberately — they were inlined in the resolve and
 * defer handlers at different points and the integration tests pin each
 * shape's keys. Lift verbatim, do not "harmonize" — downstream consumer
 * surfaces (issue #737) read the keys as-is.
 */
export interface ContestNotificationInput {
  contestId: string
  parentSubmissionId: string
  challengerSubmissionId: string
  parentUserId: string | null
  challengerUserId: string | null
  eventId: string
  action: 'resolve' | 'defer'
  /** Required when action === 'resolve'. */
  resolution?: 'parent_wins' | 'challenger_wins'
  reason: string
}

interface Recipient {
  userId: string
  submissionId: string
  role: 'parent' | 'challenger'
}

/**
 * Write `user_notification` rows for the parent + challenger submitters of a
 * contest. Deduped when both ids are the same user (self-contest, defensive
 * only — the §4.6 partial unique index makes this dead-by-construction in
 * steady state). Skipped entirely when both ids are null.
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
