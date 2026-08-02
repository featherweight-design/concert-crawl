import { THEMES, THEME_NAMES, type ThemeName } from '@/theme/themes'

/**
 * Fallback for any unrecognised `?theme=` value. Electric is the base theme.
 */
export const DEFAULT_SHARE_THEME: ThemeName = 'electric'

/**
 * Closed-set guard over the nine theme names. `apps/web` has no Zod dependency
 * (see `lib/pwa/route-cache.ts` for the same pattern), and for a nine-member
 * literal union an allowlist membership test *is* the complete validator.
 *
 * Guarding before any lookup is what keeps `?theme=__proto__` (or any other
 * prototype key) from ever reaching an index-signature read on `THEMES`.
 */
export const isThemeName = (candidate: string): candidate is ThemeName =>
  THEME_NAMES.some((name) => name === candidate)

export interface ResolvedThemeTokens {
  theme: ThemeName
  tokens: Record<string, string>
}

/**
 * Resolve an untrusted query-string theme to its literal token record.
 *
 * Every token in `THEMES` is a literal hex/oklch string — no CSS variable
 * indirection — which is the reason all nine themes can be rendered
 * server-side by satori, which cannot resolve `var(--token)`.
 */
export const resolveThemeTokens = (
  raw: string | undefined,
): ResolvedThemeTokens => {
  const theme =
    raw !== undefined && isThemeName(raw) ? raw : DEFAULT_SHARE_THEME
  return { theme, tokens: THEMES[theme] }
}

/**
 * The tokens the share cards read. Asserted present in every theme by
 * `__tests__/theme-tokens.test.ts` — a token missing from a single theme is
 * the classic nine-theme regression.
 */
export const SHARE_CARD_TOKENS = [
  'bg',
  'fg',
  'surface-1',
  'border-strong',
  'scrim',
  'signal',
  'accent',
] as const
