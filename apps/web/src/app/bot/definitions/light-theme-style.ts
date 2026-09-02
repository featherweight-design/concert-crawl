import type { CSSProperties } from 'react'

import { THEMES } from '@/theme/themes'

/**
 * `applyTheme` writes the active theme's tokens as inline styles on `<html>`,
 * so a `data-theme` attribute on a wrapper loses to whatever the visitor picked.
 * Custom properties inherit, though, so re-declaring Light's tokens as inline
 * styles on the wrapper wins for everything inside it, with no flash and no
 * client-side theme work on a page that has neither.
 *
 * `THEMES` keys are unprefixed, hence the map.
 *
 * The record is built under its own type rather than by augmenting React's
 * `CSSProperties`: an augmentation from a route-local file would widen the
 * style prop for the whole app's compile, and would collide outright if
 * `@types/react` ever declares its own custom-property index signature. A
 * record of `--*` keys is assignable to `CSSProperties` as it stands, so this
 * needs no cast either.
 */
function buildLightThemeStyle(): CSSProperties {
  const tokens: Record<`--${string}`, string> = {}
  for (const [token, value] of Object.entries(THEMES.light)) {
    tokens[`--${token}`] = value
  }
  return tokens
}

export const LIGHT_THEME_STYLE = buildLightThemeStyle()
