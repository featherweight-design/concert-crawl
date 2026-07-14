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
 * runs via `pnpm --filter e2e audit`).
 *
 * CLI usage:
 *   PLAYWRIGHT_AUDIT_BASE_URL=https://staging.concertcrawl.app \
 *     node --loader tsx src/audit/sweep.ts [--tags=admin,consumer | --tags admin,consumer]
 */

import fs from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'

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

  fs.mkdirSync(path.dirname(pngPath), { recursive: true })

  await page.screenshot({ path: pngPath, fullPage: true })

  const snapshot = await collectHeuristics(page, vp.width)
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2))
}

// ---------------------------------------------------------------------------
// runSweep
// ---------------------------------------------------------------------------

/**
 * Runs the full audit sweep against the supplied manifest (filtered by tags).
 * Returns a SweepResult with capture counts and any errors encountered.
 *
 * Never targets production — base URL comes from PLAYWRIGHT_AUDIT_BASE_URL;
 * defaults to the staging origin.
 */
export const runSweep = async (args: SweepArgs): Promise<SweepResult> => {
  const baseUrl =
    process.env['PLAYWRIGHT_AUDIT_BASE_URL'] ??
    'https://staging.concertcrawl.app'
  const runId =
    args.runId ?? new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

  const routes: AuditManifest = filterManifest(manifest, args.tags)

  const errors: SweepResult['errors'] = []
  let captures = 0

  const browser = await chromium.launch()
  try {
    for (const route of routes) {
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
              // Counts toward `captures` so the report math stays honest
              // even when interactions drift; the stale capture is
              // annotated in its filename and JSON for downstream triage.
              await captureState(
                runId,
                route.id,
                `${interaction.id}__stale`,
                vp,
                page,
              )
              captures++
              errors.push({
                routeId: route.id,
                kind: 'interaction',
                message: String(err),
              })
            }
          }
        } catch (err) {
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

// CJS module guard — __filename is always defined in NodeNext CJS output.
// Equivalent to `require.main === module` but works with the tsx runner
// (which sets process.argv[1] to the source path, not a compiled file).
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
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
