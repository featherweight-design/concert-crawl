// A leaf module rather than a member of the barrel: `artist.ts` needs this type,
// and importing it from `index.ts` — which re-exports `artist.ts` — makes the
// barrel a dependency of one of its own leaves.
export type EventStatus = 'upcoming' | 'cancelled' | 'postponed'
