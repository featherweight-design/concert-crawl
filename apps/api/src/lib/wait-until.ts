// Keeps a serverless invocation alive for work that outlives the response.
//
// On Vercel (Fluid compute) a function instance may be frozen as soon as the
// response is sent, so detached work (a transactional email, a vendor lookup,
// a PostHog flush) can be cut off mid-flight. `waitUntil` from
// `@vercel/functions` tells the platform to keep the invocation running until
// the promise settles.
//
// On the long-lived Node server (Render, local dev, tests) the process stays up
// anyway, so this is a no-op and detached promises behave exactly as before.
// `waitUntil` is itself a no-op outside a Vercel request context, but the
// explicit `VERCEL` gate keeps the Node path free of it entirely.

import { waitUntil } from '@vercel/functions'

/** Vercel sets `VERCEL=1` in every build and function runtime. */
export const isVercelRuntime = (): boolean => process.env['VERCEL'] === '1'

/**
 * On Vercel, extend the current invocation until `promise` settles. Elsewhere,
 * do nothing. The promise must handle its own rejection: this only keeps the
 * instance alive, it does not observe the outcome.
 */
export const keepAliveUntil = (promise: Promise<unknown>): void => {
  if (!isVercelRuntime()) return
  waitUntil(promise)
}
