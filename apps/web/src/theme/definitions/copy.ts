// ThemeSwatch copy. The theme name and role pill both come from THEME_META in
// `../themes` — they are data, not copy, and stay there.
export const THEME_COPY = {
  swatch: {
    activeLabel: 'active',
    // Fixed sample gig card rendered inside every swatch so the theme's tokens
    // can be judged against real-looking content. Not a real event, and not
    // sourced from the API — a display fixture that happens to be text.
    sampleGig: {
      artist: 'Habstrakt',
      price: '$35',
      tier: 'GA',
    },
  },
} as const
