// Customer-facing strings for the event-detail bill follow block (native
// following, PR 7). Artist names and counts are DATA — only the words around
// them live here.
//
// ⚠️ Nothing in this file may promise that following an artist puts their
// shows in your Watching. Watching is the show you are on; following is the
// act. Auto-watch is a separate preference nobody standing here has set.
//
// The gate sentence is NOT redefined here — it is `FOLLOWING_COPY.followGate`,
// reused verbatim. A second copy of the same sentence is somewhere for drift
// to hide, and the gate is the one line that must read identically wherever
// the paywall is met.

export const BILL_FOLLOW_COPY = {
  // Names the section without repeating "artists", which the count line
  // immediately below already says. "On this bill" is how the acts are
  // referred to out loud, and it makes clear the list is scoped to tonight
  // rather than being every artist we know about.
  title: 'On this bill',
  // ED-02: the header carries the count. Rendered beside the title, so it is
  // a bare quantity rather than a sentence.
  count: (total: number) => `${total} artists`,
  countSingular: '1 artist',
  // The count lives in the button because a bulk write that does not say how
  // many rows it will create is a tap taken on trust. One act needs no "all"
  // — there is nothing for it to be all of.
  followAll: (unfollowed: number) =>
    unfollowed === 1 ? 'Follow' : `Follow all ${unfollowed}`,
  // Read only by a screen reader, and only while the commit is in flight. The
  // visible label does not change, because a width change mid-tap moves the
  // button out from under the finger that is still on it.
  followAllPendingAria: 'Following them now',
  // What the block is for, said once. It is the only line that explains the
  // payoff, so it names the trigger ("book a Denver date") rather than
  // gesturing at alerts in general.
  body: "We'll tell you the day any of them book another Denver date.",
} as const
