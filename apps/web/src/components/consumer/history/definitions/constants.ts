// Non-copy data for the History surface (#70).

// The Passport keepsake surface is owned by #85 and has no route yet. The
// teaser therefore renders its stat strip WITHOUT a link until this is set to
// the real path — never a dead href. Flip it to '/passport' (or whatever #85
// lands on) and the teaser becomes a link with no other change.
export const PASSPORT_ROUTE: string | null = null

// Fixed at cozy to match the Watching list. The handoff's `density` designer
// knob is deliberately not a prop on the route (plan PR-5 Task 5).
export const HISTORY_DENSITY = 'cozy' as const
