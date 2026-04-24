import { Hono } from 'hono'
import type { AdminVariables } from './index.js'

export const inviteCodesAdminRouter = new Hono<AdminVariables>()
