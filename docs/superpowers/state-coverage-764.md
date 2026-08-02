# Gate 1 — State reachability · #764 venue first-timer guide

Runs at the API→UI seam, **before** the PR-3 consumer build starts. Each state
named in the design handoff's template inventory is answered on all three
questions: is the triggering field in the response **type**, does the **route**
actually compute it, and is the condition **reachable at runtime** given how the
component is mounted, seeded and cached.

Legend: ✅ reachable · ⚠️ type present / route incomplete · ❌ not surfaced ·
🚫 unreachable at runtime.

Evidence is recorded as the command run and the output seen. A row with no
evidence is an attestation, not a gate.

---

## Where the venue page's auth gate actually lives

This is the question that decides whether the **anonymous** state is real, and
the plan's line 151 is stale in both directions — so it was re-derived from the
repo rather than from the plan.

`apps/web/src/app/(protected)/` is a Next.js **route group only**. Its
`layout.tsx` says so in its own words; it enforces nothing. The real gate is
`apps/web/src/middleware.ts`.

```
$ grep -n "isAlwaysPublic\|isPublicOnceLaunched" apps/web/src/middleware.ts
13:const isAlwaysPublic = createRouteMatcher([
39:const isPublicOnceLaunched = createRouteMatcher([
41-  '/venues(.*)',
```

`/venues(.*)` is in `isPublicOnceLaunched`, **not** `isAlwaysPublic`. That
matcher only applies when `isPublicBrowseEnabled()` is true:

```ts
// apps/web/src/lib/launch-mode.ts
export const isPublicBrowseEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_PUBLIC_BROWSE === 'true'
```

`NEXT_PUBLIC_` means the value is **inlined at build time**. The file's own
comment is explicit: _"Flipping this therefore requires a redeploy, not just an
environment change in the Vercel dashboard."_

**Live evidence (2026-08-02):**

```
$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://staging.concertcrawl.app/venues
307 https://staging.concertcrawl.app/sign-in?redirect_url=%2Fvenues

$ curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://concertcrawl.app/venues
307 https://concertcrawl.app/sign-in?redirect_url=%2Fvenues
```

Both environments redirect signed-out visitors away from `/venues` **today**.
`REQUIRE_BETA_AUTH` — which the plan still references — no longer exists
anywhere in `apps/api`.

### Consequence for this build

The anonymous branch is built and unit-tested as real code, and exercised
signed-out **locally** with `NEXT_PUBLIC_PUBLIC_BROWSE=true`. In the table below
it is marked **reachable-behind-launch-flag** — not reachable-in-prod. No
signed-out staging verification is claimed for it, because none is possible
without a redeploy that flips the launch flag, and flipping that flag is a
launch decision, not a PR-3 decision.

The API half is different and must not be conflated with it: the guide rides the
**unauthenticated** `GET /v1/venues/:slug` response, so the anonymous _data_ path
is fully testable today via integration tests with no bearer token.

---

## State coverage

| #   | Surface · state                                       | Trigger                                                           | Type                                                                           | Route                                                      | Runtime                                                                                                                                          | Verdict                           |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| 1   | Venue detail · first-timer **populated**              | `guide !== null` and `deriveGuideDensity() === 'populated'`       | `VenueGuideChip` + `insiderTip` (PR-1, on main)                                | Added in Task 9                                            | Any published guide with an insider tip or ≥1 non-accessibility chip                                                                             | ✅                                |
| 2   | Venue detail · first-timer **thin**                   | `deriveGuideDensity() === 'thin'`                                 | same                                                                           | same                                                       | Accessibility-only guide with no insider tip — the publish gate permits exactly this, so it is the _minimum_ publishable shape, not an edge case | ✅                                |
| 3   | Venue detail · **accessibility honest placeholder**   | `chip.isPlaceholder === true`                                     | `VenueGuideChip.isPlaceholder` (PR-1)                                          | Task 9 must carry `isPlaceholder` through the projection   | Reachable via the admin toggle shipped in PR-2 (#1313)                                                                                           | ✅                                |
| 4   | Venue detail · **unpublished / no guide**             | `venue.guide === null`                                            | nullable field                                                                 | Task 9 filters on `guidePublishedAt IS NOT NULL`           | Default state of every venue in prod today — this is what most rows render                                                                       | ✅                                |
| 5   | Venue detail · **anonymous** (renders as first-timer) | `isSignedIn === false` → `resolveGuideViewerMode` → `first_timer` | `GuideViewerMode` (PR-1)                                                       | Task 11 wires the resolver                                 | 🚫 **in staging/prod** — see the curl evidence above. ✅ locally with `NEXT_PUBLIC_PUBLIC_BROWSE=true`. API path ✅ today.                       | ⚠️ reachable-behind-launch-flag   |
| 6   | Venue detail · **returner**                           | `hasAttendedVenue === true`                                       | `GuideViewerMode` (PR-1)                                                       | `viewerHasAttended` is `null` on every response until PR-4 | 🚫 by design pre-PR-4 — `resolveGuideViewerMode` maps `null` → `first_timer`, which is the locked pre-#70 behavior                               | 🚫 deferred to PR-4 (intentional) |
| 7   | Event detail · **first-timer chip**                   | `mode === 'first_timer'` **and** `venueGuidePublished === true`   | ❌ **`venueGuidePublished` does not exist on the event-detail response today** | Task 12 adds it                                            | Unreachable until Task 12 lands the field                                                                                                        | ❌ → fixed in Task 12             |
| 8   | Event detail · **returner baseline** (no chip)        | `mode === 'returner'`                                             | as row 6                                                                       | as row 6                                                   | Same PR-4 dependency                                                                                                                             | 🚫 deferred to PR-4 (intentional) |

### Row 7 is the #1169-shaped risk in this epic

It is the one state where the component would render correctly when handed the
right props and the app would never hand them over: `EventFirstTimerChip`
branches on `venueGuidePublished`, and that boolean is absent from
`apps/api/src/routes/events.ts` today. Task 12 adds it to the event-detail
projection **in the same PR as the component**, and its test asserts the chip is
absent when the flag is false. Building the chip without the field would have
reproduced #1169 exactly.

### Rows 6 and 8 are deferred, not broken

`resolveGuideViewerMode` already treats `null` as "we don't know" and defaults to
the helpful `first_timer` branch (brief Q7). PR-3 wires the resolver call with
`viewerHasAttended` flowing through as `null`, so PR-4 is a data change rather
than a refactor. Marking these 🚫 records that the returner templates in the
handoff are deliberately unexercised by PR-3 — not that they were missed.

---

## Verdict

- Rows 1–4: ✅ reachable, no blockers to the PR-3 build.
- Row 5: proceeds as **reachable-behind-launch-flag**, stated plainly in the PR
  body. No signed-out staging claim.
- Row 7: ❌ today, closed inside PR-3 by Task 12. The API field and the component
  ship together.
- Rows 6, 8: intentionally deferred to PR-4, which is blocked on #70's
  `user_events.attending_at`.

No row requires escalation. The PR-3 build starts.
