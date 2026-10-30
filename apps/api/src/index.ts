import { env } from './env.js'
import './instrument.js'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { apiLogger } from './lib/logger.js'

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

// Close the server so in-flight requests finish before the process exits.
let shuttingDown = false
const shutdown = (signal: NodeJS.Signals): void => {
  if (shuttingDown) return
  shuttingDown = true
  apiLogger.info({ signal }, 'api: shutting down')
  server.close(() => process.exit(0))
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
