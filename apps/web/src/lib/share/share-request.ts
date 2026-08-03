import {
  isShareRatio,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios'
import { resolveThemeTokens } from '@/lib/share/theme-tokens'
import type { ThemeName } from '@/theme/themes'

/**
 * Input validation for the share PNG route.
 *
 * Kept out of the route file because a route handler running on the edge is
 * the single worst place to discover a parsing bug: the failure mode is a 500
 * inside an `<img>` that renders as a broken icon on somebody else's timeline.
 * Here it is a pure function with a table of cases.
 *
 * `apps/web` has no Zod dependency — see `lib/share/taglines.ts` for the same
 * closed-set-guard pattern used throughout this feature.
 */

/**
 * Matches `z.string().uuid()` — version nibble 1–5 and an RFC4122 variant —
 * so the guard rejects exactly what `GET /v1/events/:id` would 400 on. Same
 * pattern as `app/e/[id]/page.tsx`; a looser shape would let malformed ids
 * cost a Vercel→Render round-trip.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Handles are drawn onto a raster, so there is nothing to escape — the risk is
 * a 200-character string blowing the footer layout apart, or a control
 * character that satori cannot map to a glyph. An allowlist covers both.
 */
const HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,30}$/

/** `null` means an anonymous share, which renders no signature line at all. */
export const resolveShareHandle = (raw: string | undefined): string | null => {
  if (raw === undefined) return null
  const trimmed = raw.startsWith('@') ? raw.slice(1) : raw
  return HANDLE_PATTERN.test(trimmed) ? `@${trimmed}` : null
}

/**
 * Locked in the plan: an hour in the browser, a day at the edge, a week of
 * stale-while-revalidate. The card only changes when the event's price or
 * status does, and the ETag catches that.
 */
export const SHARE_CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'

/**
 * `If-None-Match` is a comma-separated list, and a cache in front of us is
 * entitled to weaken our tag to `W/"…"` on the way back. Strict equality
 * misses both, and a missed 304 means re-rendering a PNG we already have.
 * Safe to split on commas: the tag this route mints is a uuid plus hex plus
 * two closed-set words, none of which can contain one.
 */
export const etagMatches = (header: string | null, etag: string): boolean => {
  if (header === null) return false
  if (header.trim() === '*') return true
  const strip = (tag: string) => tag.trim().replace(/^W\//, '')
  const wanted = strip(etag)
  return header.split(',').some((candidate) => strip(candidate) === wanted)
}

export interface ShareRequestParams {
  eventId: string
  ratio: string
  theme?: string | undefined
  by?: string | undefined
}

export type ParsedShareRequest =
  | {
      ok: true
      eventId: string
      ratio: ShareRatio
      theme: ThemeName
      tokens: Record<string, string>
      handle: string | null
    }
  | { ok: false; reason: string }

/**
 * The ratio is a hard reject and the theme is a soft fallback, deliberately:
 * the ratio determines the artboard, so guessing produces a card at the wrong
 * dimensions for whatever asked for it. A theme only tints one pill.
 */
export const parseShareRequest = (
  params: ShareRequestParams,
): ParsedShareRequest => {
  if (!UUID_PATTERN.test(params.eventId)) {
    return { ok: false, reason: 'invalid event id' }
  }
  if (!isShareRatio(params.ratio)) {
    return { ok: false, reason: 'unknown ratio' }
  }
  const { theme, tokens } = resolveThemeTokens(params.theme)
  return {
    ok: true,
    eventId: params.eventId,
    ratio: params.ratio,
    theme,
    tokens,
    handle: resolveShareHandle(params.by),
  }
}
