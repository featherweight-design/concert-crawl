import { THEMES, THEME_META, type ThemeName } from '@/theme/themes'

/**
 * ⚠️ THE ONE SANCTIONED HARDCODED HEX IN THIS FEATURE (#1115). Do not replace
 * it with a token and do not let a token-lint sweep delete it.
 *
 * Spotify's iframe interior is always dark. In a light theme, handing them
 * `--surface-1` (a near-white paper) puts a white plate behind a black player,
 * which reads as a rendering fault. The plate we send is a value Spotify
 * paints, not a value we paint — no CSS variable can cross that boundary, so
 * it has to be a literal.
 */
export const EMBED_LIGHT_PLATE = '#191A1F'

/** Narrows an arbitrary `data-theme` string without an `as` cast. */
const isThemeName = (value: string): value is ThemeName =>
  Object.hasOwn(THEMES, value)

/**
 * The only value we hand the embed. Branches on `theme.mode`, never on a theme
 * name — that is what makes three mocked themes cover all nine, and what stops
 * a tenth theme from needing an edit here.
 *
 * Takes ONE argument: only the `mat` direction ships (plan open item #5), so
 * the prototype's `direction` parameter is deliberately absent.
 */
export const embedPlate = (themeKey: string): string => {
  if (!isThemeName(themeKey)) return EMBED_LIGHT_PLATE
  if (THEME_META[themeKey].mode === 'light') return EMBED_LIGHT_PLATE
  return THEMES[themeKey]['surface-1'] ?? EMBED_LIGHT_PLATE
}
