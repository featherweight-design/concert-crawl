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
