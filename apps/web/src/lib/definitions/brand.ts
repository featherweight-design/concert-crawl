// Brand constants for the surfaces that must name a colour outside CSS: the
// web manifest, the browser theme colour, and the server-rendered social card.
// None of those can read a CSS custom property.
//
// This mirrors `bg` in the `electric` theme (`src/theme/themes.ts`), which is
// what the app actually paints. The two are separate on purpose — the theme
// table is per-theme and CSS-facing, while these three consumers need one
// fixed value regardless of the theme a visitor has chosen — but they are
// meant to agree, and `brand.test.ts` fails if they stop agreeing.

/** The dark field the product sits on. */
export const BRAND_PAPER = '#070A1A'

/** Type drawn on `BRAND_PAPER`. */
export const BRAND_INK = '#FFFFFF'
