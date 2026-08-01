// Marks a watch row that only exists in the optimistic cache. The real
// userEventId replaces it once the server responds, so anything keyed on the id
// (the going nudge's per-device memory) has to skip these rows.
//
// Kept out of use-watch-toggle so consumers of the predicate don't pull React
// Query, Clerk, and the API client into their bundle.
export const OPTIMISTIC_ID_PREFIX = 'optimistic-'

export const isOptimisticWatchRow = (userEventId: string): boolean =>
  userEventId.startsWith(OPTIMISTIC_ID_PREFIX)
