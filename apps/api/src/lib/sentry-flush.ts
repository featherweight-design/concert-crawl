// Delivers queued Sentry events from a serverless invocation.
//
// On the Node server Sentry's transport drains in the background of a process
// that stays up. A serverless instance can be frozen as soon as the response
// is sent, so an exception captured by the error handler (or a job) could sit
// in the queue undelivered. On Vercel, every request therefore ends with a
// bounded flush kept alive through `waitUntil`; the response is never delayed
// and a flush failure is logged, never surfaced.

import * as Sentry from '@sentry/hono/node'
import { apiLogger } from './logger.js'
import { isVercelRuntime, keepAliveUntil } from './wait-until.js'

/** Upper bound on a single flush, in milliseconds. */
export const SENTRY_FLUSH_TIMEOUT_MS = 2000

const flushSentry = async (): Promise<void> => {
  try {
    // Resolves false, rather than rejecting, when the timeout expires first.
    const drained = await Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS)
    if (!drained) {
      apiLogger.warn(
        { timeoutMs: SENTRY_FLUSH_TIMEOUT_MS },
        'sentry: serverless flush timed out before the queue drained',
      )
    }
  } catch (err) {
    apiLogger.warn({ err }, 'sentry: serverless flush failed')
  }
}

/**
 * Wrap a Web-standard handler so that, on Vercel, each request registers a
 * bounded Sentry flush after it completes, whether it returned or threw. The
 * handler's response (or error) passes through unchanged. On the Node server
 * the wrapper adds nothing.
 */
export const withSentryFlush =
  (
    handler: (req: Request) => Response | Promise<Response>,
  ): ((req: Request) => Promise<Response>) =>
  async (req) => {
    try {
      return await handler(req)
    } finally {
      if (isVercelRuntime()) keepAliveUntil(flushSentry())
    }
  }
