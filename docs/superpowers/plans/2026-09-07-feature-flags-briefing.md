# Epic Run Briefing — Feature Flag System

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-09-07-feature-flags.md` — the execution plan. Thirteen tasks, in order, each with its own TDD cycle and commit. PR grouping is below; task order inside a PR is the plan's order.
2. `docs/superpowers/specs/2026-09-06-feature-flags-design.md` — the eng spec. Scope, the locked decisions, and the reasoning behind 404-not-403 and the separate `FeatureFlagKey` namespace.
3. Design briefs: none. Hugh waived the design round explicitly — the admin surface mirrors the existing `founder-window` page, and the customer-facing effect of a flag is an already-shipped state (`hidden`), not a new one.
4. Design handoffs: none, for the same reason.

## Current state (verified 2026-09-07)

- **Spec PR #1661 merged** as `026e2066d`. **Plan PR #1662 merged** as `13b2270e7`. Both are on `main`.
- **No `feature_flags` table exists** in any environment. The plan's Task 2 creates it as migration `0086_feature_flags.sql`; the last migration on `main` is `0085_price_submission_last_seen.sql` at `when: 1787529600000`, index 85. Re-check that this is still the tail before generating, because an unrelated PR merging first shifts the index.
- **No new environment variables.** The flag state lives in the database and is read through the existing API. Nothing needs placing in Render, Vercel or GitHub Actions, so no step in this run is blocked on Hugh pasting a value.
- **No new infrastructure.** No cron, worker, queue or bucket. The only provisioning is the migration, which rides the normal deploy.
- **Prod data in the flagged features is negligible, and this is the premise of the whole design.** Counted against the production Neon database (`small-bird-62431126`) on 2026-09-07: 1 crew, 1 crew membership belonging to 1 distinct user, 2 crew invites, and 3 Spotify connections, against 482 artist follows overall. The spec's estimate of "about five Spotify users, crews essentially all Hugh's" holds, and comfortably. That is why the spec chose a clean slate over graceful degradation, and why turning both features off in production is safe rather than destructive. Re-run the count at kickoff; if it finds materially more, stop and escalate, because the premise has changed rather than the number.

  ```sql
  SELECT (SELECT COUNT(*) FROM crews) AS crews,
         (SELECT COUNT(*) FROM crew_members) AS crew_members,
         (SELECT COUNT(DISTINCT user_id) FROM crew_members) AS distinct_crew_users,
         (SELECT COUNT(*) FROM crew_invites) AS crew_invites,
         (SELECT COUNT(*) FROM user_spotify_connections) AS spotify_connections,
         (SELECT COUNT(*) FROM user_artist_follows) AS all_follows;
  -- 1 | 1 | 1 | 2 | 3 | 482
  ```

- **Two crew invites are outstanding in production.** Any invite link already sent will 404 once `crews` is off. Both are Hugh's, so this needs no communication, but it is a real user-visible consequence and it belongs in the run report rather than being discovered later.
- **`spotify-sync` and `crews` will be off in production the moment their gate PRs merge**, because the registry defaults them off and the table starts empty. This is intended.
- **`release-notes` defaults on**, so nothing about the changelog, the version footer or the feature-drop pill changes for customers during this run.

## Risk shape — REQUIRED

**Cross-surface gating, with an event-driven tail.**

The dominant risk is a missed surface: a flag that hides Crews from the bottom nav but leaves the Browse crew lens rendering, or hides the UI while the API still answers 200. Every miss is a place a customer can still reach a feature we believe is off, and none of them announce themselves — the app looks correct from whichever surface you happen to be on. So the effort goes into Gate 3's sibling sweep, grepping for every render site of each gated feature rather than trusting the plan's list, and into the integration test that proves `requireFlag`'s 404 precedes `requireFeature`'s 403.

The tail is Gate 6. Task 11 suppresses the Spotify-shaped weekly digest when the flag is off, and a digest that silently stops firing — or worse, keeps firing for the native shape but skips a user it should have mailed — is invisible from any screen. That trigger gets run, not read.

This epic is not content/data-driven, and it is only lightly copy/IA-driven: the customer-facing strings it touches are the ones it deletes from the page.

## Launch gating — REQUIRED

**(a) Reachable on merge, deliberately — but read which direction it points.**

This epic does not make a new vertical reachable. It makes two existing ones unreachable, and it does so incrementally as its PRs land. The customer-visible flip happens in two places:

- **PR 3 (plan Task 5)** mounts `requireFlag` on the crews, crew-invites and spotify routers. From that merge, those API routes answer 404 in production.
- **PR 6 (plan Tasks 9 and 10)** gates the web routes and elements. From that merge, the Crews tab, crew pages, the Browse crew lens and the Spotify connection affordances stop rendering.

Between those merges the API is off while some UI still renders, so a surface may briefly show a control whose request 404s. That window is acceptable because the affected population is Hugh plus roughly five beta users, and it closes within the same run. Do not reorder the plan to close it by gating the UI first — a UI-first order would leave the API open, which is the worse of the two failure directions.

**The switch that reverses any of this is the admin toggle, which lands last (PR 8, plan Task 12).** Until then the only way to turn a feature back on is the admin API from PR 4 (plan Task 7) or a row inserted directly into `feature_flags`. That is a deliberate accepted gap, not an oversight: both features are meant to be off, `spotify-sync` for a very long time. If the run has to be abandoned partway, note in the report which PRs merged so Hugh knows whether he has a UI switch, an API call, or a SQL statement.

**No `releases.ts` entry, at any point in this run.** A changelog entry announcing that features have been hidden contradicts hiding them, and `release-notes` is itself one of the three flags. One `progress.md` row lands with the final PR.

## Off-happy-path homes — REQUIRED

| New state                                                                                                               | Where it lives in the IA                                                                                               | How the user reaches it                                                                                                                                                                          | Reversible?                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A user who created a crew before `crews` went off                                                                       | Nowhere. The crew rows stay in the database untouched; no surface renders them and no API route returns them.          | They cannot. Every entry point is gated and every route 404s.                                                                                                                                    | Yes, completely — flipping the flag on restores every crew and membership exactly as it was. Nothing is deleted.                                                                                                                               |
| A user with a live Spotify connection when `spotify-sync` goes off                                                      | Nowhere in the app. The OAuth token continues to live in Clerk, which is where it has always lived; we do not hold it. | They cannot see or disconnect it in Concert Crawl. They can revoke it from Spotify's own account page, which is the affordance Spotify guarantees.                                               | Yes. Flipping the flag on returns them to a connected state with no re-auth.                                                                                                                                                                   |
| A user whose artist follows originated from Spotify sync                                                                | The normal Following surfaces, unchanged.                                                                              | Same as any other follow.                                                                                                                                                                        | Not applicable — this state is deliberately untouched. Hiding Spotify must never take native following down with it, which is why `following` is not coupled to the `spotify-sync` flag and why Task 11 keeps the native digest shape running. |
| A bookmarked or shared link to a gated route (`/crews`, `/crews/<slug>`, a crew invite link from an email already sent) | The app's 404 page, via `notFound()` from the server component.                                                        | They arrive by following the old link. The 404 page's own navigation is the way back to the app.                                                                                                 | Yes — the link starts working again the moment the flag is on.                                                                                                                                                                                 |
| An admin who has toggled a flag but is looking at a page rendered seconds earlier                                       | The admin flag page itself, after its refetch.                                                                         | The 30-second loader memo means the API can serve the old answer for up to 30 seconds after a write, except that an admin write calls `clearFeatureFlagCache()` so its own process is immediate. | Yes, inherently. Worst case is one TTL window on another API instance.                                                                                                                                                                         |

No row here is a product question. The first two are the clean-slate premise the spec locked, and the fourth is the intended meaning of 404-not-403: the feature must look like it was never built.

## User journeys — walk script — REQUIRED

### Journey A — Admin turns a feature on, then off again

Entry point: `/admin/feature-flags` as a signed-in admin.

1. Load the page. Expect three rows — Spotify sync, Crews, Release notes — each with its label, its description, and a toggle. Spotify sync and Crews read off; Release notes reads on.
2. Toggle Crews on. Expect a confirmation modal naming what is about to change.
3. Confirm. Expect the row to settle to on, a success toast, and no full page reload.
4. In a second tab, load `/crews` as a normal signed-in user. Expect the Crews surface to render.

**Reverse:** toggle Crews back off, confirm, then reload the second tab. Expect a 404. Also cancel a toggle at step 3 and confirm the row stays where it was — a cancelled confirm must not leave the switch visually flipped.

**Repeat:** on, off, on. The third state must be genuinely on, with the crew rows from before still present. This is the pass that catches a write that soft-deletes rather than updates.

**Resume:** reload the admin page mid-journey and confirm it reflects the stored state rather than the registry default. Then open it in a second session and confirm both agree.

### Journey B — A customer under a flagged-off feature

Entry point: the app as a signed-in non-admin user, `crews` off.

1. Open Browse. Expect no crew lens rail, and no crew going-line on any event row.
2. Open the bottom nav. Expect no Crews tab.
3. Navigate directly to `/crews`. Expect the 404 page, not a redirect and not an upsell.
4. Call `GET /v1/crews` directly. Expect 404, and specifically not 403 — a 403 would tell a free user the feature exists and costs money.
5. Repeat step 4 as a premium user, who would otherwise be entitled. Still 404. This is the ordering guarantee: `requireFlag` before `requireFeature`.

**Reverse:** flip the flag on and repeat all five steps. Every surface returns.

**Repeat:** off, on, off. Confirm nothing is keyed to a dismissal or a one-time seen flag that survives the round trip.

**Resume:** reload each surface. Confirm the server-rendered pass and the client hydration agree — a flag read that differs between the two produces a flash of a feature we just hid, which is the most visible way this epic can fail.

### Journey C — A customer under a flagged-off Spotify

Entry point: Settings → Connections, `spotify-sync` off.

1. Expect no Spotify connect affordance and no OAuth handoff sheet entry point.
2. Confirm the artists this user follows are all still listed on the Following surface, including any that arrived through Spotify. This is the coupling we deliberately did not make.
3. Run the weekly digest job. Expect the Spotify-shaped digest to be skipped with a log line naming the flag, and the native digest to be sent to a user who qualifies for it.
4. Confirm from a second account that the skip is per-shape and not per-user — one user's native digest must not suppress another's.

**Reverse:** flip `spotify-sync` on and re-run. Both shapes send.

**Repeat:** run the job twice in the same ISO week with the flag off. The second run must not double-send the native digest — the existing idempotency key still governs, and the flag must not have created a path around it.

**Resume:** not applicable to a cron job; the equivalent check is running it twice concurrently, covered above.

### Where each journey gets walked

A and B run on local dev with the API and web app up. Journey C's step 3 runs locally by invoking the job directly; step 4 needs two seeded accounts and is walked on staging, because staging is where the seeded second account lives. Say so in the report if staging credentials turn out to be unavailable, rather than reporting C as passed.

## Hard pause points — stop and ask, do not proceed

- **Any hand-run SQL against the production database.** The `0086` migration rides the normal deploy and needs no approval; a manual `INSERT` into `feature_flags` in production does, because it is the switch that turns a customer-facing feature on or off outside the audited admin path.
- **A kickoff count materially above the verified numbers above — say, more than ten Spotify connections, or a crew with members who are not Hugh.** That falsifies the clean-slate premise the spec is built on, and the right response is to re-open the graceful-degradation question with Hugh rather than to proceed carefully.
- **Any proposal to couple `following` to the `spotify-sync` flag.** Hugh ruled on this explicitly. If a surface seems to require it, that is a design question, not an implementation detail.

## Notify-and-proceed

- **Turning `crews` and `spotify-sync` off in production**, which happens implicitly as PRs 3 and 6 merge. Validate first on staging by walking Journey B end to end, capture the 404 responses and the absent surfaces, post the summary, then continue. Proceeding is acceptable because this is the epic's entire purpose and because the affected population is Hugh plus a handful of beta users, all of whom can be restored by one toggle.
- **The admin API landing before the admin UI.** Once PR 4 merges, verify the round trip with an authenticated request against staging and post the evidence. That is the switch of record until PR 8 lands.

## Done means

- All thirteen plan tasks implemented, in plan order, across the nine PRs grouped below, each merged at the full Copilot bar.
- Gate 1 run at the API-to-UI seam before PR 6's build starts, with `docs/superpowers/state-coverage-feature-flags.md` committed. The state that matters is the flagged-off one: prove that the web app can actually observe a false flag on both the server pass and the client pass.
- Gates 2, 3 and 4 run on PRs 6 and 8, the two PRs with UI. Gate 3 is the load-bearing one here and gets the grep evidence recorded.
- Gate 5 run on all three journeys once PR 6 makes Journey B reachable, with `docs/superpowers/journey-lifecycle-feature-flags.md` committed.
- Gate 6 run on the weekly digest trigger, with `docs/superpowers/side-effects-feature-flags.md` committed. Fires, fires once, fires for the right audience.
- Gate 7 run on PR 8, the only PR that adds customer-facing-adjacent strings — noting that admin copy is out of the copy-review scope by project rule, so the honest finding may be that the gate has nothing to review. Say that rather than manufacturing findings.
- The mid-run cold-eyes review run as soon as Journey B is walkable end to end, which is PR 6, with its triage closed in-run.
- PR 9 reserved as the unscoped polish slot.
- `progress.md` carries one ✅ Complete row. `releases.ts` carries nothing.
- Production ends the run with `spotify-sync` off, `crews` off, `release-notes` on, and an admin page that can change all three.

## PR grouping

The plan's thirteen tasks land as nine PRs. Task order within a PR is the plan's order; the groupings pair a task with the one that has no independent value without it.

| PR  | Plan tasks  | Shape                                                                           | Gates                              |
| --- | ----------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | 1, 2        | Registry and migration. No runtime effect.                                      | none                               |
| 2   | 3, 4        | API loader and `requireFlag`. Still unmounted.                                  | none                               |
| 3   | 5, 6        | Mount the gate; add `GET /v1/flags`. **Crews and Spotify go 404 in prod here.** | 6 is not applicable; record why    |
| 4   | 7           | Admin endpoints.                                                                | none                               |
| 5   | 8           | The web entitlement seam.                                                       | 1, run before PR 6 builds          |
| 6   | 9, 10       | Route and element gating. **The UI disappears here.**                           | 2, 3, 4, 5, cold-eyes              |
| 7   | 11          | Weekly digest suppression.                                                      | 6                                  |
| 8   | 12          | The admin UI.                                                                   | 2, 3, 4, 7                         |
| 9   | 13 + polish | `progress.md` row and the reserved polish slot.                                 | whatever the cold-eyes triage left |
