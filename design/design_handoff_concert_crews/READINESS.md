# Design Readiness Review — Concert Crews (#1226)

**Round reviewed:** R1 · **Date:** 2026-08-03 · **Verdict: 🟠 Orange — one Design round-trip, then Green**

Track 2 parity gate. Method: the prototype's logic was executed against
adversarial inputs and diffed against shipped code on `origin/main`, not read
from the README's prose.

The design thinking here is the strongest part of the handoff and none of it is
in question. Every §3 locked decision is honored, the tense split is coherent,
the patch system is genuinely a different object from `identity-art`, and the
§3a reconciliation with the CTA pass is correct. What blocks Green is a
**false premise under an approved product decision**, a set of **stale sibling
copies claimed as verbatim**, and **missing dialog semantics**. None of it is a
rethink; all of it is one round.

---

## 🔴 Blockers — Design must rule

### B1 · The bottom-nav decision was approved against a bar that doesn't ship

§2 item 10 states the bar is `browse · search · watching · crews · me` and calls
Crews "a fifth tab." The shipped bar is not that bar.

`origin/main:apps/web/src/components/consumer/definitions/copy.ts:717-732` —
`bottomNav.nav.tabs` holds **three** link tabs, and slot 4 is the account-menu
trigger, not a link:

| slot | shipped | handoff assumed |
| --- | --- | --- |
| 1 | `browse` → `/events` | browse |
| 2 | **`venues`** → `/venues` | — (dropped) |
| 3 | **`my shows`** → `/watching` (`matchPrefixes: ['/history']`) | `watching` |
| 4 | account menu trigger | `me` |
| — | — | **`search`** (does not exist) |

Three separate problems: the handoff **invents a `search` tab**, **drops
`venues`**, and **renames tab 3 to "watching"** — which is the locked-vocabulary
violation CLAUDE.md calls out by name (the tab-3 *container* is "My shows"
because it holds Watching *and* History; per #70). `crew-shared.jsx:196-198`
encodes the wrong bar in `CrewBottomNav`.

So the real question was never "should there be a fifth tab." It's **"what
happens to a 4-link + account bar at 320px when Crews joins it"** — which of
browse / venues / my shows / crews survives, or whether six slots is acceptable.
Hugh approved the fifth tab on the stated premise, so the approval doesn't carry
over; this goes back to Design with the real bar.

### B2 · Six files claimed "copied verbatim" are stale snapshots, and two carry regressions

§3 and §3a claim verbatim reuse and "zero shipped components changed." Diffs say
otherwise, and the direction is consistently wrong — upstream is *newer*:

| file | claimed | actual | consequence |
| --- | --- | --- | --- |
| `event-row.jsx` | shipped row + a **two-line** diff | **82 lines / 6 hunks** | ⚠️ The entire `PROVENANCE` constant is **deleted** (3 refs upstream, 0 here) and `buildMeta`'s provenance arm is replaced by an inline resale/community boolean. **The Box office chip no longer exists.** This contradicts the merged Event Row System contract that provenance keys off production's `source_category` enum — build from this copy and the price chip ships wrong. |
| `cc-overlay.jsx` | verbatim | 27 lines, all regressions | `trapRef` moved to the wrapper holding the scrim; the scrim became a focusable `aria-label="Close"` button; `clearTimeout` dropped from `close:` and `toggle:`. These are precisely the bugs the CTA handoff's own comments record as fixed. |
| `event-cta-v2.jsx` | rendered as-is | 24 lines, pre-R2 | `GOING_LABEL = "I'm going"`; shipped is `"I'm going!"` and copy.ts documents the exclamation as load-bearing. |
| `watcher-roster.jsx` | untouched | 12 lines, pre-fix | `extra={Math.max(0, total - 3)}` — the under-count the CTA review already corrected to `total - Math.min(list.length, 3)`. |
| `row-data.jsx` | verbatim | 11 lines | Fixtures rewritten to `source: "community"` / `"primary"`. **`community` is not a production `source_category` value.** |
| `cc-tip.jsx` | verbatim | 4–14 lines | Older Watching tip body. |
| `theme-context.jsx` | "the version carrying the two shadow tokens" | ✅ has them | but +1 dead line vs the CTA copy. Cosmetic. |
| `tweaks-panel.jsx` | verbatim | verbatim of *a* sibling, 39 lines from the two §3 cites | Cosmetic. |

Fix is mechanical: re-copy all six from their current upstream and re-apply only
the crew deltas. It is **not** a redesign — but it must happen before eng reads
these files, because eng is told to trust them.

**Independently corroborated.** Copilot's review of this PR flagged the
`cc-overlay.jsx` wrapper focus-trap and the missing `clearTimeout` on
`close:` / `toggle:` as live defects, without any knowledge of the upstream
comparison. Two reviewers reaching the same two bugs from opposite directions is
the strongest evidence that this copy is stale rather than deliberately forked.

A later round widened it: Copilot independently flagged the `watcher-roster.jsx`
`total - 3` under-count as well. All three findings are already fixed in
`design_handoff_event_detail_cta_tooltip/` — the upstream file carries the
corrected `total - Math.min(list.length, 3)`, the dialog-mounted `trapRef`, and
the `clearTimeout` in `close:`/`toggle:`, each with a comment explaining why.
So the B2 remedy needs no design work at all: the fixed versions exist today,
and re-copying the six files is a transcription job, not a decision.

### B3 · No crew overlay is a dialog

`SheetChrome` (`crew-shared.jsx:85`) and `ModalChrome` (`:96`) are bare `<div>`s
— no `role="dialog"`, no `aria-modal`, no focus trap, no Escape, no focus return.
All seven overlays inherit it: `CreateSheet`, `PremiumGate`, `InviteSheet`,
`RerollSheet`, `LeaveConfirm`, `CrewPickerSheet`, `CrewPickerPopover`.

The sharp part: **the correct primitives are sitting in the folder, unused.**
`cc-overlay.jsx` exports `useFocusTrap`, `useOverlayTrigger` and `CCOverlay` with
exactly the needed contract, and zero crew files reference any of them
(`grep` over `crew-*.jsx` returns nothing). This is the reimplement-instead-of-reuse
drift that file's own header warns about.

### B4 · No loading and no error states exist

Nine empty/edge states are designed and they're good. But there is **no skeleton
and no fetch-error state** for the crews list, crew home, or the browse lens —
not designed, not described in prose. `EmptyState` supports `state="error"` and
the only crew consumer of it is the dead invite link. Every one of these surfaces
is network-backed.

---

## 🟡 Should-fix — record in the plan PR, don't block

- **Jade collapses the chord space.** `theme-context.jsx:59,63` — Jade's
  `--signal` and `--success` are both `#1FFFC2`. Chord `c2` (signal·success) is
  therefore **degenerate** under Jade (the sigil's centre disc vanishes) and `c0`
  is indistinguishable from `c4`. ~20% of crews draw the broken one, and 300
  patches become 240 distinguishable. The "ship a tenth theme and the art needs
  no work" claim silently assumes token roles are pairwise distinct. Cheapest fix
  is to drop or re-pair the signal·success chord.
- **Desktop parity gap:** 9 of the 11 §6 sheets have no desktop board
  (`InviteSheet`, `RerollSheet`, all three `LeaveConfirm` variants), though
  `ModalChrome` supports `variant="desktop"`. 320px is covered for the four main
  surfaces but for **no sheet** — the 12-row roster inside `LeaveConfirm` at 320
  is the untested case.
- **Two unreached states:** member-removed and crew-deleted while you're viewing
  the crew. `confirm.removeCta` exists, so both are reachable.
- **Doc drift:** §8 claims "all nine" edge states; `EdgeBoard` renders **8**.
  `crew-art.jsx` says micro is 24–28px, README says 22–34px.
  `event-row.jsx:47` comment says price min `78→62`; the code says `56`.
- **`nextPatchSalt` fails open.** On scan exhaustion it returns `currentSalt + 1`,
  which may share 2–3 layers, silently. Probability is ~1.4e-28, so this is a
  log-don't-throw note, not a hazard.
- **No prop validation on `crewId`.** `""`, `null`, `undefined` and `0` all hash
  identically — every crew with a falsy id draws the same patch.

---

## ✅ Verified — claims that hold

These were tested, not taken on trust, and they hold:

- **300 patches, genuinely uniform.** Registries measure 5×4×5×3. 20,000
  synthetic crew ids reached **300/300 cells**; χ²=310.6 on df=299 (p≈0.33 —
  indistinguishable from uniform). No unreachable or hot cell.
- **The reroll guarantee holds exactly.** 500 crews × 100 consecutive rerolls =
  **50,000 transitions: zero unchanged weaves, zero cases sharing >1 layer.** The
  scan is hard-bounded at `currentSalt + 60` and the fallback fired 0 times.
  README's stated sequence `0, 1, 3, 5, 6, 8` reproduces **exactly**.
- **Token-only art.** Zero hex / `rgb()` / `hsl()` / named colours in
  `crew-art.jsx` or `crew-art-boards.jsx`. All 7 tokens exist in all 3 themes.
  Patch is `aria-hidden`, carries no `<text>`, and `micro` does drop weave and
  stitch. No `Math.random` / `Date.now` anywhere — fully deterministic.
- **Seed is `crew.id` + `patchSalt` only** — never membership, name or creator.
- **`following` is displaced, never removed.** `SURFACES.crewLens/.crew` carry
  `["crew","following","genre"]`, the crew arm is guarded on `show.crewGoing`,
  and the budget-2 slice means a show without crew presence falls back to
  Following exactly as Browse does. The correction Hugh asked for landed in
  **code**, not just prose.
- **`SocialRail` is genuinely gone** — `grep -r SocialRail` over the folder
  returns zero hits, spec row included. The lesson recorded in the last pass held.
- **The `CrewGoingLine` SR contract is real.** `crew-social-rail.jsx:161-176`
  builds the full named list unconditionally, counts handle-less members rather
  than inventing them, and `aria-hidden`s the truncated visual span. This is the
  #762 rule implemented, not described.
- **The two-box ladder does not oscillate.** The text span drives `level`; the
  row container drives `roomForFaces`. Row width cannot respond to the ladder, so
  the feedback loop is broken by construction — convergent, not damped.
- **Both claimed upstream bug fixes are real** and genuinely absent upstream.

---

## Fixed in this review (already applied)

- **`crew-social-rail.jsx:103` — rules-of-hooks violation.** `if (!going.length)
  return null;` sat **above eleven** `useRef`/`useState`/`useLayoutEffect` calls.
  Any crew line transitioning between empty and non-empty changes the hook count
  and throws. Guard moved below the hooks.
- **Five em-dashes in customer copy** (`copy-review` rule 4), all in
  `crew-copy.jsx`: `rerollHelp`, the Premium gate `body`, `revokedBody`,
  `crewOfOneBody`, `noPastBody`. Comments left alone — they don't render.
- **SSR hydration break in `crew-art.jsx`.** `clipPath` / `pattern` ids came from
  a module-scope mutable counter (`let __cp_uid = 0`), so server and client
  counters diverge and patches hydrate unclipped. Now `React.useId()`.
- **Three keyboard-unreachable controls given real semantics.** The per-crew mute
  was `role="switch"` on a `<span>` with no `tabIndex` (`crew-social-rail.jsx`);
  `CrewBottomNav`'s tabs were non-interactive `<div>`s (`crew-shared.jsx`). Both
  are now `<button>`s.
- **Two hardcoded a11y strings** lifted into `CREW_COPY.a11y` (`close`,
  `crewActivity`), against §11's own claim that no string is hardcoded in a
  screen.
- **`CrewBottomNav`'s fixture now carries a B1 warning comment** so eng can't
  read the wrong bar as the shipped one while the nav decision is open.

Copy is otherwise strong and the **locked vocabulary is clean**: zero `heart`,
zero `♥`/`❤` anywhere in the folder; no "Saved"/"Favorites"; no
"Dispute"/"Contest" in customer strings (the `contest.*` hits are the real push
namespace). `crew-copy.jsx:19` explicitly locks "Crew" against synonyms.
`confirm.lastOne*` is the best writing in the file.

---

## What eng is actually signing up for

The README's §7 lists `patchSalt` and the `crews` entitlement key as the net-new
schema. That is **one column of roughly four tables**. `git grep -il crew` across
`packages/db` on `origin/main` returns **zero** schema hits. The real surface:

- **`crews`** — `id` (⚠️ client-minted per §1, a deliberate divergence from every
  other table's `uuid().defaultRandom()`), `name`, `createdBy`, `patchSalt` int
  default 0, timestamps
- **`crew_members`** — `(crewId, userId)` unique, `joinedAt`, index on `userId`;
  12-cap enforced in-app
- **`crew_invites`** — `token` unique, `expiresAt` (7d), `revokedAt`, `createdBy`
- **per-crew mute** — the existing
  `packages/db/src/schema/user-notification-preferences.ts` is a singleton row per
  user and cannot hold this. A `mutedAt` on `crew_members` is the KISS answer.
- Roles are implicit (`createdBy` = creator); no role column needed.

Assumptions that **hold** and eng can rely on:

- **`attendingAt` is the right signal.** `packages/db/src/schema/social.ts:60`,
  with a partial index on `(user_id, attending_at) WHERE attending_at IS NOT NULL`.
  Both tense rules are plain aggregates. ⚠️ Eng must **not** filter on
  `status='going'` — `apps/api/src/routes/attending.contract.integration.test.ts`
  guards that no shipped writer produces it.
- **Entitlements vocabulary is real.** `EntitlementCell` really is
  `visible-active | paywall-on-tap | tier-picker-on-tap | hidden`, and `founder`
  / `gifted` are real plans. Edit `PremiumFeature`, `PREMIUM_FEATURES`,
  `ENTITLEMENTS_MATRIX` and the test table in lockstep. **Gap:** the README
  doesn't state the **logged-out** cell, and the matrix requires all six — the
  invite landing is signed-out-reachable, so Design should confirm
  `tier-picker-on-tap`.
- **Push exclusion works as described but by a different mechanism.**
  `packages/push/src/notification-categories.ts` — the allowlist is a closed Zod
  enum; exclusion is *omission from* `PUSH_ELIGIBLE_CATEGORIES`, not a deny-list.
  `contest.*` is a real precedent. The duplicated
  `apps/web/src/lib/notifications.ts:25` must be updated too.
- **Copy target** is a new
  `apps/web/src/components/consumer/crews/definitions/copy.ts`, per the
  per-component-folder convention — not a `crews` key on the shared file. Nav
  copy is the exception and belongs in `CONSUMER_COPY.bottomNav.nav.tabs`.

**One launch-gate question.** The invite URL is
`concertcrawl.app/crew/join/<token>` (`crew-invite.jsx:156`). That prefix is in
neither `isAlwaysPublic` nor `isPublicOnceLaunched` in
`apps/web/src/middleware.ts`, so **today it redirects to sign-in and the
acquisition pitch never renders**. Precedent (`/e/`, `/share/`) puts it in
`isPublicOnceLaunched` — which means pre-launch the invite landing is unreachable
signed-out, contradicting §3.7. Needs Hugh's call, plus a negative case in
`middleware.test.ts`.

---

## Owed upstream (not this feature's problem, but this folder found them)

1. → `design_handoff_event_row_system/event-row.jsx`: the `WhenWhere` bounded
   dependency array + ResizeObserver width guard, and the `MetaRow` `lastW` guard
   + functional `setFit`. Verified present here, absent there. The fix is correct
   — every value the effect reads is in the deps, and `level` is included so the
   ladder still climbs.
2. → `design_handoff_phase7_5_identity_imagery/identity-art.jsx:218`: per-scale
   halftone cells (`16 / 40 / 64`). **Twelve other handoffs carry the stale copy**
   and every one of them that renders event rows is paying for it.
3. Standing: `design-canvas.jsx` mounts every artboard eagerly. Hugh has
   deferred this — revisit only if eng assessment trips over it.

---

## Path to Green

One Design round (R2), scoped to exactly this:

1. Re-decide the bottom nav against the **real** three-link + account bar (B1).
2. Re-copy the six stale siblings and re-apply the crew deltas (B2) — mechanical.
3. Route the seven overlays through `cc-overlay.jsx`'s shipped primitives (B3).
4. Add loading + error states for the three network-backed surfaces (B4).
5. Confirm the logged-out entitlement cell, and Hugh's call on the invite-route
   launch gate.

Nothing above touches a locked §3 decision, the patch system, the tense split, or
the §3a reconciliation. Those are done and they're right.
