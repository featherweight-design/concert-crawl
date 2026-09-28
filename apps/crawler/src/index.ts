import './instrument.js'
import * as Sentry from '@sentry/node'
import { createLogger } from '@concert-crawl/logger'
import { runDailyCrawl, runTriggeredCrawls } from './run.js'

const logger = createLogger('crawler')

async function main(): Promise<{ degraded: boolean }> {
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
    const { degraded } = await runDailyCrawl()
    return { degraded }
  }
  // Triggers-only runs are admin-queued and a handful of venues at most; the
  // run-level health check does not apply to them.
  return { degraded: false }
}

// Flushing is best-effort: losing buffered Sentry events is not worth changing
// the exit code the crawl earned. Swallowing here rather than relying on
// `finally` matters because `finally` rethrows — a rejected flush on the
// success path would otherwise reach the .catch below and report a completed
// crawl as a fatal error, failing the cron monitor for a run that succeeded.
async function flushQuietly(): Promise<void> {
  try {
    await Sentry.flush(2000)
  } catch (flushErr: unknown) {
    logger.warn(
      { flushErr },
      'Sentry flush failed; exiting on the crawl result',
    )
  }
}

main()
  .then(async ({ degraded }) => {
    await flushQuietly()
    // A degraded run exits 1 so Render marks the cron run failed. Before this,
    // 40% of venues failing still exited 0 and read as a healthy run.
    process.exit(degraded ? 1 : 0)
  })
  .catch(async (err) => {
    logger.error({ err }, 'Fatal error in crawler')
    Sentry.captureException(err)
    await flushQuietly()
    process.exit(1)
  })
