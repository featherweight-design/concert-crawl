/**
 * The pending action a signed-out visitor started before they had an account.
 *
 * It travels as a query param through Clerk's own screens, which means it
 * arrives from a URL the visitor can edit — a system boundary. Every value is
 * validated on the way in and an unrecognised one decodes to `null`, never to a
 * default. `apps/web` carries no zod dependency, so this is a hand-written
 * guard rather than a schema.
 */

const INTENT_ACTIONS = ['watch'] as const

export type IntentAction = (typeof INTENT_ACTIONS)[number]

export interface Intent {
  action: IntentAction
  eventId: string
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isIntentAction = (value: string): value is IntentAction =>
  INTENT_ACTIONS.some((action) => action === value)

export const encodeIntent = (intent: Intent): string =>
  `${intent.action}:${intent.eventId}`

export const decodeIntent = (raw: string | null | undefined): Intent | null => {
  if (!raw) return null
  // Exactly one separator: `watch:a:b` is malformed, not a nested payload.
  const parts = raw.split(':')
  if (parts.length !== 2) return null
  const [action, eventId] = parts
  if (!action || !eventId) return null
  if (!isIntentAction(action)) return null
  if (!UUID_PATTERN.test(eventId)) return null
  return { action, eventId }
}

export const DEFAULT_RETURN_PATH = '/events'

/**
 * `URL` needs an absolute base to parse a path, but every value built here is
 * re-serialised as a path — the origin is never read.
 */
const PLACEHOLDER_ORIGIN = 'https://placeholder.invalid'

/**
 * Drops the seam's own params and keeps everything else. The destination may
 * carry its own query (`?tab=prices`) and its own fragment (`#lineup`), and
 * `buildReturnUrl` preserves both, so replaying must not flatten the URL down to
 * a bare pathname. `usePathname` excludes the fragment, so callers pass
 * `window.location.hash` explicitly.
 */
export const stripIntentParams = (
  pathname: string,
  search: URLSearchParams,
  hash = '',
): string => {
  const kept = new URLSearchParams(search)
  kept.delete('intent')
  kept.delete('label')
  const query = kept.toString()
  return `${pathname}${query ? `?${query}` : ''}${hash}`
}

/** A path still unstable after this many passes is an attack, not a route. */
const MAX_DECODE_PASSES = 5

/** Rejects `//evil.example` and `/\evil.example`, both resolvable as hosts. */
const isPlainInAppPath = (value: string): boolean => /^\/[^/\\]/.test(value)

/**
 * A `return` param is a redirect target, so anything that could leave the origin
 * is an open redirect. Only a plain absolute in-app path is accepted.
 *
 * Decoding runs to a fixed point rather than once, because percent-encoding
 * hides a hostile shape from a single check — `/%5Cevil.example` decodes to
 * `/\evil.example`, and `/%255Cevil.example` survives one pass to become
 * `/%5Cevil.example`. Every intermediate form is validated, not just the last:
 * deciding one is safe would require knowing how many times each downstream
 * consumer decodes, and validating them all requires knowing nothing.
 *
 * This is the single validator for the whole funnel — middleware, the beta code
 * action, and /auth/complete all route through it. A second copy of this logic
 * is how one branch ended up weaker than its sibling.
 */
export const isSafeReturnPath = (raw: string | null | undefined): boolean => {
  if (!raw) return false

  let current = raw
  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    if (!isPlainInAppPath(current)) return false
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      // Malformed escapes: undecodable is not the same as safe.
      return false
    }
    if (next === current) return true
    current = next
  }

  return false
}

export const sanitizeReturnPath = (raw: string | null | undefined): string =>
  isSafeReturnPath(raw) && raw ? raw : DEFAULT_RETURN_PATH

const MAX_LABEL_LENGTH = 60

/**
 * The artist name shown in "Skip: back to {label}" and "Now watching {label}."
 *
 * React escapes it on render, so the risk here is not injection but chrome: a
 * 400-character label would break both strips. Control characters are stripped
 * because a newline inside a one-line strip is a layout bug, not content.
 */
export const sanitizeDestinationLabel = (
  raw: string | null | undefined,
): string | null => {
  if (!raw) return null
  const cleaned = raw.replace(/[\x00-\x1f\x7f]/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.slice(0, MAX_LABEL_LENGTH)
}

/**
 * Where the tour sends the visitor when it ends. The intent rides along so the
 * destination can replay it — the tour itself never performs the action.
 */
export const buildReturnUrl = (args: {
  returnPath: string
  intent: string | null
  label: string | null
}): string => {
  const path = sanitizeReturnPath(args.returnPath)
  if (!args.intent) return path
  // The path may already carry a query string — `/events/e1?tab=prices` is a
  // legitimate destination — so the intent is merged into it rather than
  // appended behind a second `?`, which would invalidate both.
  const url = new URL(path, PLACEHOLDER_ORIGIN)
  url.searchParams.set('intent', args.intent)
  if (args.label) url.searchParams.set('label', args.label)
  return `${url.pathname}${url.search}${url.hash}`
}
