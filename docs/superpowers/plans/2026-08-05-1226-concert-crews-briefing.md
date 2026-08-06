# Epic Run Briefing — Concert Crews (#1226)

Feature-specific facts for the epic-run of
[#1226](https://github.com/HartiganHM/concert-crawl/issues/1226). Run mechanics live in the
`epic-run` skill, not here.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-05-1226-concert-crews.md` — the merged execution plan.
   Master sequencing: 7 PRs, phase order, per-PR task lists. Follow its order exactly.
2. `docs/superpowers/specs/2026-08-02-1226-concert-crews-design.md` — design brief, merged in
   PR [#1371](https://github.com/HartiganHM/concert-crawl/pull/1371).
3. `design/design_handoff_concert_crews/` — visual ground truth. Readiness verdict **🟢 Green**
   in `READINESS.md`, merged in PR [#1456](https://github.com/HartiganHM/concert-crawl/pull/1456)
   after five rounds.

The plan's two "✅ Resolved" sections and its "Decisions this plan makes" section (D1–D6) are
binding. Do not re-litigate them.

### One trap worth restating

PR-4's entitlement-gate strings come from the **copy-review verdict table** inside the plan's
"✅ Knock-on" section, **not** from `design/design_handoff_concert_crews/crew-copy.jsx`. The
handoff holds illustrative literals ("Supporter", "$2/mo") because the prototype has no
entitlement runtime; the build resolves the tier name through `unlockTierFor('crews')` and the
price through `tier-picker/definitions/constants.ts`. Copying the handoff literals ships a
hardcoded tier name, which is the exact rot class the copy pass removed.

## Current state (verified 2026-08-06)

| Claim | Verified how | Result |
| --- | --- | --- |
| Last shipped migration is `0075_latin_extended_canonical`, `when: 1786665600000` | `tail packages/db/migrations/meta/_journal.json` | ✅ confirmed. Note the path is `packages/db/migrations/`, **not** `packages/db/drizzle/` |
| `PREMIUM_FEATURES` holds 7 keys; `crews` is not among them | `packages/entitlements/src/index.ts:10-30` | ✅ confirmed. PR-1 takes it to 8 |
| `concert-history` and `calendar-export` are `supporter: 'visible-active'` | same file, 2026-07-29 amendment comment | ✅ confirmed. This is the precedent the crews cell follows |
| Neither the `/crews(.*)` nor the `/crew/join(.*)` matcher pattern appears in `isAlwaysPublic` or `isPublicOnceLaunched` | `apps/web/src/middleware.ts:13-60` | ✅ confirmed absent, which is the intended end state (PR-3 Task 5 changes nothing here) |
| Latest release entry is `v0.34.0-beta` | `apps/web/src/lib/definitions/releases.ts:34` | ✅ confirmed. PR-7 adds the version above it |
| `prepareAuditAuth('user' \| 'admin')` exists for the cold-eyes sweep | `apps/e2e/src/audit/audit-auth.ts:17` | ✅ exists |
| `E2E_AUDIT_USER_*` / `E2E_AUDIT_ADMIN_*` are placed | `env \| grep -c E2E_AUDIT` → 4 | ✅ all four present. **The cold-eyes capture is not blocked** — do not report it as such |
| `main` is green | Release `1.216.7` published after PR #1489 fixed the lockfile | ✅ green as of 2026-08-06 |

Things that intentionally do **not** exist yet: the four crews tables, the `crews` entitlement
key, the three `crew.*` notification categories, `/crews`, `/crew/join/<token>`, and the fifth
nav slot.
All are introduced by this plan.

No new env vars, no new external accounts, and no new infrastructure. Crews adds no cron, no
worker, no queue, no bucket, and no database beyond four tables inside the existing Postgres —
so the skill's "declared but never provisioned" failure shape cannot occur on this epic.

## Risk shape — REQUIRED

**Mixed: content/data-driven, with a real event-driven tail in PR-7.**

The bulk of the epic is UI over a derived query: crew shows are a read-time join against
`user_events`, not a stored table (D1). Bugs will come from the long tail of that derivation —
a crew of one, a crew at the 12 cap, a member with a null `handle`, a crew whose upcoming list
is empty while its past list is not, and the tense boundary at exactly 1 and exactly 2
attendees. Gate 2 must be run with **deliberately ugly fixtures**, not clean ones.

The tail is PR-7's `crew.*` fan-out, which is textbook event-driven: a record created because
something else happened, silent when it fails. Gate 6 is mandatory there and nowhere else, and
its hardest sub-check is audience — a second account is the only way to see a fan-out bug.

Second-order risk worth naming: **the invite token is a capability** (D3). It is stored in
plaintext by necessity, so the discipline that replaces hashing is that the token never reaches
a log line, a Sentry breadcrumb, or an error body — including the 404 and 409 paths where
echoing the offending parameter is most tempting.

## Launch gating — REQUIRED

**(a) Reachable on merge, deliberately — and safe, because every crews surface is
authenticated.**

`/crews`, `/crews/[crewId]` and `/crew/join/<token>` go in **neither** `isAlwaysPublic` nor
`isPublicOnceLaunched`, so all three fall through to `auth.protect()` at
`apps/web/src/middleware.ts`. During private beta an account requires an invite code, so the
audience for every crews surface is a signed-in beta member. Nothing about a crew — not the
name, not the patch, not the roster, and above all not attendance — is readable without an
account. This is the same resolution the plan records under "✅ Resolved — `/crew/join/<token>`
and the beta invite wall", restated here because a launch decision belongs in the briefing.

There is **no feature flag and none is needed.** The public-browse flag
(`isPublicBrowseEnabled`, consumed by `isPublicOnceLaunched`) is deliberately not extended to
crews: adding a social vertical to the once-launched matcher is how #794 made a private-beta app
publicly browsable, and crews carries attendance data, which is strictly more sensitive than a
venue page.

**PR-4 is the PR that makes the vertical live** — it adds the fifth nav tab, and a tab is a
front door. PR-1 through PR-3 are invisible plumbing. PR-5 and PR-6 deepen a vertical that is
already reachable, which is precisely why the mid-run cold-eyes review fires after PR-5 rather
than at the end.

`releases.ts` is held to **PR-7** and nothing is held back beyond it. That is a deliberate lag:
PR-4 makes crews reachable but a crews tab with no crew home (PR-5) and no lens (PR-6) is not
the feature the release note would describe. Beta members may find the tab before the note
exists; that is acceptable and is the normal shape of a staged epic in private beta.

## Off-happy-path homes — REQUIRED

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
| --- | --- | --- | --- |
| Member of zero crews | `/crews` empty state, `EmptyState state="no-data"` with a "Start a crew" CTA | Fifth nav tab, always present | n/a — the tab never hides |
| Crew of one (created, nobody joined) | Crew home, inline waiting-room notice with an invite CTA. Hero and both tabs still render | `/crews` → the crew row | Yes — delete the crew, or invite someone |
| Crew with members but zero upcoming shows | Crew home opens on **Been there**; "Coming up" carries "Nobody's committed." | Crew home tab order (PR-5 Task 1) | Yes — any member marking going flips it |
| Crew with 1 past attendee only | Appears in **neither** tab. This is the tense rule (decision 2) and is intended | Not reachable by design; the show lives in that member's own Concerts | n/a |
| Crew at the 12 cap | `CrewNotice` above the roster grid, **not** an `EmptyState` | Crew home → Who's in | Yes — remove a member |
| Holder of a dead invite link (expired / revoked / unknown) | `/crew/join/<token>` renders a dead-link state carrying **no crew identity at all** (decision 11) | The link itself | Yes — ask for a fresh link |
| Holder of a live link to a full crew | Same join page, crew identity **visible**, CTA swapped. At-cap is not a dead link | The link itself | Yes — a member leaves, the link still resolves |
| Signed-out registered beta member on a crew link | Clerk sign-in with `redirect_url` intact, landing back on the join page | Falls out of `auth.protect()`; no new code | Yes |
| Not-yet-onboarded friend on a crew link | `/auth/code` → beta funnel → returned to the crew link by the signed return-path cookie | PR-3 Task 5 plumbing | Yes |
| Keeper who wants out, with other members | Blocked at the server with a typed 409 → handoff sheet. They must pass the crew on first (decision 7) | Crew home → Who's in → leave | Yes — cancel the sheet |
| Keeper who wants out, alone | Distinct typed 409 → "you're the last one" delete confirm. Deletion is an explicit second call | Same | Yes — cancel the confirm |
| Lapsed subscriber who created crews | Keeps every crew, the lens, and the roster. Loses only the act of creating another (D6) | Unchanged — nothing moves | n/a. **Add no lapse branch anywhere** |
| Free-tier member of someone else's crew | Full read, leave, and mute. Only `POST /v1/crews` 403s | Fifth nav tab, same as anyone | n/a |
| Member who muted a crew | Muted chip on the crew hero; the toggle lives in `NotificationsSection` under "Crew activity" | Crew home hero, or settings | Yes — unmute surfaces what happens *next*, never a backlog (D5) |
| Crew deleted under a member's feet | Their `crew_members` row cascades away; the crew leaves `/crews`. Their `user_events` attendance is untouched | `/crews` | No, and deliberately: "the nights you went stay in your Concerts" |

Every row is filled from a locked decision or a plan task. **No row required a new product
call**, which is the bar for starting PR-1.

## User journeys — walk script — REQUIRED

Five journeys. Each is walked forward, reversed, repeated, and resumed (Gate 5), and each is a
capture target for the mid-run cold-eyes review.

### J1 — Create a crew (the paid act)

Entry: `/crews`, as a **Supporter**.

1. Tap "Start a crew" → create sheet opens (bottom sheet on mobile, popover on desktop).
2. A `CrewPatch` preview is already rendered, seeded from a client-minted uuid (D2). Submit is
   disabled while the name is empty.
3. Tap "New patch" → a visibly different patch. Repeat three times; three different patches.
4. Type a name → submit enables. Confirm the patch **does not change** when the name changes.
5. Submit → land on crew home, patch identical to the preview. This is the whole point of D2;
   a patch that differs from the preview is a P1.

Reverse: delete the crew from crew home → back at `/crews`, empty state if it was the only one.
Repeat: create → delete → create again. The second crew must get a *different* patch.
Resume: reload mid-sheet → the sheet is gone and no crew was created. A half-filled sheet must
not leave an orphan row.

Also walk as **free tier**: step 1 opens the paywall gate, not the sheet. Read the four gate
strings and confirm none contains a hardcoded tier name or price. As **logged-out**, the same
tap routes to the tier picker, not the paywall.

### J2 — Invite and join

Entry: crew home → invite sheet, as a member.

1. Invite sheet shows a monospace link, spots-left, and an expiry line.
2. Copy the link. It must copy on the **first tap** — no `await` before `writeText` (#72).
3. In a second account, open the link → join page shows crew name, patch, member count, and
   **no attendance whatsoever**.
4. Join → land in the crew. Member count increments in both sessions.

Reverse: leave as the joiner → the crew leaves their `/crews`; the keeper's roster shrinks.
Repeat: tap the same link twice → the second tap is a **200 no-op**, not an error. Then
leave and re-join on the same live link.
Resume: reload the join page before joining → identical state. Mint a second link → the first
must be dead, because a crew has at most one live link.

Cannot be fully exercised locally: the **cap race** (12 concurrent joins). Walked as the PR-3
integration test instead, not by hand.

### J3 — The Browse lens

Entry: `/events`, as a member of a crew with upcoming shows.

1. Tap the lens pill in the title block. It is **not** in the filter bar and must not change the
   filter bar's shape.
2. Picker opens; "Everyone" reset row sits above one row per crew.
3. Select a crew → dismisses immediately, title becomes the crew name, location eyebrow is
   replaced by a dismissible rail, list filters to shows a member is going to.
4. Rows carry a crew chip reading "N going" — a **count**, never names.

Reverse: dismiss the rail → title, eyebrow and full list all restore.
Repeat: apply → clear → apply a *different* crew. The title must track the second crew.
Resume: reload with the lens active — decide and record whether the lens survives. If it lives
only in component state, say so in the artifact rather than discovering it on staging.
Edge: a crew with zero upcoming shows → `EmptyState state="filtered"`, never a blank list.

### J4 — Crew home and the destructive flows

Entry: `/crews` → a crew.

1. Hero: patch, name, member count, keeper label, muted chip when muted.
2. Three tabs with counts. Coming up leads when it has content, otherwise Been there.
3. Who's in: rows with handle or the letterless-dot treatment for a null handle.
4. As keeper, remove a member → confirm → roster shrinks.
5. As keeper with members present, leave → the server 409s and the handoff sheet opens. Hand
   off, then leave successfully.
6. Reroll: current versus candidate side by side, shuffle, explicit apply. It must **never**
   fire on a single tap — the reroll is crew-wide.

Reverse: cancel every confirm and every sheet; nothing mutates.
Repeat: rename twice and confirm `patchSalt` never moves. Reroll twice and confirm it increments
by exactly 1 each time.
Resume: reload after a handoff → the new keeper's controls are correct in **both** sessions.

### J5 — Crew notifications (PR-7)

Entry: two accounts in one crew.

1. Account B marks going on a show → account A's bell gains a `crew.going` row with a micro
   patch, unread pip, and a crew-name eyebrow.
2. Account B joins a second shared crew, then marks going → A gets **one** notification, not
   two. Dedupe across crews is the check.
3. A mutes the crew → B acts again → **no row is written at all** (D5, write-time suppression).
4. A unmutes → B acts → a row appears. Nothing backfills.
5. Confirm no `crew.*` category reaches the push pipeline. Bell-only.

Repeat: mute → unmute → mute. Resume: mark read on one device, check the second.
Empty state: a brand-new member with no crew activity yet — the state a real first user meets
first.

## Hard pause points — stop and ask, do not proceed

- **Any production database migration.** `0076_crews.sql` is additive and ships through the
  normal deploy, which needs no sign-off — but a hand-run `psql` against prod does.
- **Any proposal to make a crews route public.** Adding a `/crews(.*)` or `/crew/join(.*)`
  matcher pattern to either
  matcher reverses a resolved decision and re-opens #794's failure. Escalate; never decide it
  in-run.
- **Any proposal to move the `crews` entitlement cell.** Supporter was settled 2026-08-05 with
  reasoning attached. Ask before touching it.
- **Any hashing or reshaping of the invite token.** D3 explains why plaintext is forced. If the
  reasoning looks wrong, raise it rather than shipping a hash that breaks link re-display.

## Notify-and-proceed

- **`0076_crews.sql` reaching staging and prod through the normal deploy.** Validate first
  against a fresh local DB: `pnpm db:migrate` clean, and a re-run a no-op. Capture both outputs
  in the PR body. Additive `CREATE TABLE IF NOT EXISTS` against four tables that no shipped code
  reads yet cannot affect a live user.
- **Adding the three `crew.*` notification categories.** Validate that they are absent from
  `PUSH_ELIGIBLE_CATEGORIES` with the PR-1 Task 4 test before merge. A category nobody writes to
  is inert.
- **The fifth nav tab appearing for every beta member on PR-4.** Validate at 320px that all five
  labels render without truncation and every slot clears 44px. Capture the screenshot. Beta
  members finding a partly-built crews tab is the intended shape of a staged epic.

## Done means

- All seven PRs merged at the full Copilot bar, in plan order.
- Gates, scoped per the skill's table: Gate 1 after PR-2 and before PR-4; Gates 2, 3, 4 and the
  Defect Classes list on PR-4, PR-5 and PR-6; Gate 5 on all five journeys once PR-5 lands;
  **Gate 6 on PR-7's three triggers**; Gate 7 on PR-4, PR-5, PR-6 and PR-7. Each with a
  committed artifact recording the command run and the output seen.
- Mid-run cold-eyes review fired after **PR-5** — the first point J1, J2 and J4 are walkable
  end-to-end — with its triage closed in-run, not deferred.
- The final PR slot reserved for unscoped polish.
- `0076_crews.sql` applied cleanly to staging and prod, verified by reading the deploy logs.
- Staging validation on the real staging URL for J1–J5, not CI green.
- `releases.ts` entry above `v0.34.0-beta` and one ✅ Complete `progress.md` row, both on PR-7.
- Every crews route authenticated, verified by a middleware test that pins the **absence** of
  the `/crew/join(.*)` and `/crews(.*)` matcher patterns from both public matchers.
- Pickup memory `project_pickup_1226_concert_crews.md` updated after every merged PR.
- Final report produced by the `feature-run-report` skill.
