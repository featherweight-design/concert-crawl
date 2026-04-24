import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { env } from './env.js'

const app = createApp()

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  () => {
    console.warn(`🎸 Concert Crawl API running on http://localhost:${env.PORT}`)
  },
)
