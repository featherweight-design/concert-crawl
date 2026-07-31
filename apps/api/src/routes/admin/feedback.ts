import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { httpUrl } from '../../lib/url-schema.js'
import { eq, desc, sql } from 'drizzle-orm'
import { db, feedback } from '@concert-crawl/db'
import { getAuthUser } from '../../middleware/auth.js'
import type { AdminVariables } from './index.js'

const feedbackIdSchema = z.object({ id: z.string().uuid() })

const listQuerySchema = z.object({
  status: z
    .enum(['unread', 'read', 'flagged', 'issue_opened', 'resolved', 'archived'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

const patchBodySchema = z.object({
  status: z
    .enum(['unread', 'read', 'flagged', 'issue_opened', 'resolved', 'archived'])
    .optional(),
  adminNotes: z.string().nullable().optional(),
  issueUrl: z.union([httpUrl(), z.null()]).optional(),
})

export const feedbackAdminRouter = new Hono<AdminVariables>()

// GET /v1/admin/feedback?status=unread&limit=100
feedbackAdminRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (ctx) => {
    const { status, limit } = ctx.req.valid('query')

    const rows = await db
      .select()
      .from(feedback)
      .where(status ? eq(feedback.status, status) : undefined)
      .orderBy(desc(feedback.createdAt))
      .limit(limit)

    return ctx.json({ success: true, data: rows })
  },
)

// GET /v1/admin/feedback/counts — unread count for sidebar badge
feedbackAdminRouter.get('/counts', async (ctx) => {
  const [result] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, 'unread'))
  return ctx.json({ success: true, data: { unread: result?.unread ?? 0 } })
})

// PATCH /v1/admin/feedback/:id — update status, adminNotes, issueUrl
feedbackAdminRouter.patch(
  '/:id',
  zValidator('param', feedbackIdSchema),
  zValidator('json', patchBodySchema),
  async (ctx) => {
    const { id } = ctx.req.valid('param')
    const body = ctx.req.valid('json')

    const updates: Partial<typeof body> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes
    if (body.issueUrl !== undefined) updates.issueUrl = body.issueUrl

    if (Object.keys(updates).length === 0) {
      return ctx.json({ success: false, error: 'No fields to update' }, 400)
    }

    const [updated] = await db
      .update(feedback)
      .set(updates)
      .where(eq(feedback.id, id))
      .returning()

    if (!updated) {
      return ctx.json({ success: false, error: 'Feedback not found' }, 404)
    }

    const actor = getAuthUser(ctx)
    ctx.set('auditAction', 'feedback.update')
    ctx.set('auditTargetId', id)
    ctx.set('auditActorId', actor.userId)

    return ctx.json({ success: true, data: updated })
  },
)
