import './instrument.js'
import { createLogger } from '@concert-crawl/logger'
import { runDailyCrawl, runTriggeredCrawls } from './run.js'

const logger = createLogger('crawler')

async function main() {
  await runTriggeredCrawls()
  await runDailyCrawl()
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    logger.error({ err }, 'Fatal error in crawler')
    process.exit(1)
  })
