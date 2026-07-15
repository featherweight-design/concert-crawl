/*
 * Pure helper functions for the UI audit sweep engine.
 *
 * filterManifest — filters the route manifest by tag intersection so the
 * sweep runner can target a subset of routes (e.g. "admin only").
 *
 * outputPathFor — builds the canonical file path for a screenshot (.png) or
 * heuristic JSON (.json) capture artifact. The path is relative to the
 * apps/e2e package root (the CWD when the sweep runs via
 * `pnpm --filter e2e audit:sweep`) so callers do not need to know the
 * workspace layout.
 *
 * parseCliTags — parses the --tags flag from process.argv, accepting both
 * --tags=admin,consumer (equals-separated) and --tags admin,consumer
 * (space-separated). Returns undefined when the flag is absent or empty.
 * Uses Zod to validate that every supplied tag is a known value so invalid
 * CLI input throws loudly at the entry point.
 */

import { z } from 'zod'

import type { AuditManifest } from './manifest-types.js'

// ---------------------------------------------------------------------------
// filterManifest
// ---------------------------------------------------------------------------

/**
 * Returns the subset of routes whose `tags` array intersects the supplied
 * `tags` filter. When `tags` is undefined or empty the full manifest is
 * returned unchanged.
 */
export function filterManifest(
  manifest: AuditManifest,
  tags?: readonly string[],
): AuditManifest {
  if (tags === undefined || tags.length === 0) return manifest
  return manifest.filter((route) =>
    route.tags.some((routeTag) => tags.includes(routeTag)),
  )
}

// ---------------------------------------------------------------------------
// outputPathFor
// ---------------------------------------------------------------------------

// Any segment that becomes part of the on-disk path is validated: `/`,
// `\\`, and `..` are the concrete traversal paths that could escape the
// audit-output directory. The manifest schema already rejects unsafe
// route ids, but this helper is currently the ONLY runtime guard on
// `state` — `state` is set from either the literal string 'default' or
// from user-authored `interaction.id` values, which `validateManifest`
// intentionally does NOT run through Zod (interactions carry function
// properties and bypass schema entirely). So this defense stays load-
// bearing until a follow-up adds explicit interaction.id validation.
// runId comes from Date().toISOString() and viewportLabel from the
// hard-coded VIEWPORTS array — both safe, guarded here anyway.
function assertSafePathSegment(name: string, value: string): void {
  if (value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw new Error(
      `outputPathFor: unsafe ${name} segment '${value}' — must not contain '/', '\\\\', or '..'`,
    )
  }
}

/**
 * Builds the canonical output file path for a single capture artifact.
 *
 * Example:
 *   outputPathFor('2026-07-12T18-04-11', 'admin-feedback', 'expand-first-card', '390x844', 'png')
 *   // → 'audit-output/2026-07-12T18-04-11/admin-feedback__expand-first-card__390x844.png'
 */
export function outputPathFor(
  runId: string,
  routeId: string,
  state: string,
  viewportLabel: string,
  ext: 'png' | 'json',
): string {
  assertSafePathSegment('runId', runId)
  assertSafePathSegment('routeId', routeId)
  assertSafePathSegment('state', state)
  assertSafePathSegment('viewportLabel', viewportLabel)
  return `audit-output/${runId}/${routeId}__${state}__${viewportLabel}.${ext}`
}

// ---------------------------------------------------------------------------
// parseCliTags
// ---------------------------------------------------------------------------

const TagsSchema = z.array(z.enum(['consumer', 'admin']))

/**
 * Parses the `--tags` flag from a process.argv slice.
 *
 * Accepts two forms:
 *   --tags=admin,consumer   (equals-separated)
 *   --tags admin,consumer   (space-separated)
 *
 * Returns undefined when the flag is absent or when `--tags=` is supplied
 * with no value (treated as "no filter").
 *
 * Throws a Zod validation error when an unknown tag value is supplied.
 */
export function parseCliTags(
  argv: readonly string[],
): ('consumer' | 'admin')[] | undefined {
  const equalsMatch = argv.find((arg) => arg.startsWith('--tags='))
  if (equalsMatch !== undefined) {
    const raw = equalsMatch.slice('--tags='.length)
    if (raw === '') return undefined
    return TagsSchema.parse(raw.split(',').filter(Boolean))
  }
  const spaceIdx = argv.indexOf('--tags')
  if (spaceIdx >= 0 && spaceIdx + 1 < argv.length) {
    const raw = argv[spaceIdx + 1]
    if (raw === undefined) return undefined
    // If the next arg looks like another flag, the user forgot the value.
    // Treat as "no tag filter" rather than passing '--other' into Zod
    // (which would throw with a confusing enum-mismatch error).
    if (raw.startsWith('--')) return undefined
    return TagsSchema.parse(raw.split(',').filter(Boolean))
  }
  return undefined
}
