import * as Sentry from '@sentry/hono/node'
import { z } from 'zod'
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
//
// The same token also starts the daily crawl (`crawler-daily.yml`) from the
// Vercel Cron route, because GitHub's own schedule drops runs on this repo;
// see startDailyCrawl below.

const logger = apiLogger.child({ component: 'crawler-dispatch' })

const TRIGGERS_WORKFLOW = 'crawler-triggers.yml'
const DAILY_WORKFLOW = 'crawler-daily.yml'
const GITHUB_API = 'https://api.github.com'
const DEFAULT_REPO = 'HartiganHM/concert-crawl'
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
// Off the request path for a trigger dispatch, so this only bounds how long
// the background task can keep a function instance alive; GitHub usually
// answers in under a second. The daily cron route awaits both of its calls.
const DISPATCH_TIMEOUT_MS = 10_000
const SENTRY_FLUSH_MS = 2000

export type CrawlerDispatchResult =
  'dispatched' | 'skipped_no_token' | 'skipped_environment' | 'failed'

/**
 * The run-name crawler-daily.yml gives each run. The runs API returns it as
 * `display_title`, and it is the only field there that says which environment
 * a run crawled. Keep this and the workflow's `run-name` in step.
 */
export const dailyRunTitle = (environment: 'production' | 'staging'): string =>
  `Crawler daily: ${environment}`

const githubHeaders = (token: string): Record<string, string> => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'User-Agent': 'concert-crawl-api',
  'X-GitHub-Api-Version': '2022-11-28',
})

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

function refusalMessage(
  status: number,
  body: string,
  repo: string,
  workflow: string,
): string {
  if (status === 403 && /rate limit/i.test(body)) {
    return 'Crawler dispatch rate-limited by GitHub (403); the token itself is fine'
  }
  if (status === 401 || status === 403) {
    return `Crawler dispatch refused (${status}): CRAWLER_DISPATCH_TOKEN is expired, revoked, or lacks Actions: write on ${repo}`
  }
  // GitHub answers 404, not 403, when a token cannot see the repository.
  if (status === 404) {
    return `Crawler dispatch refused (404): CRAWLER_DISPATCH_TOKEN cannot see ${repo}, or ${workflow} is not on its main branch`
  }
  if (status === 422) {
    return `Crawler dispatch rejected (422): ${workflow} on main does not accept the inputs sent`
  }
  return `Crawler dispatch failed (${status})`
}

/**
 * POST a workflow_dispatch for `workflow` on main. Never throws; a refusal or
 * a network failure is logged, reported to Sentry, and resolves to 'failed'.
 */
async function dispatchWorkflow(
  token: string,
  repo: string,
  workflow: string,
  inputs: Record<string, string>,
): Promise<'dispatched' | 'failed'> {
  const environment = inputs['environment']
  const url = `${GITHUB_API}/repos/${repo}/actions/workflows/${workflow}/dispatches`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })
  } catch (err: unknown) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError'
    await report(
      timedOut
        ? `Crawler dispatch timed out after ${DISPATCH_TIMEOUT_MS} ms; GitHub may still have started the run`
        : 'Crawler dispatch request failed',
      { repo, workflow, environment, error: String(err) },
      timedOut ? 'warning' : 'error',
    )
    return 'failed'
  }

  if (response.ok) {
    logger.info({ repo, workflow, environment }, 'Dispatched the crawler')
    return 'dispatched'
  }

  const body = (await response.text().catch(() => '')).slice(0, 300)
  await report(refusalMessage(response.status, body, repo, workflow), {
    repo,
    workflow,
    environment,
    status: response.status,
    body,
  })
  return 'failed'
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

  return dispatchWorkflow(token, dispatchRepo(), TRIGGERS_WORKFLOW, {
    environment,
  })
}

// Only the fields the check reads; GitHub sends many more.
const workflowRunsSchema = z.object({
  workflow_runs: z.array(
    z.object({
      id: z.number().int(),
      display_title: z.string(),
      head_branch: z.string().nullable(),
      created_at: z.string(),
      status: z.string().nullable(),
      conclusion: z.string().nullable(),
    }),
  ),
})

const runJobsSchema = z.object({
  jobs: z.array(
    z.object({
      name: z.string(),
      steps: z
        .array(
          z.object({ name: z.string(), conclusion: z.string().nullable() }),
        )
        .optional(),
    }),
  ),
})

/**
 * The crawler-run.yml step that crawls. A finished run counts as the day's
 * crawl only if this step ran; keep the name in step with that workflow and
 * with the guard job in crawler-daily.yml.
 */
export const CRAWL_STEP_NAME = 'Run crawler'

/**
 * The title of every crawler-daily run from before run-name named the
 * environment. Such a run says which environment it crawled only through
 * its crawl job's name, `daily / Crawl (all, <environment>)`. Only runs
 * created up to the day this shipped (2026-11-01) carry it; drop the
 * fallback, here and in the guard job, after that.
 */
const LEGACY_DAILY_TITLE = 'Crawler daily'
const PRODUCTION_JOB_SUFFIX = ', production)'

type RunJobs = z.infer<typeof runJobsSchema>['jobs']

export interface DailyRunSummary {
  id: number
  createdAt: string
  status: string | null
  conclusion: string | null
}

export type DailyCrawlResult =
  | { outcome: 'dispatched' }
  | { outcome: 'skipped_already_ran'; run: DailyRunSummary }
  | { outcome: 'skipped_environment' }
  | { outcome: 'skipped_no_token' }
  | { outcome: 'check_failed' }
  | { outcome: 'dispatch_failed' }

/** 00:00 UTC on `now`'s UTC date, as GitHub's `created` filter wants it. */
export const startOfUtcDay = (now: Date): string =>
  `${now.toISOString().slice(0, 10)}T00:00:00Z`

async function getGitHubJson(token: string, url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: githubHeaders(token),
    signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    const body = (await response.text().catch(() => '')).slice(0, 300)
    throw new Error(`GitHub answered ${response.status} for ${url}: ${body}`)
  }
  return response.json()
}

async function readRunJobs(
  token: string,
  repo: string,
  runId: number,
): Promise<RunJobs> {
  const parsed = runJobsSchema.safeParse(
    await getGitHubJson(
      token,
      `${GITHUB_API}/repos/${repo}/actions/runs/${runId}/jobs?per_page=100`,
    ),
  )
  if (!parsed.success) {
    throw new Error(
      `Unexpected jobs response for run ${runId}: ${parsed.error.message}`,
    )
  }
  return parsed.data.jobs
}

/** Whether a run got as far as crawling, from its jobs' steps. */
const reachedCrawl = (jobs: RunJobs): boolean =>
  jobs.some((job) =>
    (job.steps ?? []).some(
      (step) =>
        step.name === CRAWL_STEP_NAME &&
        step.conclusion !== null &&
        step.conclusion !== 'skipped',
    ),
  )

/**
 * The earliest production crawler-daily run on main created since 00:00 UTC
 * today that has crawled or may still crawl, or null when there is none.
 *
 * - A run still queued or in progress counts: it may be crawling now.
 * - A finished run counts only if its crawl step ran, whatever the run's
 *   conclusion: a degraded crawl fails the run after crawling every venue, so
 *   a second run would be a double crawl. A run that stopped earlier (its
 *   guard skipped or failed, its configuration check failed, it was cancelled
 *   in the queue) crawled nothing and does not hold the day.
 * - Only main: a dispatch from another branch never crawls (crawler-run.yml
 *   runs from main alone).
 * - A run from before run-name named the environment (LEGACY_DAILY_TITLE)
 *   counts only if its crawl job names production.
 *
 * Throws on anything it cannot read, so the caller fails closed: a check that
 * cannot see is not a check that found nothing.
 */
async function findTodaysDailyRun(
  token: string,
  repo: string,
  now: Date,
): Promise<DailyRunSummary | null> {
  const since = startOfUtcDay(now)
  const params = new URLSearchParams({
    branch: 'main',
    created: `>=${since}`,
    per_page: '100',
  })
  const parsed = workflowRunsSchema.safeParse(
    await getGitHubJson(
      token,
      `${GITHUB_API}/repos/${repo}/actions/workflows/${DAILY_WORKFLOW}/runs?${params.toString()}`,
    ),
  )
  if (!parsed.success) {
    throw new Error(
      `Unexpected ${DAILY_WORKFLOW} runs response: ${parsed.error.message}`,
    )
  }
  const title = dailyRunTitle('production')
  // Repeats the server's `branch` and `created` filters: GitHub ignores a
  // query parameter it cannot parse rather than refusing the request.
  const sinceMs = Date.parse(since)
  const todays = parsed.data.workflow_runs
    .filter(
      (run) =>
        (run.display_title === title ||
          run.display_title === LEGACY_DAILY_TITLE) &&
        run.head_branch === 'main' &&
        Date.parse(run.created_at) >= sinceMs,
    )
    .sort((left, right) => left.id - right.id)

  for (const run of todays) {
    const legacy = run.display_title === LEGACY_DAILY_TITLE
    // A finished run, or a legacy one of either kind, needs its jobs read.
    const jobs =
      legacy || run.status === 'completed'
        ? await readRunJobs(token, repo, run.id)
        : []
    if (
      legacy &&
      !jobs.some((job) => job.name.endsWith(PRODUCTION_JOB_SUFFIX))
    ) {
      continue
    }
    if (run.status !== 'completed' || reachedCrawl(jobs)) {
      return {
        id: run.id,
        createdAt: run.created_at,
        status: run.status,
        conclusion: run.conclusion,
      }
    }
  }
  return null
}

/**
 * Start today's production daily crawl, unless one already started. Called by
 * the Vercel Cron route; never throws.
 *
 * - Production only. Vercel runs crons on production deployments alone, and a
 *   staging daily crawl stays a manual dispatch.
 * - Skips when crawler-daily already has a production run today that crawled
 *   or may still crawl (findTodaysDailyRun has the rule).
 * - Fails closed when the check cannot be made. GitHub's later schedule in
 *   crawler-daily.yml is the backup, and it makes the same check, so a
 *   check that failed here leaves that run to crawl.
 * - The workflow's guard job drops the dispatched run unless the repository
 *   variable CRAWLER_GHA_DAILY_ENABLED is 'true', so that variable pauses the
 *   daily crawl from either trigger.
 * - The dispatch sends `skip_if_ran_today`, so the workflow checks again from
 *   inside the run. That closes the gap this check cannot: Vercel can deliver
 *   one cron twice, and a run GitHub has accepted takes a few seconds to be
 *   listed.
 */
export async function startDailyCrawl(
  now: Date = new Date(),
): Promise<DailyCrawlResult> {
  if (crawlerDispatchEnvironment() !== 'production') {
    logger.info('Not starting the daily crawl: this API is not production')
    return { outcome: 'skipped_environment' }
  }

  const token = process.env['CRAWLER_DISPATCH_TOKEN']?.trim()
  if (!token) {
    await report(
      'Daily crawl not started: CRAWLER_DISPATCH_TOKEN is unset on the production API',
      {},
      'warning',
    )
    return { outcome: 'skipped_no_token' }
  }

  const repo = dispatchRepo()
  let existing: DailyRunSummary | null
  try {
    existing = await findTodaysDailyRun(token, repo, now)
  } catch (err: unknown) {
    await report(
      'Daily crawl not started: could not check for a run already today',
      { repo, error: String(err) },
    )
    return { outcome: 'check_failed' }
  }

  if (existing !== null) {
    logger.info(
      { repo, run: existing },
      'Daily crawl already has a production run today; not dispatching',
    )
    return { outcome: 'skipped_already_ran', run: existing }
  }

  const dispatched = await dispatchWorkflow(token, repo, DAILY_WORKFLOW, {
    environment: 'production',
    skip_if_ran_today: 'true',
  })
  return dispatched === 'dispatched'
    ? { outcome: 'dispatched' }
    : { outcome: 'dispatch_failed' }
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
