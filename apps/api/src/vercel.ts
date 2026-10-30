// Vercel Functions entry for the API. Not used on Render: there, `index.ts`
// runs the long-lived Node server. Hosting config (vercel.json, rewrites to
// this file) lands with the hosting change, not here.
//
// Load order matches index.ts: env.ts validates the environment (and exits on
// a bad one) before anything else reads it, then instrument.ts initialises
// Sentry before the app and its routes are imported.
//
// There is no SIGTERM flush here. A serverless instance is frozen rather than
// signalled, so Sentry is flushed per request (lib/sentry-flush.ts), and
// detached work is kept alive through `waitUntil` (lib/wait-until.ts).

import './env.js'
import './instrument.js'
import { handle } from 'hono/vercel'
import { createApp } from './app.js'
import { withSentryFlush } from './lib/sentry-flush.js'

// Every request ends with a bounded Sentry flush under `waitUntil`, so an
// exception the error handler captured is delivered before the instance is
// frozen.
const handler = withSentryFlush(handle(createApp()))

// Vercel's Node runtime treats a default-exported function as a legacy
// `(req, res)` handler, so the Web-standard handler is exported per method.
export const GET = handler
export const HEAD = handler
export const OPTIONS = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
