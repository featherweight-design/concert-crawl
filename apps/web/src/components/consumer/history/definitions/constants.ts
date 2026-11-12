// Non-copy data for the History surface (#70).

// The Passport keepsake surface (#85). Still typed nullable so the teaser keeps
// its no-link branch: a build that ever takes the page away should degrade to a
// plain stat strip rather than a dead href.
export const PASSPORT_ROUTE: string | null = '/passport';

// Fixed at cozy to match the Watching list. The handoff's `density` designer
// knob is deliberately not a prop on the route (plan PR-5 Task 5).
export const HISTORY_DENSITY = 'cozy' as const;

export type HistoryDensity = 'compact' | 'cozy' | 'roomy';

// The row geometry per density. It lives here, not in HistoryItem, so the
// server route fallback can size its skeleton from the same numbers: a value
// imported from a 'use client' module arrives on the server as a reference.
export const HISTORY_DENSITY_CONFIG: Record<
  HistoryDensity,
  {
    artSize: number;
    padY: number;
    padL: number;
    padR: number;
    gap: number;
    titleSize: number;
    metaSize: number;
    stampSize: number;
  }
> = {
  compact: {
    artSize: 40,
    padY: 10,
    padL: 14,
    padR: 14,
    gap: 12,
    titleSize: 13,
    metaSize: 11,
    stampSize: 32,
  },
  cozy: {
    artSize: 56,
    padY: 14,
    padL: 14,
    padR: 16,
    gap: 14,
    titleSize: 14.5,
    metaSize: 11.5,
    stampSize: 44,
  },
  roomy: {
    artSize: 64,
    padY: 18,
    padL: 18,
    padR: 20,
    gap: 16,
    titleSize: 16,
    metaSize: 12,
    stampSize: 52,
  },
};

// The B+ brand gradient across My shows: the one header figure that gets it
// (the Watching count, Top venue on Concerts, clipped to text), the current
// tab's hairline, and the filled CTAs (the empty cards and the Artists find
// pill).
export const MY_SHOWS_GRADIENT =
  'linear-gradient(90deg, var(--signal), var(--accent))';
