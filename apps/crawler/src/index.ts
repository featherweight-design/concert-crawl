import './instrument.js'
import * as Sentry from '@sentry/node'
import { createLogger } from '@concert-crawl/logger'
import { runDailyCrawl, runTriggeredCrawls } from './run.js'

const logger = createLogger('crawler')

async function main() {
  const mode = process.env['CRAWL_MODE'] ?? 'all'

  if (mode !== 'triggers' && mode !== 'daily' && mode !== 'all') {
    logger.error(
      { mode },
      'Unknown CRAWL_MODE; expected triggers | daily | all',
    )
    process.exit(1)
  }

  if (mode === 'triggers' || mode === 'all') {
    await runTriggeredCrawls()
  }
  if (mode === 'daily' || mode === 'all') {
    await runDailyCrawl()
  }
}

main()
  .then(async () => {
    await Sentry.flush(2000)
    process.exit(0)
  })
  .catch(async (err) => {
    logger.error({ err }, 'Fatal error in crawler')
    Sentry.captureException(err)
    try {
      await Sentry.flush(2000)
    } finally {
      process.exit(1)
    }
  })
