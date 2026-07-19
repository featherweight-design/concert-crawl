import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, count, eq, inArray, isNull } from 'drizzle-orm'
import {
  db,
  eventReportConfirms,
  eventReports,
  events,
  notifications,
  userEvents,
  userProfiles,
  venues,
} from '@concert-crawl/db'
import {
  fanoutWatchNotification,
  WATCH_CATEGORY_FROM_REPORT_STATUS,
} from '@concert-crawl/push'
import { ER_POLICY } from '@concert-crawl/types'
import {
  clerkAuth,
  requireAuth,
  getAuthUser,
  getAuthOptional,
} from '../middleware/auth.js'
import { moderateNote } from '../lib/moderate-note.js'
import { isImminentEvent } from '../lib/time.js'

const REPORT_STATUSES = ['sold-out', 'cancelled', 'postponed'] as const
const EVIDENCE_METHODS = [
  'bought_myself',
  'saw_listing',
  'venue_site',
  'other',
] as const

function isImminent(eventDate: string | null): boolean {
  return isImminentEvent(eventDate, ER_POLICY.imminentThresholdDays)
}

// Is promoting a report of `reportStatus` going to actually flip user-visible
// state on this event? Called before the promotion runs so watchers only get
// notified on real transitions, not on duplicate promotions of the same
// state (e.g. a second confirmed 'sold-out' report after the first was
// already promoted).
//
// - cancelled/postponed: reflected in events.status. Check the current
//   value vs. the target.
// - sold-out: not on events.status; derived from having an active promoted
//   sold-out report. Check whether another promoted sold-out already exists.
//   /available flips resolution to 'rejected', so an /available-cleared row
//   correctly doesn't block the next fanout.
async function hasEventStateChanged(
  eventId: string,
  reportStatus: (typeof REPORT_STATUSES)[number],
): Promise<boolean> {
  if (reportStatus === 'cancelled' || reportStatus === 'postponed') {
    const [row] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)
    return row?.status !== reportStatus
  }
  // sold-out
  const existing = await db
    .select({ id: eventReports.id })
    .from(eventReports)
    .where(
      and(
        eq(eventReports.eventId, eventId),
        eq(eventReports.status, 'sold-out'),
        eq(eventReports.resolution, 'promoted'),
      ),
    )
    .limit(1)
  return existing.length === 0
}

const reportBodySchema = z.object({
  status: z.enum(REPORT_STATUSES),
  evidenceMethod: z.enum(EVIDENCE_METHODS),
  evidenceUrl: z.string().url().max(500).optional(),
  note: z.string().max(280).optional(),
})

export const eventReportsRouter = new Hono()

// POST /v1/events/:id/reports
eventReportsRouter.post(
  '/:id/reports',
  clerkAuth,
  requireAuth,
  zValidator('json', reportBodySchema, (result, ctx) => {
    if (!result.success) {
      return ctx.json(
        {
          success: false,
          error: 'Invalid input',
          details: result.error.flatten(),
        },
        422,
      )
    }
  }),
  async (ctx) => {
    const { id: eventId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)
    const body = ctx.req.valid('json')

    // Check event exists + isn't hidden from consumers (PR 6).
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)

    if (!event) {
      return ctx.json({ success: false, error: 'Event not found' }, 404)
    }

    // Content moderation
    if (body.note) {
      const modResult = moderateNote(body.note)
      if (!modResult.ok) {
        return ctx.json(
          { success: false, error: modResult.reason ?? 'Note rejected.' },
          422,
        )
      }
    }

    // 409 — user already has an unresolved report for this event
    const [existingReport] = await db
      .select({ id: eventReports.id })
      .from(eventReports)
      .where(
        and(
          eq(eventReports.eventId, eventId),
          eq(eventReports.reporterId, userId),
          isNull(eventReports.resolvedAt),
        ),
      )
      .limit(1)

    if (existingReport) {
      return ctx.json(
        {
          success: false,
          error: 'You already have an unresolved report for this event',
        },
        409,
      )
    }

    const [created] = await db
      .insert(eventReports)
      .values({
        eventId,
        reporterId: userId,
        status: body.status,
        evidenceMethod: body.evidenceMethod,
        evidenceUrl: body.evidenceUrl ?? null,
        note: body.note ?? null,
      })
      .returning()

    return ctx.json({ success: true, data: created }, 201)
  },
)

// GET /v1/events/:id/reports
eventReportsRouter.get('/:id/reports', clerkAuth, async (ctx) => {
  const { id: eventId } = ctx.req.param()
  const authUser = getAuthOptional(ctx)
  const userId = authUser?.userId ?? null

  // Fetch the event date for imminence check (hidden events 404 here too).
  const [event] = await db
    .select({ id: events.id, date: events.date })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
    .limit(1)

  if (!event) {
    return ctx.json({ success: false, error: 'Event not found' }, 404)
  }

  const imminent = isImminent(event.date)
  const confirmsNeeded = imminent
    ? ER_POLICY.confirmsRequiredImminent
    : ER_POLICY.confirmsRequired

  const reportRows = await db
    .select({
      id: eventReports.id,
      eventId: eventReports.eventId,
      reporterId: eventReports.reporterId,
      status: eventReports.status,
      evidenceMethod: eventReports.evidenceMethod,
      evidenceUrl: eventReports.evidenceUrl,
      note: eventReports.note,
      createdAt: eventReports.createdAt,
    })
    .from(eventReports)
    .where(
      and(eq(eventReports.eventId, eventId), isNull(eventReports.resolvedAt)),
    )

  if (reportRows.length === 0) {
    return ctx.json({ success: true, data: [] })
  }

  const reportIds = reportRows.map((rpt) => rpt.id)

  // Fetch confirm counts for all reports in one batch query — avoids correlated
  // subqueries in Drizzle sql<> which have parameterization edge cases in tests.
  const confirmCountRows = await db
    .select({ reportId: eventReportConfirms.reportId, total: count() })
    .from(eventReportConfirms)
    .where(inArray(eventReportConfirms.reportId, reportIds))
    .groupBy(eventReportConfirms.reportId)

  const confirmCountMap = new Map(
    confirmCountRows.map((row) => [row.reportId, row.total]),
  )

  // Fetch which reports the current user has confirmed
  const confirmedByUser = new Set<string>()
  if (userId !== null) {
    const confirmRows = await db
      .select({ reportId: eventReportConfirms.reportId })
      .from(eventReportConfirms)
      .where(
        and(
          eq(eventReportConfirms.userId, userId),
          inArray(eventReportConfirms.reportId, reportIds),
        ),
      )
    for (const row of confirmRows) {
      confirmedByUser.add(row.reportId)
    }
  }

  // Batch-lookup reporter handles for attribution display
  const reporterIds = [...new Set(reportRows.map((rpt) => rpt.reporterId))]
  const handleMap = new Map<string, string>()
  if (reporterIds.length > 0) {
    const profiles = await db
      .select({ userId: userProfiles.userId, handle: userProfiles.handle })
      .from(userProfiles)
      .where(inArray(userProfiles.userId, reporterIds))
    for (const profile of profiles) {
      if (profile.handle != null) {
        handleMap.set(profile.userId, profile.handle)
      }
    }
  }

  const enrichedReports = reportRows.map((report) => ({
    ...report,
    confirmsCount: confirmCountMap.get(report.id) ?? 0,
    confirmsNeeded,
    isReporter: report.reporterId === userId,
    userHasConfirmed: confirmedByUser.has(report.id),
    reporterHandle: handleMap.get(report.reporterId) ?? null,
  }))

  return ctx.json({ success: true, data: enrichedReports })
})

// POST /v1/events/:id/reports/:reportId/confirm
eventReportsRouter.post(
  '/:id/reports/:reportId/confirm',
  clerkAuth,
  requireAuth,
  async (ctx) => {
    const { id: eventId, reportId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)

    // Fetch report and verify it belongs to this event
    const [report] = await db
      .select({
        id: eventReports.id,
        eventId: eventReports.eventId,
        reporterId: eventReports.reporterId,
        status: eventReports.status,
        resolvedAt: eventReports.resolvedAt,
      })
      .from(eventReports)
      .where(eq(eventReports.id, reportId))
      .limit(1)

    if (!report || report.eventId !== eventId) {
      return ctx.json({ success: false, error: 'Report not found' }, 404)
    }

    if (report.resolvedAt != null) {
      return ctx.json({ success: false, error: 'Report already resolved' }, 400)
    }

    if (report.reporterId === userId) {
      return ctx.json(
        { success: false, error: 'Cannot confirm your own report' },
        403,
      )
    }

    const [insertedConfirm] = await db
      .insert(eventReportConfirms)
      .values({ reportId, userId })
      .onConflictDoNothing()
      .returning()

    if (!insertedConfirm) {
      return ctx.json(
        { success: false, error: 'Already confirmed this report' },
        409,
      )
    }

    // Count total confirms
    const [countResult] = await db
      .select({ total: count() })
      .from(eventReportConfirms)
      .where(eq(eventReportConfirms.reportId, reportId))

    const confirmsCount = countResult?.total ?? 0

    // Get event date for imminence check (hidden events skip — the consumer
    // can't read them anyway, so confirm flow shouldn't operate on them).
    const [eventRow] = await db
      .select({ date: events.date })
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.hiddenFromConsumer, false)))
      .limit(1)

    const imminent = isImminent(eventRow?.date ?? null)
    const threshold = imminent
      ? ER_POLICY.confirmsRequiredImminent
      : ER_POLICY.confirmsRequired

    let resolved = false
    if (confirmsCount >= threshold) {
      // Check pre-state to decide whether promotion actually transitions
      // user-visible state. Fan-out only fires on a real transition — a
      // second cancelled/postponed report promoted after the event was
      // already in that status shouldn't spam watchers a second time.
      const isRealTransition = await hasEventStateChanged(
        eventId,
        report.status,
      )

      await db
        .update(eventReports)
        .set({
          resolvedAt: new Date(),
          resolution: 'promoted',
        })
        .where(eq(eventReports.id, reportId))

      // events table has a status column — update it
      // Only map report statuses that correspond to event statuses
      if (report.status === 'cancelled' || report.status === 'postponed') {
        await db
          .update(events)
          .set({ status: report.status })
          .where(eq(events.id, eventId))
      }

      // #1064: fan out watch notifications to every user watching this event.
      // Best-effort — the promotion already committed above, so any error
      // here can't roll back the user-visible state change. Narrow via `in`
      // rather than an `as` cast so the compiler forces us to handle any
      // new report status added later. Gated on isRealTransition so
      // duplicate promotions don't re-spam the same watchers.
      if (
        isRealTransition &&
        report.status in WATCH_CATEGORY_FROM_REPORT_STATUS
      ) {
        await fanoutWatchNotification(
          {
            db,
            notifications,
            userEvents,
            events,
            venues,
          },
          {
            eventId,
            category: WATCH_CATEGORY_FROM_REPORT_STATUS[report.status],
          },
        )
      }

      resolved = true
    }

    return ctx.json({
      success: true,
      data: { confirmed: true, confirmsCount, resolved },
    })
  },
)

// DELETE /v1/events/:id/reports/:reportId
eventReportsRouter.delete(
  '/:id/reports/:reportId',
  clerkAuth,
  requireAuth,
  async (ctx) => {
    const { id: eventId, reportId } = ctx.req.param()
    const { userId } = getAuthUser(ctx)

    const [report] = await db
      .select({
        id: eventReports.id,
        eventId: eventReports.eventId,
        reporterId: eventReports.reporterId,
        resolvedAt: eventReports.resolvedAt,
      })
      .from(eventReports)
      .where(eq(eventReports.id, reportId))
      .limit(1)

    if (!report || report.eventId !== eventId) {
      return ctx.json({ success: false, error: 'Report not found' }, 404)
    }

    if (report.reporterId !== userId) {
      return ctx.json(
        { success: false, error: "Cannot withdraw someone else's report" },
        403,
      )
    }

    if (report.resolvedAt != null) {
      return ctx.json(
        { success: false, error: 'Cannot withdraw a resolved report' },
        400,
      )
    }

    await db.delete(eventReports).where(eq(eventReports.id, reportId))

    return ctx.body(null, 204)
  },
)
