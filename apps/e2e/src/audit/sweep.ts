/*
 * Sweep runner for the UI audit engine.
 *
 * runSweep walks the route manifest, spins up a Playwright BrowserContext
 * per (route × viewport), navigates each route, then captures a full-page
 * screenshot (.png) and heuristic JSON (.json) for the default post-load
 * state and for each declared interaction. Auth state is loaded from a
 * pre-existing storage-state file so no login flow runs during the sweep.
 *
 * Viewports: 320×568 / 390×844 / 1440×900 (mobile small, mobile standard,
 * desktop). All contexts use reducedMotion:'reduce' to avoid mid-transition
 * captures.
 *
 * Output artifacts land in:
 *   audit-output/<runId>/<routeId>__<state>__<viewportLabel>.<ext>
 *
 * Paths are relative to the apps/e2e package root (the CWD when the sweep
 * runs via `pnpm --filter e2e audit:sweep`). Do NOT name the pnpm script
 * `audit` — it collides with pnpm's built-in `audit` vulnerability-scan
 * subcommand and never dispatches to the run script.
 *
 * CLI usage:
 *   PLAYWRIGHT_AUDIT_BASE_URL=https://staging.concertcrawl.app \
 *     pnpm --filter e2e audit:sweep -- [--tags=admin,consumer | --tags admin,consumer]
 */

import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'

import { assertNotProdBaseUrl } from './assert-not-prod.js'
import { prepareAuditAuth } from './audit-auth.js'
import { collectHeuristics } from './heuristics.js'
import manifest from './manifest.js'
import type { AuditManifest } from './manifest-types.js'
import { filterManifest, outputPathFor, parseCliTags } from './sweep-helpers.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SweepArgs = {
  tags?: ('consumer' | 'admin')[] | undefined
  runId?: string | undefined
}

export type SweepResult = {
  runId: string
  captures: number
  errors: {
    routeId?: string
    kind: 'load' | 'interaction' | 'auth'
    message: string
  }[]
}

// ---------------------------------------------------------------------------
// Viewports
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { label: '320x568', width: 320, height: 568 },
  { label: '390x844', width: 390, height: 844 },
  { label: '1440x900', width: 1440, height: 900 },
] as const

// A page whose <body> has fewer than this many descendant elements is
// treated as "thin render" — usually a 404, an auth bounce to the waitlist
// landing page, an unseeded staging DB, or a not-yet-loaded route. PR 4's
// vision triage keys off the resulting `insufficientData: true` flag to skip
// visual judgment and log "run the seeder / check the route" instead.
//
// We count BODY elements, not <main> descendants: this app inconsistently
// wraps page content in <main> (the (main) route-group layout renders no
// <main> landmark, and some consumer detail pages are bare fragments), so a
// fully-rendered venue page can report zero <main> descendants. Body-level
// element count is markup-agnostic. Calibrated against seeded staging: a thin
// render (e.g. a Next 404 page, which draws outside the app chrome) measured
// well below this threshold, while every genuine app route — including the
// sparsest real page — measured far above it.
const INSUFFICIENT_DATA_BODY_ELEMENTS_THRESHOLD = 40

// ---------------------------------------------------------------------------
// captureState — internal helper
// ---------------------------------------------------------------------------

/**
 * Writes a full-page screenshot (.png) and heuristic JSON (.json) for the
 * current page state. Creates the output directory if it does not exist.
 */
async function captureState(
  runId: string,
  routeId: string,
  state: string,
  vp: { label: string; width: number; height: number },
  page: Page,
): Promise<void> {
  const pngPath = outputPathFor(runId, routeId, state, vp.label, 'png')
  const jsonPath = outputPathFor(runId, routeId, state, vp.label, 'json')

  // pngPath and jsonPath share the same directory (same run/route bucket),
  // so one mkdirSync covers both.
  const outDir = path.dirname(pngPath)
  fs.mkdirSync(outDir, { recursive: true })

  await page.screenshot({ path: pngPath, fullPage: true })

  const snapshot = await collectHeuristics(page, vp.width)
  // insufficientData is a sweep-side computation, not part of HeuristicSnapshot.
  // The on-disk JSON is a deliberate superset: PR 4 vision-triage reads this
  // flag to skip visual judgment on thin renders ("run the seeder" log instead).
  const insufficientData =
    snapshot.contentDensity.bodyElements <
    INSUFFICIENT_DATA_BODY_ELEMENTS_THRESHOLD
  const jsonPayload = { ...snapshot, insufficientData }
  fs.writeFileSync(jsonPath, JSON.stringify(jsonPayload, null, 2))
}

// ---------------------------------------------------------------------------
// runSweep
// ---------------------------------------------------------------------------

/**
 * Runs the full audit sweep against the supplied manifest (filtered by tags).
 * Returns a SweepResult with capture counts and any errors encountered.
 *
 * Never targets production — base URL comes from PLAYWRIGHT_AUDIT_BASE_URL;
 * defaults to the staging origin. `assertNotProdBaseUrl` throws before any
 * browser launch if the resolved hostname is a known-prod host.
 */
export const runSweep = async (args: SweepArgs): Promise<SweepResult> => {
  const baseUrl =
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  assertNotProdBaseUrl(baseUrl)
  // Format: YYYY-MM-DDTHH-MM-SS (slice(0, 19) trims the fractional-second
  // suffix from the ISO string, which is always 24+ chars).
  const runId =
    args.runId ?? new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const routes: AuditManifest = filterManifest(manifest, args.tags)

  const errors: SweepResult['errors'] = []
  let captures = 0

  // Prepare auth state files for any roles required by the filtered route
  // list. Each role is prepared at most once. If auth preparation fails the
  // role is added to skippedRoles and all routes requiring it are skipped.
  const rolesNeeded = new Set<'user' | 'admin'>()
  for (const route of routes) {
    if (route.auth === 'user') rolesNeeded.add('user')
    if (route.auth === 'admin') rolesNeeded.add('admin')
  }
  const skippedRoles = new Set<'user' | 'admin'>()
  for (const role of rolesNeeded) {
    try {
      await prepareAuditAuth(role)
    } catch (err) {
      // Log to stderr so a live sweep run surfaces the failure without
      // corrupting the stdout JSON that the CLI prints. The error is also
      // captured in the result for post-run inspection.
      console.error(
        `[audit] auth prep failed for role '${role}': ${String(err)}`,
      )
      errors.push({ kind: 'auth', message: String(err) })
      skippedRoles.add(role)
    }
  }

  const browser = await chromium.launch()
  try {
    for (const route of routes) {
      if (
        (route.auth === 'user' || route.auth === 'admin') &&
        skippedRoles.has(route.auth)
      ) {
        continue
      }
      const storageState =
        route.auth === 'none'
          ? undefined
          : route.auth === 'admin'
            ? '.auth/audit-admin.json'
            : '.auth/audit-user.json'

      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          reducedMotion: 'reduce',
          baseURL: baseUrl,
          ...(storageState !== undefined ? { storageState } : {}),
        })
        const page = await context.newPage()
        try {
          await page.goto(route.path, { waitUntil: 'networkidle' })
          await page.evaluate(() => document.fonts.ready)

          await captureState(runId, route.id, 'default', vp, page)
          captures++

          for (const interaction of route.interactions ?? []) {
            try {
              await interaction.run(page)
              await page.waitForLoadState('networkidle')
              await captureState(runId, route.id, interaction.id, vp, page)
              captures++
            } catch (err) {
              // Selector drift or missing state — capture as-is + record.
              // Push the interaction error BEFORE the stale capture so a
              // secondary failure inside captureState can't be swallowed
              // by the outer load handler; the real cause (`err`) is
              // always in the report even if the stale screenshot fails.
              console.error(
                `[audit] interaction '${interaction.id}' failed on route '${route.id}' at ${vp.label}: ${String(err)}`,
              )
              errors.push({
                routeId: route.id,
                kind: 'interaction',
                message: String(err),
              })
              try {
                await captureState(
                  runId,
                  route.id,
                  `${interaction.id}__stale`,
                  vp,
                  page,
                )
                captures++
              } catch (staleErr) {
                // The stale screenshot itself failed (page crashed,
                // context torn down mid-write). Record it as its own
                // interaction error rather than letting it propagate to
                // the outer load handler and get misclassified.
                console.error(
                  `[audit] stale capture failed after interaction '${interaction.id}' on route '${route.id}' at ${vp.label}: ${String(staleErr)}`,
                )
                errors.push({
                  routeId: route.id,
                  kind: 'interaction',
                  message: `stale capture failed after interaction '${interaction.id}': ${String(staleErr)}`,
                })
              }
            }
          }
        } catch (err) {
          console.error(
            `[audit] load failed on route '${route.id}' at ${vp.label}: ${String(err)}`,
          )
          errors.push({ routeId: route.id, kind: 'load', message: String(err) })
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }

  return { runId, captures, errors }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

// CLI entrypoint guard — `apps/e2e/tsconfig.json` compiles to CommonJS,
// so `import.meta.url` is not available here (that's the pattern used by
// scripts/*.ts which target ESM). `__filename` is the equivalent under
// CJS output and works correctly under the tsx runner (tsx sets
// process.argv[1] to the source path, not a compiled artifact). If this
// package ever flips to `"type": "module"` / ESM output, swap this
// guard for the pathToFileURL(...).href === import.meta.url form.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename)
) {
  const tags = parseCliTags(process.argv.slice(2))
  runSweep({ tags })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2))
      process.exit(0)
    })
    .catch((err: unknown) => {
      console.error(err)
      process.exit(1)
    })
}
