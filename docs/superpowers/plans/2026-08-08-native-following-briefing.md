# Epic Run Briefing — Native artist following

Feature-specific facts for the `epic-run` of native following. Run mechanics live in the
skill, not here. Authored 2026-08-08 from the merged eng spec and execution plan rather than
from an interview, because Hugh was away when the run started; every claim below is
traceable to one of those two documents or to a command run on this date.

## Source of truth (read in this order)

1. `docs/superpowers/plans/2026-08-08-native-following.md` — master sequencing: 11 PRs,
   gates, file structure. Follow its order exactly.
2. `docs/superpowers/specs/2026-08-08-native-following-eng-spec.md` — scope, data model,
   API contracts, and the three premise answers this briefing restates.
3. `design/design_handoff_native_following/` — visual ground truth. Pixel-perfect is the bar.
   `README.md` first, then the `nf-*.jsx` prototypes.
4. `docs/superpowers/design-tables/native-following.md` — the Gate 4 Agent 1 enumeration,
   112 requirements across 14 surfaces. Pass it into every build subagent's prompt.

Related shipped work worth reading before touching its seams: `#763` Spotify sync (the
follow rows this epic generalizes), `#737` in-app notifications (the delivery this epic
writes into), `#1115` artist page (the surface that already carries a follow button).

## Current state (verified 2026-08-08)

- **`following` entitlement is already shipped** — `packages/entitlements/src/index.ts:84`
  maps `logged-out: 'tier-picker-on-tap'`, `free`/`supporter`: `'paywall-on-tap'`,
  `premium`/`founder`/`gifted`: `'visible-active'`. This is the whole of the four access
  states. Derive lock state through `canUseFeature`, never by enumerating tiers.
- **Latest migration is `0077_artist_new_show_category.sql`.** The plan's `0078` is correct,
  and its `when` must exceed `1786838400000`.
- **`user_notification_preferences` exists** (`packages/db/src/schema/user-notification-preferences.ts`)
  and creates rows lazily, so the backfill must be `INSERT … ON CONFLICT DO UPDATE`.
- **`user_artist_follows` exists** (`packages/db/src/schema/social.ts:84`) with a `source`
  column. Spotify writes `'spotify'`; the shipped manual Follow button writes `'manual'`.
  This epic's queries match every row regardless of `source`.
- **`NATIVE_DIGEST_ENABLED` does not exist yet.** PR 9 introduces it, defaulting off in both
  environments. Hugh flips it.
- **The weekly digest cron is Monday, not Friday** — `concert-crawl-spotify-weekly`,
  `30 15 * * 1` (`render.yaml:88` and `:266`). Two prototype strings say "Friday morning"
  (`nf-notify.jsx:88`, `nf-following.jsx:327`); correct them to Monday when that copy is
  implemented. This epic does not change the cadence.
- **There is no artist index route.** `apps/web/src/app/(protected)/(main)/artists/` holds
  only `[slug]`. Every "browse all artists" affordance points at `/search`. Do not add an
  index; do not drop the affordance.
- **`E2E_AUDIT_USER_*` / `E2E_AUDIT_ADMIN_*` are not placed**, so `audit:sweep` cannot run.
  The mid-run cold-eyes capture falls back to driving local dev with Playwright screenshots.
  Say so in the run report rather than skipping the capture.
- **Known anomaly to ignore:** the handoff carries no `READINESS.md`. That convention binds
  handoffs merged before 2026-06-23; this one is from 2026-08 and went through an R3 audit
  plus three correction passes, whose findings are already folded into the merged spec.

### Handoff facts that survived the audit and are easy to get wrong

Ten corrections were applied to the handoff and spec before this run. Honour all of them:

1. Use the `nfLocked(state)` helper. Never an inline tier test.
2. Four access states, and no `disabled` among them.
3. There is no `unavailable` follow state.
4. Keep the artist page's `hasShows` guard; thread `followState` into `EmptyUpcoming`.
5. `StickyBar` takes `state`, not a boolean.
6. `aria-describedby` points at an sr-only gate sentence styled with clip.
7. `aria-pressed` drops only for the locked and signed-out states; a pending follow keeps it.
8. The follower count is cut. Nothing renders it.
9. `NF_FOLLOW_SIZES` — sm 36 / md 44 / full 48 — is ground truth over any prototype pixel.
10. `RowMetaChip`'s Spotify logo is conditional on `followSource`.

Do not fork the byte-identical infra files shared across handoffs: `theme-context.jsx`,
`supporting-line.jsx`, `tweaks-panel.jsx`.

## Risk shape

**Mixed: copy/IA-driven, with an event-driven tail.**

Nine of the eleven PRs move strings, chips and empty states around surfaces that already
exist, so most bugs will be a chip that renders at zero follows, an empty state that says
what the header above it already said, or a locked affordance whose gate sentence never
reaches a screen reader. Gates 3, 4 and 7 carry the weight there, and the mid-run cold-eyes
review is the highest-yield hour in the run.

The tail is PR 9. Alerts and the digest create records in response to a crawl discovering a
show, which is the failure shape that reports nothing when it silently never fires. Gate 6
is mandatory on that PR: prove the fan-out fires, fires exactly once for a batch, and fires
for the right audience from a second account.

## Launch gating

**Nothing in this epic makes a new vertical publicly reachable.** Every surface is inside
`(protected)`, and the two public-adjacent ones — the artist page and search — already ship
follow affordances today. Signed-out users see the tier-picker state, which is the shipped
behaviour for every gated feature.

The one real gate is the **digest**, in PR 9, behind `NATIVE_DIGEST_ENABLED` defaulting off
in staging and prod. It must not send from the new query until migration `0078` has been
live in prod through one weekly cycle. Hugh flips the flag.

A second, quieter ordering constraint: **notification settings rows must not ship before the
delivery that reads them**, or the toggles are decorative. `#737` has landed, so this is
satisfied — but it is why PR 2 (settings) precedes PR 9 (fan-out) only in file terms, and
why the alerts row renders its locked card rather than a live toggle for unentitled users.

`releases.ts` entries: PR 9's digest line is held back until the flag opens. Every other
user-facing PR lands its entry on its own branch as normal.

## Off-happy-path homes

| New state | Where it lives in the IA | How the user reaches it | Reversible? |
|---|---|---|---|
| Follows nobody, free/supporter | Browse starter shelf, My shows ▸ Artists empty state, onboarding step 7 with a locked commit | Browse tab, or My shows ▸ Artists | n/a — it is the zero state |
| Follows nobody, premium | Same surfaces, unlocked | Same | n/a |
| Follows an artist with no upcoming Denver date | My shows ▸ Artists, "Nothing on the books" group, muted and alphabetical | My shows ▸ Artists | Yes, unfollow |
| Follows someone, then downgrades to free | **Follows retained.** Artists tab still renders; alerts row shows the locked card; scope chip locks | My shows ▸ Artists | Yes — unfollow stays available, because DELETE is unentitled by design |
| Followed via Spotify, then disconnects Spotify | Spotify-sourced rows persist; preferences now come from `user_notification_preferences` | My shows ▸ Artists | Yes |
| Selected artists in onboarding, then hit the paywall | Picks held in component state **and** `sessionStorage`; commit retried after checkout closes | Returns automatically on paywall dismiss | Yes — deselect |
| Zero-follow user who wants the starter shelf gone | No dismiss affordance exists. The shelf is the slot's zero mode, not a promo | n/a | n/a |

**Downgrading never deletes follows.** This is the row that has bitten before; it is settled.

## User journeys — walk script

The numbered script the run walks itself at Gate 5 and the cold-eyes capture, and that Hugh
walks afterwards. Reproduced from eng spec §3.3 so this file stands alone.

1. Sign up as a new free user. Walk onboarding to step 6, pick three genres, continue.
2. Step 7: select four suggested artists. Tap commit. Expect the paywall.
3. Dismiss the paywall without upgrading. Expect the four picks still selected.
4. Skip to `done`. Land on browse. Expect the starter shelf, and **no** "My artists" chip
   (absent at zero follows).
5. Upgrade to Premium from Settings.
6. Search an artist by name. Follow from the results row.
7. Browse: expect the "My artists" chip now present and off, and the shelf flipped from
   starter to your-artists.
8. Activate the chip. Expect a `role="status"` count line and a filtered list.
9. Open an event with a multi-act bill. Use "Follow all N". Expect one write and N rows
   flipping.
10. Watch that show. Expect the first-watch nudge, artist-anchored, once.
11. My shows ▸ Artists: expect all follows, split upcoming vs no-dates, with the alerts row.
12. Tap the alerts row → Settings ▸ Notifications. Toggle "Add them to Watching for me" on.
13. Trigger a crawl that discovers two new events for followed artists. Expect **one** push,
    tray rows for both, and both auto-watched.
14. Unfollow one artist from the Artists tab. Re-follow. Expect the state genuinely clean,
    not hollow.
15. Downgrade to free. Expect follows retained, chip locked, alerts card locked.

**Reverse pass:** unfollow from every surface that can follow — artist page, search row,
bill block, My shows ▸ Artists, browse shelf. Each must return the affordance to its
pre-follow state, and the artist must leave the Artists tab and the scope-chip result set.

**Repeat pass:** steps 9–10 and 14 are the keyed-state traps. The first-watch nudge must key
off something that dies when the follow dies, so unfollow → re-follow → watch shows the nudge
again. The onboarding `sessionStorage` key must die when onboarding completes.

**Resume pass:** reload at step 2 (mid-onboarding, picks pending), at step 8 (scope chip
active — the filter must survive as a URL param, not component state), and open My shows in
a second session while a follow is in flight in the first.

**Cannot be walked on local dev:** step 13. The crawl fan-out needs real discovery, so it is
walked on staging before the epic is called done. Steps 5 and 15 need a real checkout and are
walked on staging too.

## Hard pause points

- **Prod migration `0078` is applied by the deploy, not by hand.** Do not run psql against
  prod. If the backfill needs a manual correction, stop and ask.
- **Do not flip `NATIVE_DIGEST_ENABLED` on.** PR 9 ships it off. Hugh opens it after one
  weekly cycle.
- **Do not file GitHub issues.** Both backlog ceilings are breached. Every follow-up goes
  under **Proposed intake** in the run report instead.
- **Do not answer a product question by building one answer.** The two live ambiguities —
  how starter-shelf suggestions rank now that follower counts are cut, and whether a manual
  follow should feed the taste filter (`#1306`) — go to the report, not into code.

## Notify-and-proceed

- **Migration `0078` on staging.** Verify the `ON CONFLICT DO UPDATE` backfill against
  staging data before merging PR 1, capture the row counts before and after, and proceed.
  There is no destructive step and no active customer on the new columns.
- **The mid-run cold-eyes review.** Post the findings and the screenshot path to Hugh, then
  keep building. Never schedule a wakeup to wait for a reply.
- **Copy corrections inside the handoff's own strings.** The handoff's words are a
  copy-writer call, not a Design lock. Fix "Friday morning" and anything Gate 7 flags in
  place; do not open a Design round over wording.

## Done means

- All 11 PRs merged at the full Copilot bar, each with its staging deploy verified to have
  actually run.
- Gate artifacts committed: `docs/superpowers/state-coverage-native-following.md`,
  `docs/superpowers/journey-lifecycle-native-following.md`,
  `docs/superpowers/side-effects-native-following.md`, and the design table above.
- Gate 6 evidence for PR 9: fan-out fires, fires once for a two-event batch, and does not
  reach a second account that follows nobody.
- The walk script above run forward, reverse, repeat and resume, with steps 5, 13 and 15
  walked on staging.
- `NATIVE_DIGEST_ENABLED` present in both environments, off, and named in PR 9's body with
  the flip instructions.
- `releases.ts` and `progress.md` carrying entries for the substantive PRs; the digest entry
  held until the flag opens.
- A run report in the `feature-run-report` ☀️ shape, carrying the Proposed intake list.
