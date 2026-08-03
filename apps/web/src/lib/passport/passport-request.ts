import {
  PP_MODES,
  PASSPORT_PRINT_MODE,
  PASSPORT_PRINT_SCALE,
} from '@/components/consumer/passport/definitions/modes'
import { isThemeName, resolveThemeTokens } from '@/lib/share/theme-tokens'
import { DENVER_TIME_ZONE, localDateString } from '@/lib/time'
import type { ThemeName } from '@/theme/themes'

/**
 * Input validation for the passport PNG route, kept out of the route file for
 * the same reason `lib/share/share-request.ts` is: a parsing bug discovered
 * inside a route handler surfaces as a 500 behind an `<img>`, where here it is
 * a pure function with a table of cases.
 */

/**
 * The passport is a stamp wall — a 4×4 grid on a square artboard. There is no
 * story-ratio or landscape variant yet, so anything else is a hard reject
 * rather than a silent fall back to square: guessing produces a card at
 * dimensions the caller did not ask for.
 */
export const PASSPORT_RATIOS = ['square'] as const
export type PassportRatio = (typeof PASSPORT_RATIOS)[number]

export const isPassportRatio = (
  candidate: string,
): candidate is PassportRatio =>
  PASSPORT_RATIOS.some((ratio) => ratio === candidate)

/**
 * The output size of the PNG — the design size times the device-pixel
 * multiplier. Derived rather than written out, so bumping the multiplier can
 * never leave the artboard and the card disagreeing about how big the card is.
 */
export const PASSPORT_DIMENSIONS: Record<
  PassportRatio,
  { width: number; height: number }
> = {
  square: {
    width: PP_MODES[PASSPORT_PRINT_MODE].width * PASSPORT_PRINT_SCALE,
    height: PP_MODES[PASSPORT_PRINT_MODE].height * PASSPORT_PRINT_SCALE,
  },
}

/**
 * A personal card must never land in a shared cache. `private` keeps it out of
 * every CDN and proxy between us and the reader; the five minutes are for the
 * browser that just rendered a preview and is about to download the same PNG.
 */
export const PASSPORT_CACHE_CONTROL = 'private, max-age=300'

/**
 * `private` keeps the card out of shared caches but says nothing about the
 * browser's own, whose key is the URL alone — so on a shared device the next
 * person to sign in would be served the previous account's passport until the
 * five minutes were up. Varying on the session cookie keeps the cache without
 * that reuse.
 */
export const PASSPORT_VARY = 'Cookie'

/**
 * The year printed on the card header, in Mountain Time.
 *
 * The route renders on a server whose clock is UTC, so `new Date().getFullYear()`
 * rolls over at 5pm MT on New Year's Eve — for those seven hours every passport
 * would be stamped with a year Denver has not reached yet. Derived from the same
 * `localDateString` helper the rest of the app uses rather than a second idiom.
 */
export const passportYear = (): number =>
  Number(localDateString(DENVER_TIME_ZONE).slice(0, 4))

/**
 * The theme is a soft fallback where the ratio is a hard reject — the ratio
 * decides the artboard, the theme only tints it. The stored profile theme is
 * the fallback so a signed-in user's card matches the app they are looking at,
 * with `?theme=` overriding it for the preview picker.
 */
export const resolvePassportTheme = (params: {
  theme?: string | undefined
  profileTheme?: string | undefined
}): { theme: ThemeName; tokens: Record<string, string> } => {
  // An unrecognised `?theme=` falls back to the stored profile theme, not
  // straight to the default — passing the two joined would silently demote a
  // Jade user to Electric on a typo'd override.
  const override =
    params.theme !== undefined && isThemeName(params.theme)
      ? params.theme
      : undefined
  return resolveThemeTokens(override ?? params.profileTheme)
}
