import './instrument.js'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'
import { apiLogger } from './lib/logger.js'

const app = createApp()

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    apiLogger.info({ port: env.PORT }, '🎸 Concert Crawl API running')
  },
)
