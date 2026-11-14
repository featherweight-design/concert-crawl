// The line that sits under the pink wave wherever someone is waiting on shows:
// Browse's first load and pull-to-refresh (B+ `bp-s-pull_m`,
// `bp-s-load_browse_m`). Also the Load more label while it fetches.
export const PINK_WAVE_COPY = {
  loadingShows: 'Loading shows',
  // A pull that came back with an error while online (addendum-3 #178 item 21).
  refreshFailed: "Couldn't refresh. Try again in a moment.",
} as const;
