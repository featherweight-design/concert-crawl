import { Hono } from 'hono'

type AdminVariables = {
  Variables: {
    auditAction?: string
    auditTargetId?: string
    auditActorId?: string
  }
}

export const inviteCodesAdminRouter = new Hono<AdminVariables>()
