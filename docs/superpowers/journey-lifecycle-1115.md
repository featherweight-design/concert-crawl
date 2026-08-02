# Gate 5 — Journey lifecycle, #1115 artist page

Run 2026-08-02, at PR-F (the PR that first makes the artist page reachable end-to-end).
Journeys are the six in `docs/superpowers/plans/2026-08-01-1115-artist-page-briefing.md`
§"User journeys — walk script".

Driven against local dev in the PR-F worktree — `apps/api` on 3001, `apps/web` on 3010 with
`NEXT_PUBLIC_PUBLIC_BROWSE=true` — through headless Chromium, viewports 320 / 390 / 1280.
Port 3010 rather than 3000 because 3000 was already serving another session's dev server.

Fixtures in the local DB (`artists` projection table):

| slug               | upcoming | past    | spotify id               |
| ------------------ | -------- | ------- | ------------------------ |
| `gate-two-shows`   | yes      | no      | none                     |
| `gate-two-spotify` | yes      | no      | `3TVXtAsR1Inumwj472S9r4` |
| `gate-two-empty`   | no       | yes (2) | none                     |
| `gate-five-void`   | no       | no      | none                     |

`gate-five-void` was seeded for this gate specifically — J4 step 2 asks for an artist with
no upcoming **and** no past, and no existing fixture had that shape.

---

## What could not be driven locally, and why

**J2 (follow/unfollow signed in) has no local browser pass.** Both routes to a local session
are closed, verified rather than assumed:

- The `E2E_AUDIT_USER_*` credentials are set in the environment and `prepareAuditAuth('user')`
  exists in `apps/e2e/src/audit/audit-auth.ts` — but that user lives in the **staging** Clerk
  instance. Driving the local sign-in form with it returns `Couldn't find your account.`
- Minting a local user instead fails at Clerk's sign-up step, which renders a Cloudflare
  Turnstile challenge (`input[name="cf-turnstile-response"]` present in the DOM). Submitting
  the completed form returns to `/sign-up` with no verification step and no error. Reproduced
  headless **and** headed. The private-beta invite gate ahead of it is _not_ the blocker —
  seeding an `invite_codes` row matching the `BETA-XXXX-XXXX` format cleared that step.

So J2's four passes are **walked on staging after PR-F merges**, where the audit user is real.
The artifact is not complete until that happens. What is proven today is unit-level, and that
is a weaker claim than a walk:

- `lib/use-artist-follow.test.tsx` — optimistic flip on click, and rollback when the request
  is rejected.
- `apps/api` follow-endpoint integration tests — the write path and its idempotency.

**J5 (search → artist) is not reachable yet.** Its entry point is built in PR-G; it is walked
when PR-G opens, not here.

**J6 (long-tail slugs)** is a staging journey by the briefing's own instruction — it needs the
real backfilled artist set, not four hand-seeded rows.

---

## J1 — Discover an artist from a show

The event-detail → artist link is PR-G's, so steps 1–2 of the script are walked there. The
rest of the journey is reachable now by direct URL and was run.

| Pass    | What was run                                            | Result                                                                                                                                                                                          |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forward | `GET /artists/gate-two-shows`                           | `h1` = `Gate Two Shows`; history line = _"First time we've caught them. Our crawl only goes back to March 2026, so that's not saying much."_ — reads against `CRAWL_SINCE`, not a bare count ✅ |
| Reverse | `page.goBack()` from the artist page                    | returns to the previous artist URL; no error, no stale name ✅                                                                                                                                  |
| Repeat  | in/out ×3 between `gate-two-empty` and `gate-two-shows` | `h1` correct on all three passes; no stale-name flash ✅                                                                                                                                        |
| Resume  | direct load with history length 1                       | back affordance present — `<button aria-label="Back">` renders in the mobile hero, so the page does not dead-end ✅                                                                             |

An earlier probe reported the back chip missing; that was a bad selector on my side
(`[class*="back"]`), not a defect. Re-probed by scanning every `a`/`button` for a
back-ish accessible name, which found it.

## J2 — Follow and unfollow, signed in

Deferred to staging in full — see above. Not marked ✅ anywhere in this document.

## J3 — Follow, signed out

Run at 390×844 with `NEXT_PUBLIC_PUBLIC_BROWSE=true`, no session.

| Check               | Observed                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| accessible name     | `"Follow Gate Two Shows — sign in to follow"` ✅                                                                                                                |
| `aria-haspopup`     | `"dialog"` ✅                                                                                                                                                   |
| `aria-pressed`      | `null` — omitted, not `"false"` (#794 §3.10) ✅                                                                                                                 |
| hit area            | 354×48 ✅                                                                                                                                                       |
| network on activate | **0** requests to `/follow` — no silent write attempt ✅                                                                                                        |
| result of activate  | tier-picker dialog opens: _"FOLLOWING · FREE WITH AN ACCOUNT / 4 TIERS / Never miss the next one they book. / Following is free — it just needs an account"_ ✅ |

Resume (complete sign-up → land back on the artist page) is blocked by the same Turnstile
wall as J2 and goes to staging with it.

## J4 — The empty artist

| Step                     | Fixture          | Observed                                                                                                                                                                              |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — no upcoming          | `gate-two-empty` | empty state renders and pitches Follow: _"Nothing on the calendar. No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking."_ ✅ |
| 2 — no upcoming, no past | `gate-five-void` | coherent page, not a blank one; `h2` = `["Upcoming"]` only — the `Previously` header correctly does not render with nothing under it ✅                                               |
| 3 — no dead controls     | both             | 0 disabled buttons / `aria-disabled` anchors; exactly 1 follow control ✅                                                                                                             |

**Step 3 found a real bug.** On `gate-five-void` the no-Spotify block still read
_"Doesn't mean much — plenty of good bands aren't. **Their shows are below.**"_ — and nothing
was below it. When an artist has no upcoming shows the player falls to the last block on the
page, so on `gate-five-void` (and on `gate-two-empty` before its `Previously` section) the
sentence points at nothing.

Fixed test-first. `ArtistEmbed` already takes `skipTo`, which is `null` in exactly the case
"the player is the last block", so the variant keys off that rather than a new prop:
`ARTIST_COPY.playerNoneSubLast` drops the pointer clause. Test
`drops the "shows are below" pointer when nothing follows the player` was written first and
observed failing (`playerNoneSubLast` undefined) before the copy key existed.

Re-driven in the browser after the fix:

```
gate-five-void  | says "shows are below" = false | h2 = ["Upcoming"]
gate-two-empty  | says "shows are below" = false | h2 = ["Upcoming","Previously"]
gate-two-shows  | says "shows are below" = true  | h2 = ["Upcoming"]
```

The pointer now appears only when shows actually follow.

## Cross-cutting — one live follow affordance, all viewports

The single-affordance invariant is the one thing on this page decided in JS rather than CSS,
so it is the one most likely to regress into two mounted buttons. Counted before and after
scrolling past the hero:

| Viewport | follow controls before scroll | after scrolling 900px | horizontal overflow |
| -------- | ----------------------------- | --------------------- | ------------------- |
| 320×720  | 1                             | 1                     | none                |
| 390×844  | 1                             | 1                     | none                |
| 1280×900 | 1                             | 1                     | none                |

Never 0, never 2 — the mobile inline→sticky handoff swaps rather than stacks, and the desktop
rail keeps its slot for the whole scroll.

## Console

The only console errors across the whole walk are CORS failures on
`http://localhost:3001/v1/search/popular` and `/v1/billing/founder-window`, from the browser
origin being `:3010` while the API's local allow-list names `:3000`. A local artifact of the
port choice, not a defect in this PR — neither endpoint is on the artist page's own path, and
the page renders and functions with both failing.

## Mutation-feedback sub-check

The only mutation reachable in these journeys is the follow write, which is J2, which is
deferred to staging. `useArtistFollow` applies the flip optimistically before the request
resolves, so the #70 "I'm going!" shape should not be present — but "should not be present"
is a code reading, not a timing measurement, and the throttled click-to-paint measurement the
briefing asks for is part of the staging walk.

---

## Standing residue

- J2 (all four passes) + J3 resume → **staging, after PR-F merges**.
- J5 → PR-G.
- J6 → staging, against the backfilled artist set.

The epic is not done until those are walked and this file records them.

---

# Staging walk — 2026-08-02, after PR-G merged as `25175318`

Run against `https://staging.concertcrawl.app` once the Staging Smoke Tests workflow on
`25175318` went green (12:04Z). Driven through headless Chromium signed in as
`E2E_AUDIT_USER_EMAIL`, which is a real user in the **staging** Clerk instance — the account
that did not exist locally and is the whole reason these passes were deferred here.

Fixtures are the real backfilled `artists` set, not hand-seeded rows: `andrea-bocelli`
(2 upcoming), `the-afghan-whigs-40th-anniversary-tour` (0 upcoming, 1 past), `el-tri`,
`congress-the-band`, `an-album-tribute-to-wilcos-sky-blue-sky`.

## J2 — Follow and unfollow, signed in (all four passes)

| Pass        | What was run                                                                          | Result                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forward** | click Follow on `/artists/andrea-bocelli` under CDP throttling (400 ms added latency) | `aria-pressed` `false`→`true`, name → _"Following Andrea Bocelli. Activate to stop following."_; exactly one `POST /v1/artists/andrea-bocelli/follow` ✅ |
| Forward     | reload after the write                                                                | still `pressed="true"` — the optimistic flip matched the server, no snap-back ✅                                                                         |
| **Reverse** | click again                                                                           | `pressed="false"`, name back to the pre-action _"Follow Andrea Bocelli — …"_; exactly one `DELETE …/follow`; survives a reload ✅                        |
| **Repeat**  | do → undo → redo                                                                      | `["true","false","true"]`, and a reload after the redo still reads `true` — no keyed-state residue, nothing that outlives the row it describes ✅        |
| **Resume**  | reload mid-journey, then a **second independent browser context** on the same session | both read `pressed="true"` — nothing is held only in component state or one tab's memory ✅                                                              |

Zero console errors across the whole J2 walk.

### Mutation-feedback sub-check — measured, not inferred

Click → visible `aria-pressed="true"` was **49 ms** with 400 ms of added round-trip latency
emulated through CDP `Network.emulateNetworkConditions`. The paint therefore cannot have waited
on the request. This is the measurement the PR-F artifact could only assert from reading the
code, and it clears the #70 "I'm going!" shape.

### ⚠️ Finding — the Follow copy promises something the product does not do

The walk followed an artist with **2 upcoming shows**, then loaded `/watching`, which read
`0 shows` / _"No shows, grandpa."_ The shows never arrive.

This is not a PR-G regression. It is the **manual-follow black hole** the briefing already
documents and issue **#1306** already tracks: the Follow control writes `source: 'manual'`, and
the fan-out that would auto-watch a new show filters on
`SPOTIFY_FOLLOW_SOURCES = ['spotify_followed','spotify_top']`
(`packages/crawler-core/src/lib/spotify-fanout/index.ts:52`, whose own comment reads
_"Spotify-sourced follows only — manual follows are out of scope"_). Manual follows feed nothing.

What the walk adds is that **the UI says the promise out loud**, in three places:

- `followLabel` — _"Follow {name} — every show they book is added to your Watching"_
- `followPitch` / `followPitchActive` — _"Every show they book lands in your Watching."_
- `emptyUpcomingBody` — _"Follow them and the next one shows up in your Watching without you checking."_

Fixing the behavior is out of scope by the briefing's explicit instruction (#1306 is a
monetization call, not an engineering one). Fixing the **claim** is not — a page whose history
line was deliberately built as an honesty rail should not carry a capability promise that is
false for every follow this button can create. Taken into the polish PR as a copy change only;
#1306 stays open and untouched.

## J3 — Follow, signed out: the resume pass

Staging does not run with `NEXT_PUBLIC_PUBLIC_BROWSE` on, so a signed-out visit to
`/artists/andrea-bocelli` is intercepted by Clerk before the page renders:

```
307 → /sign-in?redirect_url=%2Fartists%2Fandrea-bocelli
```

Completing sign-in from that page landed back on `/artists/andrea-bocelli` with
`h1 = "Andrea Bocelli"` ✅ — the return hand-off the local walk could not reach past Turnstile.

Stated honestly: this closes the **return** leg only. The signed-out tier-picker dialog is
unreachable on staging because the route never renders signed out, so that half of J3 rests on
the local pass recorded above, which did exercise it.

## J6 — Long-tail slugs, real backfilled set

390×844, signed in.

| Slug                                      | HTTP | `h1`                                                    | `h2`                 | follow controls | h-overflow |
| ----------------------------------------- | ---- | ------------------------------------------------------- | -------------------- | --------------- | ---------- |
| `an-album-tribute-to-wilcos-sky-blue-sky` | 200  | An Album Tribute to Wilco's Sky Blue Sky                | Upcoming, Previously | 1               | none       |
| `the-afghan-whigs-40th-anniversary-tour`  | 200  | The Afghan Whigs 40th Anniversary Tour With Mercury Rev | Upcoming, Previously | 1               | none       |
| `el-tri`                                  | 200  | El Tri                                                  | Upcoming             | 1               | none       |
| `congress-the-band`                       | 200  | Congress The Band                                       | Upcoming             | 1               | none       |
| `this-artist-does-not-exist-at-all`       | 200  | Nothing here.                                           | —                    | 0               | none       |

The apostrophe-stripped slug round-trips to a name that still carries its apostrophe; the long
tour name wraps across three lines in the desktop hero without overflowing; the unknown slug
renders a coherent not-found page and correctly offers no follow control. Never 0 and never 2
follow controls on a real artist — the single-affordance invariant holds on the real data set,
not just on fixtures.

## Cold-eyes finding 3 — re-checked after PR-F, **still present**

The finding was _"Nothing below the shows list. On desktop the right column ends at ~40%
viewport height and reads as a page that failed to load,"_ dispositioned "re-check after PR-F."
PR-F has landed. Measured at 1280×900:

| Slug                                      | content ends at | viewport | `document.scrollHeight` | scrollable |
| ----------------------------------------- | --------------- | -------- | ----------------------- | ---------- |
| `andrea-bocelli` (2 upcoming)             | ~270 px (30%)   | 900 px   | 900                     | no         |
| `the-afghan-whigs-…` (0 upcoming, 1 past) | ~380 px (42%)   | 900 px   | 900                     | no         |

Screenshots confirm it visually — below the last show row the page is empty to the fold. It is
not missing page chrome: `/events` and `/venues` have no `<footer>` either (`footer: false` on
all three), they are simply long enough that it never shows. The artist page is the first
surface short enough to expose it.

The finding survives PR-F. **Disposition: filed as issue #1334, not fixed in the polish PR.**
Because `/events` and `/venues` share the absence, fixing it on `/artists/[slug]` alone would
make that one route diverge from its siblings. The call is app-wide bottom chrome — a footer,
a min-height, or a deliberate nothing — and it is not one route's polish PR to make.

---

## Standing residue — closed

- J2 (all four passes) → ✅ walked on staging above.
- J3 resume → ✅ walked on staging above.
- J5 → ✅ PR-G.
- J6 → ✅ walked on staging above.

Gate 5 is complete for #1115. Two items came out of it: the false Watching promise in the
Follow copy, fixed in the polish PR; and cold-eyes finding 3, filed as #1334 because it is
app-wide rather than artist-page-shaped.
