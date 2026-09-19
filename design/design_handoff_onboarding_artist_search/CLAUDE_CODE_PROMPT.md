# Claude Code prompt — Onboarding step 7 · artist search escape hatch

Implement the in-tour artist search on onboarding step 7. Design handoff: `design_handoff_onboarding_artist_search/` (open `Onboarding Artist Search.html`, read `README.md` first).

> **Copy is placeholder.** Every user-facing string in the mocks is a structural stand-in. Build the structure; the copy-writer supplies the strings. Do not ship the mock copy.

**This is one control on one existing step.** Nothing about the suggestion grid, the tiles, the commit rail or the step copy changes. Do not rebuild `FollowStepArtists` — modify it.

**Status:** direction approved (Sep 19, 2026). One item is still open and is called out in §Open below — it does not block the rest.

---

## The change in one line

`FollowStepArtists` ends its grid with a dashed link to `/search`. Replace the navigation with a **mode swap on the same step**.

Today it walks the visitor out of the tour: the progress strip, the Skip rail and the commit CTA all disappear, `/search` has no idea anyone is mid-onboarding, and the only route back is browser-back. The selection survives in `sessionStorage` and nothing on screen says so.

The defect is precise: **it leaves a committing flow holding an uncommitted selection.** The step batches one write at the rail; on `/search` there is no rail.

---

## Contract

### Mode swap, not a route and not an overlay

Step 7 gains one piece of local state: `mode: "grid" | "search"`.

| | `grid` | `search` |
|---|---|---|
| Progress dots | rendered | **rendered, unchanged** |
| Skip | rendered | **rendered, unchanged** |
| Header block (eyebrow · headline · lede) | rendered | **replaced by the search field, same vertical box** |
| Body region | suggestion grid | result list |
| Commit rail | rendered, live | **rendered, live, same counter** |
| Picked strip | absent | pinned above the rail |

**The rail is the single commit in both modes.** A row tapped in search increments the same counter the tiles feed — while searching, the rail still reads `Follow 5 artists →`. There is no second commit, no "Done", no "Apply". If you find yourself adding one, the mode swap has become an overlay and the implementation is wrong.

**No route change, no history entry.** Back/escape returns to `grid`; browser-back leaves onboarding, exactly as it does from the grid today.

**The header block and the field occupy the same box height**, so nothing below moves when the mode flips.

### The result row is a checkbox, not a Follow button

`/search`'s artist row carries `FollowButton`, which **writes on tap**. Inside the tour nothing is written until the rail commits, so a result must speak the grid's language: **the whole row is the checkbox**, exactly as the tile is.

That grammar already exists — reuse `BulkFollowSheet`'s row (`nf-cold-start.jsx`). 26px check square trailing, `role="checkbox"` + `aria-checked`, full-row target ≥44px, selection is **check glyph + border + fill**, never colour alone.

**Do not render `FollowButton` anywhere on step 7.** Mixing the two commit models on one selection is the bug this design exists to prevent.

### The picked strip

The live control's worst behaviour is that the selection survives in `sessionStorage` and **nothing on screen says so**. Fix it structurally: a read-only strip above the rail, `Picked · N` plus up to six overlapping 26px tiles.

Read-only. Tapping a face is **not** an unfollow — unpicking happens on the tile or the row. Renders in `search` mode; absent in `grid` (the grid shows its own selection).

### States

| State | Trigger | Body |
|---|---|---|
| `rest` | mode entered, no query | Prompt + one line explaining the index. **Not an empty state** — field focused, no recent-searches list (there is no history this early). |
| `typing` | query in flight | **Skeleton rows**, not a spinner, so the count landing doesn't jump the layout. |
| `results` | ≥1 hit | Rows. Already-picked rows render selected. |
| `none` | 0 hits | Message + **`Back to suggestions`** as the only action. **Never offers `/search`** — that reintroduces the exit this work closes. |

### Index contract

Artists are a projection off event billing strings: the index holds only artists a crawl found on a Denver bill. Two consequences to honour:

- **Every result is followable by construction.** There is no "can't follow" row and no disabled state.
- **"Played Denver before, nothing upcoming" is real, common, and the clearest case for following.** It carries a muted `NoDatesLine` meta line — never an inert row.

Query the same index `/search` queries. Do not build a second search endpoint for the tour.

---

## Work

1. **`mode` state on `FollowStepArtists`** + the header/body swap. Mobile and desktop from the same state.
2. **The trigger.** Replace the dashed-border link with a **field-shaped control** — it looks like the thing it opens, which is the cheapest way to say "this stays inside the step". Position: **under the grid on mobile** (where it is today), **in the header beside the headline on desktop** (under a five-column grid a full-width strip reads as a sixth, empty row).
3. **Search field** — match `SearchBarSM` geometry from `search-mobile.jsx` (44 min-height, radius 11, `--surface-1` on `--border-strong`), so the field inside the tour is the same object as the one on `/search`.
4. **Result rows** per the contract above, reusing `BulkFollowSheet`'s row.
5. **Picked strip.**
6. **The four states.** Debounce the query; `typing` must not flash for cached results.
7. **Desktop — required, and it does not exist today.** `FollowStepDesktop` (`nf-desktop.jsx`) has **no search control at all**; the escape hatch is mobile-only. Add it. Same mode swap, same rail, same rows.
8. **Two live defects, fix while you're in here:**
   - Step 7's eyebrow renders `Step 5 of 6` while `NFDots` renders 8 dots. **The dots are right** — the flow is `welcome · how · today · theme · notyet · genres · artists · done`. The string was never updated.
   - `FollowStepDesktop` passes `NFDots total={6} index={4}` — the same miscount.
9. **The grid's error state** (`That list didn't load`) — see §Open.

---

## Tier behaviour — inherited, not redefined

Following is **all-or-nothing Premium**; gate through `nfLocked(tier) = free || supporter`. Never test `tier === "free"` inline.

Search inherits step 7's existing behaviour unchanged: **a locked row still selects.** The gate is on the commit, not on the picking.

The locked rail is **not a dead end** — it fires, the 403 opens the tier picker, and **the selection is held across the Stripe round-trip and replayed on return**. The sub-line is a real promise. Do not render the rail `disabled`.

Nobody is locked today: new accounts get a card-less 14-day Premium trial, beta testers a lifetime comp at code redemption. The locked state serves post-trial free users and supporters. **Do not hide the picker from free users** — it would hide a working step from trial users, who are nearly everyone who will see it.

Full note: `design_handoff_onboarding/README.md` §0.

---

## Sequencing — read before wiring

The tour runs **after** Clerk sign-up as of Sep 15, 2026 (`invite code → sign-up → tour`), because step 7 reads its suggestions as the signed-in reader and commits its follows as them. With no session it threw on every load. `/auth/complete` routes new accounts into the tour with their destination attached.

`design_handoff_onboarding/README.md` still carries pre-move statements in its later sections; §0 of that file lists which are superseded. Don't build from them.

---

## Non-negotiable

- **Mobile (402 + 320) and desktop ship together.** The tour renders both trees. 320 is the baseline.
- **One commit affordance on screen, ever.** The rail.
- **Nothing is written until the rail fires.** Vocabulary follows: picks are **selected** during the step, **followed** only at commit. Never "saved".
- **Token-only colour** — `var(--*)` from `theme-context.jsx`. No raw hex in screen code. `--signal` = CTA + selection; `--accent` stays reserved for brand presence and Watching.
- Use `CCMark` from `browse-home.jsx` for the logo. Never a placeholder monogram.
- Reuse `IdentityArt` (Phase 7.5) for all artist art.

## A11y

- Rows are `role="checkbox"` + `aria-checked` inside a labelled group — the same contract as the tiles.
- **The mode swap moves focus to the field and announces** "Searching artists, step 7 of 8". The step must never change silently under a screen reader.
- **Back returns focus to the trigger**, not to the top of the grid.
- Result count is `role="status"` so it announces as the query narrows. The rail's count lives in the button text, so it announces too.
- The error block is `role="alert"` and takes focus on appear.
- The rail stays rendered at zero picks (`Continue without following →`), so a keyboard user can always leave forward.

---

## Open — needs a design ruling (R2), does not block the above

**The grid's error state, `That list didn't load`.** Today the search trigger is the only thing it offers, which is a weak answer even now that the trigger stays: "search for them by name" does not answer "we couldn't load ten suggestions" — the visitor has no name in mind, which is why they were on a suggestion grid.

Two candidates, both drawn at both widths in canvas §5:

- **E1 — retry primary, `Skip this step` secondary.** Current lean. The primary action for a failed load is to load it again; offering search alongside retry reads as "we don't think it'll work". Search stays reachable via the header trigger, which is present in this state anyway.
- **E2 — retry primary, `Search by name` secondary.**

**Either way, build the retry** — it is in both. Retry is a real button with a pending state, never a spinner-only control. The secondary action is the open item.

Anatomy is fixed regardless: Hybrid empty-state (mono status word · short headline · one informative line · a real action), status word **`SIGNAL LOST`**. Do not coin a new one.

> Note for context: this state was the *default* experience for every tester before the sequencing move, because the step had no session to read with. It is a genuine error state again — which raises the stakes on getting its offer right, not lowers them.

## Also unmocked — flagged, not owned here

**The Stripe return.** The locked rail fires → tier picker → payment → back to step 7 with the picks replayed. That final screen exists in behaviour and in no mock. It is the moment "nothing gets lost" is kept visibly or kept silently, and silent is the same defect as the `sessionStorage` silence this work fixes. Sits between this handoff and `design_handoff_monetization_lifecycle/`.
