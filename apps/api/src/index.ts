import { env } from './env.js'
import './instrument.js'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { apiLogger } from './lib/logger.js'
import { shutdownAnalytics } from './lib/analytics.js'

const app = createApp()

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    apiLogger.info({ port: env.PORT }, '🎸 Concert Crawl API running')
  },
)

// Flush the in-memory PostHog batch before the process exits so a redeploy or
// restart does not drop queued funnel events. No-op when analytics is unset.
let shuttingDown = false
const shutdown = (signal: NodeJS.Signals): void => {
  if (shuttingDown) return
  shuttingDown = true
  apiLogger.info({ signal }, 'api: shutting down — flushing analytics')
  void shutdownAnalytics().finally(() => {
    server.close(() => process.exit(0))
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
