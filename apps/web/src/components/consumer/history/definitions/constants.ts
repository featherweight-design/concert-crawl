// Non-copy data for the History surface (#70).

// The Passport keepsake surface (#85). Still typed nullable so the teaser keeps
// its no-link branch: a build that ever takes the page away should degrade to a
// plain stat strip rather than a dead href.
export const PASSPORT_ROUTE: string | null = '/passport'

// Fixed at cozy to match the Watching list. The handoff's `density` designer
// knob is deliberately not a prop on the route (plan PR-5 Task 5).
export const HISTORY_DENSITY = 'cozy' as const
