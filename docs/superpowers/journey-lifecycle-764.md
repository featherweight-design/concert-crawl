# Gate 5 — Journey lifecycle · #764 venue first-timer guide

Run 2026-08-01 against local dev (web :3000, API :3001, local Postgres seeded
with published guides on `ogden-theatre` (populated), `bluebird-theater`
(thin/placeholder accessibility) and `mission-ballroom` (thin/authored);
`summit-music-hall` deliberately has no published guide).

Driven with Playwright at 390×844 and 1280×900. Every line below is captured
output, not an attestation.

## Journey — "I've never been to this room, what am I walking into?"

The only journey PR-3 makes reachable. It is read-only: the guide surfaces
admin-authored content and the consumer commits nothing, so there is no
mutation to undo. The four passes are recorded accordingly, and the mutation
sub-check is answered rather than skipped.

| Pass      | What was run                                                       | Result                                                                                                                                     |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 Forward | Event page → first-timer chip → venue guide                        | ✅ chip present, `href=/venues/ogden-theatre#ft-guide`, guide renders, landed at `top=12` (clears the viewport edge via `scrollMarginTop`) |
| 2 Reverse | Browser back from the venue to the event                           | ✅ returns to `/events/<id>`, chip still present and unchanged — no hollow post-navigation state                                           |
| 3 Repeat  | Click the same chip a second time                                  | ✅ `top=12`, identical to the first pass on both viewports                                                                                 |
| 4 Resume  | Cold load of `/venues/ogden-theatre#ft-guide`, then a reload on it | ✅ `top=12` both times; the guide is server-rendered, so nothing is held in component state or a single tab's memory                       |

Negative control, same run: `summit-music-hall` has no published guide →
`chip on event page = 0`, `guide section = 0`. The surface stays absent rather
than rendering an empty shell.

## Bug found by this gate

**Pass 1 failed on the first run, on both viewports.** Captured output:

```
forward: anchor landed top=710 clearsViewportEdge=true   (mobile)
forward: anchor landed top=652 clearsViewportEdge=true   (desktop)
resume:  cold deep-link guide top=12                     (both)
```

A cold load honoured `#ft-guide` because the browser resolves the fragment
itself. A client-side navigation from the event chip did not — Next restores
the top of the new route and never reads the hash — so the chip whose entire
purpose is to land the user on the guide left it ~700px below the fold. Every
unit test, the design table and the type system were green on this; it only
appears when the journey is actually walked across two routes.

Fixed by `GuideAnchorScroll`, a mount-time client component that scrolls to the
anchor when the hash is present (a no-op re-scroll on the cold-load path).
Regression coverage in `GuideAnchorScroll.test.tsx`: scrolls on `#ft-guide`,
stays put with no hash and with an unrelated hash. Re-run after the fix shows
`top=12` on all four passes and both viewports.

## Mutation feedback sub-check

Not applicable, stated rather than skipped: the journey contains no consumer
mutation. Nothing on the guide writes — no watch, no dismissal, no "seen"
marker, no localStorage flag. Consequently there is no key that can outlive the
thing it points at (the `eventId`-vs-`userEventId` class from #70 has no
foothold here) and no click-to-visible-change gap to time.

The guide's only writes are admin-side and shipped in PR-2.
