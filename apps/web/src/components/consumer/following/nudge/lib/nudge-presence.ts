'use client';

// Whether a follow nudge is on screen right now, for the one other surface
// that opens after a watch: the post-watch push sheet. A watch can raise both,
// and without this they open on top of each other. The nudge goes first; the
// push sheet waits for it to close, then opens.
//
// Module state rather than context: the floating nudge lives in the
// (protected) layout and the push sheet inside whichever watch control was
// tapped, so they share no provider below the root.

let openCount = 0;
const waiters = new Set<() => void>();

/** Called by the nudge's hook while it holds a target. Returns the release. */
export const holdFollowNudgeOpen = (): (() => void) => {
  openCount += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openCount -= 1;
    if (openCount > 0) return;
    const ready = [...waiters];
    waiters.clear();
    for (const run of ready) run();
  };
};

/**
 * Runs `run` now when no nudge is open, otherwise as soon as the last one
 * closes. Returns a cancel for a caller that unmounts or changes its mind.
 */
export const whenFollowNudgeClosed = (run: () => void): (() => void) => {
  if (openCount === 0) {
    run();
    return () => {};
  }
  waiters.add(run);
  return () => {
    waiters.delete(run);
  };
};
