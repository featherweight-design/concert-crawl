import * as Sentry from '@sentry/hono/node'
import { apiLogger } from './logger.js'
import { runBackgroundTask } from './background-tasks.js'

// Wakes the crawler after an admin queues crawl_triggers rows, by dispatching
// the `crawler-triggers.yml` GitHub Actions workflow (Render exit step 2,
// docs/runbooks/crawler-github-actions.md). The rows are the queue; this call
// is only the wake-up, so it never touches the admin request:
//
// - It runs as a background task after the response (kept alive on Vercel by
//   runBackgroundTask), so a slow or failing GitHub costs the admin nothing.
// - Dormant until CRAWLER_DISPATCH_TOKEN is set (a fine-grained token with
//   Actions: write on this one repository). Unset, the API only writes rows.
// - A failure is logged and sent to Sentry, and the rows wait for the next
//   daily run (CRAWL_MODE=all drains pending triggers first).

const logger = apiLogger.child({ component: 'crawler-dispatch' })

const WORKFLOW_FILE = 'crawler-triggers.yml'
const DEFAULT_REPO = 'HartiganHM/concert-crawl'
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
// Off the request path, so this only bounds how long the background task can
// keep a function instance alive; GitHub usually answers in under a second.
const DISPATCH_TIMEOUT_MS = 10_000
const SENTRY_FLUSH_MS = 2000

export type CrawlerDispatchResult =
  'dispatched' | 'skipped_no_token' | 'skipped_environment' | 'failed'

/**
 * Which GitHub environment the crawler should drain: the one this API serves.
 * Vercel sets VERCEL_TARGET_ENV to `production` or to the custom environment's
 * name (`staging`). Anything else (preview, development, or no Vercel at all)
 * dispatches nothing: those APIs write to databases the crawler workflow does
 * not read. Deliberately no fallback to an operator-set variable, so a local
 * server holding a token can never wake the production crawler.
 */
export function crawlerDispatchEnvironment(): 'production' | 'staging' | null {
  const environment = process.env['VERCEL_TARGET_ENV']?.trim().toLowerCase()
  if (environment === 'production' || environment === 'staging') {
    return environment
  }
  return null
}

function dispatchRepo(): string {
  const configured = process.env['CRAWLER_DISPATCH_REPO']?.trim()
  if (configured && REPO_PATTERN.test(configured)) return configured
  if (configured) {
    logger.warn(
      { configured },
      'Ignoring malformed CRAWLER_DISPATCH_REPO; using the default',
    )
  }
  return DEFAULT_REPO
}

async function report(
  message: string,
  extra: Record<string, unknown>,
  level: 'error' | 'warning' = 'error',
): Promise<void> {
  if (level === 'error') logger.error(extra, message)
  else logger.warn(extra, message)
  Sentry.captureException(new Error(message), {
    level,
    tags: { crawler_dispatch: 'failed' },
    extra,
  })
  // The instance can be frozen once the background task settles, which would
  // drop a buffered event.
  try {
    await Sentry.flush(SENTRY_FLUSH_MS)
  } catch (flushErr: unknown) {
    logger.warn({ flushErr }, 'Sentry flush failed after a crawler dispatch')
  }
}

function refusalMessage(status: number, body: string, repo: string): string {
  if (status === 403 && /rate limit/i.test(body)) {
    return 'Crawler dispatch rate-limited by GitHub (403); the token itself is fine'
  }
  if (status === 401 || status === 403) {
    return `Crawler dispatch refused (${status}): CRAWLER_DISPATCH_TOKEN is expired, revoked, or lacks Actions: write on ${repo}`
  }
  // GitHub answers 404, not 403, when a token cannot see the repository.
  if (status === 404) {
    return `Crawler dispatch refused (404): CRAWLER_DISPATCH_TOKEN cannot see ${repo}, or ${WORKFLOW_FILE} is not on its main branch`
  }
  if (status === 422) {
    return `Crawler dispatch rejected (422): ${WORKFLOW_FILE} on main does not accept the inputs sent`
  }
  return `Crawler dispatch failed (${status})`
}

/**
 * Ask GitHub Actions to run the triggers workflow. Never throws; resolves to
 * what happened so callers and tests can tell the cases apart.
 */
export async function dispatchCrawler(): Promise<CrawlerDispatchResult> {
  const token = process.env['CRAWLER_DISPATCH_TOKEN']?.trim()
  if (!token) return 'skipped_no_token'

  const environment = crawlerDispatchEnvironment()
  if (environment === null) {
    logger.info(
      'Not dispatching the crawler: this API is neither production nor staging',
    )
    return 'skipped_environment'
  }

  const repo = dispatchRepo()
  const url = `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'concert-crawl-api',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ ref: 'main', inputs: { environment } }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    await report(
      timedOut
        ? `Crawler dispatch timed out after ${DISPATCH_TIMEOUT_MS} ms; GitHub may still have started the run`
        : 'Crawler dispatch request failed',
      { repo, environment, error: String(err) },
      timedOut ? 'warning' : 'error',
    )
    return 'failed'
  }

  if (response.ok) {
    logger.info({ repo, environment }, 'Dispatched the crawler')
    return 'dispatched'
  }

  const body = (await response.text().catch(() => '')).slice(0, 300)
  await report(refusalMessage(response.status, body, repo), {
    repo,
    environment,
    status: response.status,
    body,
  })
  return 'failed'
}

/**
 * Dispatch after the response has been sent. Route handlers call this once
 * their trigger rows are written; it cannot fail or delay the request.
 */
export function dispatchCrawlerInBackground(): void {
  runBackgroundTask(async () => {
    await dispatchCrawler()
  })
}
