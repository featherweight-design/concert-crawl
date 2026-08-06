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

/**
 * Every value this module accepts ends up in a `Location` header — middleware's
 * redirect and `redirect()` both — so a CR or LF in one is response splitting.
 * `/%0Aevil` is same-origin by every other measure here, which is why this is a
 * separate question from where the path points — and why it is asked of the
 * whole value, query and fragment included, rather than of the path alone.
 */
const hasControlCharacters = (value: string): boolean =>
  /[\x00-\x1f\x7f]/.test(value)

/**
 * The same rule for a value that is never going to be decoded here.
 *
 * The path is decoded to a fixed point, so an encoded newline surfaces on
 * whichever pass reveals it. A query is deliberately not decoded — doing so
 * rejects legitimate escapes — which would leave `?x=%0Aevil` accepted purely
 * because nothing here ever looked at it in its decoded form. Downstream
 * consumers do decode, so the encoded form is read directly instead.
 *
 * `%25` is the escape for `%` itself, so `%250A` is one layer of hiding and
 * `%25250A` is two. The wrapper is allowed to repeat up to the same budget the
 * decode loop gets, for the same reason it has one.
 */
const ENCODED_CONTROL_CHARACTER = new RegExp(
  `%(?:25){0,${MAX_DECODE_PASSES}}(?:0[0-9a-f]|1[0-9a-f]|7f)`,
  'i',
)

/**
 * Rejects `//evil.example` and `/\evil.example`, both resolvable as hosts, and
 * any control character. The control-character test runs on each decode pass,
 * so an encoded newline is caught at whichever pass reveals it.
 */
const isPlainInAppPath = (value: string): boolean =>
  /^\/[^/\\]/.test(value) && !hasControlCharacters(value)

/**
 * This module runs in three places — edge middleware, server actions, and
 * client components like ReturnSeamReplay. A rejection is worth recording on
 * the server, where it is a signal; in the browser it is a console the visitor
 * can fill on demand by editing their own URL, so it is suppressed there.
 */
const warnOnServer = (
  message: string,
  detail?: Record<string, number>,
): void => {
  if (typeof window !== 'undefined') return
  console.warn(message, detail)
}

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

  // The control-character rule covers the whole value, since all of it reaches
  // the header. Everything below concerns only where the value points, which
  // is settled entirely before the first `?` or `#` — a query and a fragment
  // cannot name a host, so they are opaque here.
  //
  // Splitting them off is not tidiness. Decoding to a fixed point over a query
  // rejects `/me?q=50%25`: the first pass turns `%25` into a bare `%` and the
  // next throws on it. That is a legitimate return path, and answering it with
  // /events loses the visitor's place.
  if (hasControlCharacters(raw)) return false
  if (ENCODED_CONTROL_CHARACTER.test(raw)) return false
  const suffixAt = raw.search(/[?#]/)
  const pathOnly = suffixAt === -1 ? raw : raw.slice(0, suffixAt)

  let current = pathOnly
  for (let i = 0; i < MAX_DECODE_PASSES; i++) {
    if (!isPlainInAppPath(current)) return false
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      // Malformed escapes: undecodable is not the same as safe. Logged
      // because a rejection here is either a hand-crafted param or a bug in
      // whatever built the link, and both are worth seeing. The path itself
      // is attacker-controlled and stays out of the log line — the pass index
      // is what distinguishes a malformed input from one that survived a
      // decode and then broke.
      warnOnServer('[auth] return path rejected: undecodable', { pass: i })
      return false
    }
    if (next === current) return true
    current = next
  }

  // Still changing after five passes is layered encoding, not a route.
  warnOnServer('[auth] return path rejected: never reached a fixed point')
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
