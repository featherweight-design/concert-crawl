import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import * as Sentry from '@sentry/hono/node'
import { apiLogger } from './logger.js'

// Hono raises HTTPException for failures the caller caused — most commonly a
// 400 from zValidator when the request body isn't parseable JSON. Treating
// those like server faults did two harmful things: it filed them in Sentry at
// error level (drowning real faults and tripping the sustained-error-volume
// monitor), and it flattened the response to a 500, telling the client the
// server had broken when the request was at fault. 5xx HTTPExceptions still
// reach Sentry, since those do indicate something on our side failed.
export const errorHandler: ErrorHandler = (err, ctx) => {
  const requestId = ctx.get('requestId')

  if (err instanceof HTTPException && err.status < 500) {
    apiLogger.warn({ err, requestId, status: err.status }, 'Client error')
    return ctx.json({ success: false, error: err.message }, err.status)
  }

  Sentry.captureException(err, { extra: { requestId } })
  apiLogger.error({ err, requestId }, 'Unhandled error')
  return ctx.json({ success: false, error: 'Internal server error' }, 500)
}
