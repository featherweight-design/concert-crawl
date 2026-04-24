import { Hono } from 'hono'

const version = '0.1.0'

export const healthRouter = new Hono()

healthRouter.get('/', (ctx) => {
  return ctx.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version,
  })
})
