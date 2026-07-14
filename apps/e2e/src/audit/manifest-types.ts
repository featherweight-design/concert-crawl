/*
 * Manifest schema + types for the UI audit sweep engine.
 *
 * AuditManifest is the authoritative list of routes the sweep runner visits.
 * Each route declares its path, auth requirement, and which audience tags it
 * belongs to so the runner can filter runs (e.g. "consumer only").
 *
 * AuditRouteSchema is the Zod schema for the serializable subset of AuditRoute
 * (i.e. everything except `interactions`, which contain functions that cannot
 * be represented in a Zod schema). validateManifest() applies this schema to
 * every entry, then enforces cross-entry uniqueness of route ids.
 *
 * Interactions — { id, description, run(page) } — are passed through after Zod
 * validation; TypeScript's static types guard them at the call site.
 */

import { z } from 'zod'
import type { Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditInteraction = {
  id: string
  description: string
  run: (page: Page) => Promise<void>
}

export type AuditRoute = {
  id: string
  path: string
  tags: ('consumer' | 'admin')[]
  auth: 'none' | 'user' | 'admin'
  interactions?: AuditInteraction[]
}

export type AuditManifest = readonly AuditRoute[]

// ---------------------------------------------------------------------------
// Zod schema — serializable subset (no interactions)
// ---------------------------------------------------------------------------

// route.id is embedded verbatim in output filenames (see
// sweep-helpers.ts::outputPathFor). Restrict to a safe segment character set
// so a manifest typo can never write outside audit-output/<runId>/.
const ROUTE_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

// route.path must be a same-origin path — a single leading `/`, followed
// immediately by a non-`/` character, then any non-whitespace characters
// (additional `/` chars are fine for nested paths like `/admin/feedback`).
// The critical constraint is the SECOND character: rejecting `//` closes
// the protocol-relative URL bypass (`//evil.com/x`), which Playwright's
// baseURL-aware page.goto would otherwise resolve to a foreign origin.
// Absolute URLs (`https://…`) are rejected by the leading `/` requirement.
const ROUTE_PATH_PATTERN = /^\/(?!\/)[^\s]*$/

export const AuditRouteSchema: z.ZodType<Omit<AuditRoute, 'interactions'>> =
  z.object({
    id: z
      .string()
      .min(1, 'route id must be a non-empty string')
      .regex(
        ROUTE_ID_PATTERN,
        'route id must be lowercase letters, digits, and hyphens (path-safe)',
      ),
    path: z
      .string()
      .min(1, 'route path must be a non-empty string')
      .regex(
        ROUTE_PATH_PATTERN,
        'route path must be a same-origin path starting with "/" (no absolute URLs)',
      ),
    tags: z
      .array(z.enum(['consumer', 'admin']))
      .min(1, 'route must have at least one tag'),
    auth: z.enum(['none', 'user', 'admin']),
  })

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Type guard for optional interactions on a raw manifest entry. Uses `in`
 * narrowing (TS 4.9+ refines to `{ interactions: unknown }`) plus
 * Array.isArray to avoid `as` value casts on production code. The element
 * type is asserted at the type-predicate level — trust the caller to pass
 * AuditInteraction-shaped entries.
 */
function hasInteractions(
  entry: unknown,
): entry is { interactions: AuditInteraction[] } {
  if (entry === null || typeof entry !== 'object') return false
  if (!('interactions' in entry)) return false
  return Array.isArray(entry.interactions)
}

/**
 * Validates a manifest of unknown shape, returning a typed AuditManifest.
 *
 * Throws a plain Error (prefixed "[manifest]") on:
 *   - shape violations (caught by Zod)
 *   - empty tags array
 *   - duplicate route ids
 *
 * Interactions, when present, are passed through unchecked — they are runtime
 * functions that cannot be represented in a Zod schema.
 */
export function validateManifest(manifest: unknown): AuditManifest {
  if (!Array.isArray(manifest)) {
    throw new Error('[manifest] manifest must be an array')
  }

  const routes: AuditRoute[] = []
  const seenIds = new Set<string>()

  for (let idx = 0; idx < manifest.length; idx++) {
    const entry = manifest[idx]
    const result = AuditRouteSchema.safeParse(entry)

    if (!result.success) {
      const firstIssue = result.error.issues[0]
      throw new Error(
        `[manifest] route at index ${idx}: ${firstIssue?.message ?? result.error.message}`,
      )
    }

    const parsed = result.data

    if (seenIds.has(parsed.id)) {
      throw new Error(`[manifest] duplicate route id: '${parsed.id}'`)
    }
    seenIds.add(parsed.id)

    // Preserve interactions from the original entry if present. They are
    // runtime functions and cannot pass through Zod — the type guard
    // structurally narrows via `'interactions' in entry` (TS 4.9+ refines
    // `entry.interactions` to unknown) then `Array.isArray` narrows it to
    // `unknown[]`; the type-predicate assertion on the return type is the
    // only unchecked step, which is exactly what type guards are for.
    //
    // If `interactions` is present but NOT an array (a common typo — e.g.
    // supplying a single object where an array was intended), reject
    // loudly. Silently dropping would let intended interactions never run
    // and make the misconfiguration hard to catch.
    if (
      entry !== null &&
      typeof entry === 'object' &&
      'interactions' in entry &&
      entry.interactions !== undefined &&
      !Array.isArray(entry.interactions)
    ) {
      throw new Error(
        `[manifest] route '${parsed.id}': interactions must be an array (got ${typeof entry.interactions})`,
      )
    }
    const interactions = hasInteractions(entry) ? entry.interactions : undefined

    routes.push({ ...parsed, ...(interactions ? { interactions } : {}) })
  }

  return routes
}
