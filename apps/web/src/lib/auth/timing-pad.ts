/** The floor for a sign-in answer: password, code send, every code confirm. */
export const FLOOR_MS = 900;
/** The reset press makes two Clerk calls, so its floor is higher. */
export const RESET_FLOOR_MS = 1500;

/**
 * Holds a fast answer back until `floor` ms have passed since `since`, and
 * never delays a slow one. It hides a gap shorter than the floor (an unknown
 * email refused instantly); Clerk's Strict enumeration protection covers the
 * rest. Start the clock before the call.
 */
export const held = (since: number, floor: number = FLOOR_MS): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, Math.max(0, floor - (Date.now() - since)));
  });
