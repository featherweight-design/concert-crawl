import './instrument.js'
import { createLogger } from '@concert-crawl/logger'
import { runDailyCrawl } from './run.js'

const logger = createLogger('crawler')

runDailyCrawl()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'Fatal error in daily crawl')
    process.exit(1)
  })
