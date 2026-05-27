import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { and, count, eq, isNull, sql } from 'drizzle-orm'
import {
  db,
  eventReportConfirms,
  eventReports,
  events,
} from '@concert-crawl/db'
import { ER_POLICY } from '@concert-crawl/types'
import {
  clerkAuth,
  requireAuth,
  getAuthUser,
  getAuthOptional,
} from '../middleware/auth.js'
import { moderateNote } from '../lib/moderate-note.js'

const REPORT_STATUSES = ['sold-out', 'cancelled', 'postponed'] as const
const EVIDENCE_METHODS = [
  'bought_myself',
  'saw_listing',
  'venue_site',
  'other',
] as const

function isImminent(eventDate: string | null): boolean {
  if (!eventDate) return false
  const [year, month, day] = eventDate.split('-').map(Number)
  const eventMs = Date.UTC(year!, month! - 1, day!)
  const todayMs = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  )
  const diffDays = (eventMs - todayMs) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= ER_POLICY.imminentThresholdDays
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

    // Check event exists
    const [event] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, eventId))
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

  // Fetch the event date for imminence check
  const [event] = await db
    .select({ id: events.id, date: events.date })
    .from(events)
    .where(eq(events.id, eventId))
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
      confirmsCount: sql<number>`(SELECT COUNT(*)::int FROM event_report_confirms WHERE event_report_confirms.report_id = ${eventReports.id})`,
      userHasConfirmed: userId
        ? sql<number>`(SELECT COUNT(*)::int FROM event_report_confirms WHERE event_report_confirms.report_id = ${eventReports.id} AND event_report_confirms.user_id = ${userId})`
        : sql<number>`0`,
    })
    .from(eventReports)
    .where(
      and(eq(eventReports.eventId, eventId), isNull(eventReports.resolvedAt)),
    )

  const enrichedReports = reportRows.map((report) => ({
    ...report,
    confirmsCount: Number(report.confirmsCount),
    confirmsNeeded,
    isReporter: report.reporterId === userId,
    userHasConfirmed: Number(report.userHasConfirmed) > 0,
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

    // Get event date for imminence check
    const [eventRow] = await db
      .select({ date: events.date })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    const imminent = isImminent(eventRow?.date ?? null)
    const threshold = imminent
      ? ER_POLICY.confirmsRequiredImminent
      : ER_POLICY.confirmsRequired

    let resolved = false
    if (confirmsCount >= threshold) {
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
