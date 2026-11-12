'use client';

// Whether a floating follow nudge is on screen right now, for the one other
// surface that opens after a watch: the post-watch push sheet. A watch can
// raise both, and without this they open on top of each other. The nudge goes
// first; the push sheet waits for it to close, then opens. Event detail's
// inline card sits in the page, not over it, so it never holds.
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
    // Only the newest wait runs. The push ask is one per session, so the
    // others would only stack more sheets on it; they are dropped.
    const newest = [...waiters].at(-1);
    waiters.clear();
    if (newest === undefined) return;
    try {
      newest();
    } catch (runErr) {
      // It runs inside the nudge's effect cleanup; a throw must not escape
      // into React's commit.
      console.warn('follow nudge: post-watch wait failed', runErr);
    }
  };
};

/**
 * Runs `run` now when no nudge is open, otherwise as soon as the last one
 * closes. Returns a cancel while the run is still waiting, or null when it
 * already ran, so a caller never keeps a cancel for a wait that is over.
 */
export const whenFollowNudgeClosed = (run: () => void): (() => void) | null => {
  if (openCount === 0) {
    run();
    return null;
  }
  waiters.add(run);
  return () => {
    waiters.delete(run);
  };
};

/** Test seam: how many runs are still waiting. */
export const pendingFollowNudgeWaits = (): number => waiters.size;
