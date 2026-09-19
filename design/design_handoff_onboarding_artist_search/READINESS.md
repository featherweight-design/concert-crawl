# Readiness Review — Onboarding · artist search escape hatch (R1)

**Verdict:** 🟡 Yellow — build direction 1 as specified, with the seven corrections below applied first. Nothing here needs a design round; one item (§4's error-state secondary action) is an open design ruling the handoff itself scopes to R2 and explicitly does not block.
**Audited:** 2026-09-19
**Auditor:** Claude (Readiness Review)
**Bundle:** `design/design_handoff_onboarding_artist_search/` — `README.md`, `CLAUDE_CODE_PROMPT.md`, canvas + 4 JSX sources
**Companion:** `design_handoff_onboarding/README.md` §0 (sequencing + tier states), written the same day

## Summary

The design is sound and the reasoning is unusually well evidenced: the three rejected directions are each rejected on a cost that is real in this codebase, not on taste. Two of those costs were checked against shipped code and hold exactly as stated — `/search`'s artist row carries `FollowButton`, which writes on tap, so direction 2 really would put two commit models over one selection; and the suggestion query really is genre-filtered, so direction 3 really does strand a visitor whose band is outside their picked genres.

What the bundle gets wrong is **which defects are live**. Several statements describe the design prototypes (`nf-cold-start.jsx`, `nf-desktop.jsx`) rather than the shipped app, and two of them are listed as "live defects, fix while you're in here". They are not live. The shipped step derives its counter and its dots from one array and renders its escape hatch at both widths. Building from the prompt as written would produce two no-op tasks and one "add the missing desktop control" task against a control that is already there.

One genuine gap the bundle does not name: **the search endpoint cannot supply the row's date line.**

## What was verified against shipped code

| Claim | Verdict |
|---|---|
| `/search` rows write on tap, conflicting with the step's batched commit | ✅ `ArtistResultRow.tsx` renders the shared `FollowButton` |
| The suggestion grid is genre-filtered, so an out-of-genre artist is unreachable in the tour | ✅ `useOnboardingSuggestions` passes the picked genres to `/v1/artists/suggestions` |
| The selection survives in `sessionStorage` and nothing on screen says so | ✅ `readPicks`/`writePicks` in `OnboardingShell.tsx`; no strip, no count outside the rail |
| The locked rail fires, opens the tier picker, and replays the picks after upgrade | ✅ `use-artist-picks-commit.ts` — 403 → `pickerOpen`, `closePicker` re-reads the plan and re-runs the commit |
| A locked row still selects; the gate is on the commit | ✅ tiles toggle regardless of entitlement; only the rail label changes |
| Search results include artists with no upcoming date, and every result is followable | ✅ `/v1/search` gates on "at least one non-hidden event", past or upcoming, and returns `upcomingShowCount` which may be 0 |
| Trigger copy is `Search for someone specific` | ✅ `ARTIST_PICKER_COPY.searchEscape` |

## Corrections to apply before building

1. **Work item 8 is a no-op — strike it.** "Step 7's eyebrow reads `Step 5 of 6` while `NFDots` renders 8 dots" and "`FollowStepDesktop` passes `total={6} index={4}`" are prototype defects. The shipped shell derives both from one `FLOW` array of eight (`OnboardingShell.tsx`), and the step reads `Step 7 of 8` on screen today. The corrected artboards are still the right reference; there is nothing to fix in the app.

2. **Work item 7 overstates the desktop gap.** "`FollowStepDesktop` has no search control at all; the escape hatch is mobile-only" is true of the prototype and false of the app: `OnboardingShell` renders the same `StepContent` in both trees, differing only in column count, and `ArtistPicker` renders the `/search` link unconditionally. What is true is that desktop draws the *same full-width dashed strip* as mobile, so the design's recommendation — a field-shaped control in the header — remains a real change. Rewrite the task as "change the desktop treatment", not "add a missing control". It shrinks the build, and it prevents a search for a component that is not missing.

3. **The result row's date line has no data behind it.** `OASRow` draws `next` as `Hi-Dive · Oct 24`. `/v1/search`'s artist results carry `{ name, slug, photoUrl, upcomingShowCount, following }` — no next-show date and no venue. The suggestions endpoint has `nextShow`; the search endpoint does not. "Query the same index `/search` queries. Do not build a second search endpoint" is right, but honouring it means **extending that endpoint's artist payload with a next show**, which is API work the prompt does not mention. Until it lands, a row can only say "N upcoming" or "No dates announced" — and the second half of the index contract ("played Denver before, nothing upcoming … carries a meta line") is the *only* half currently renderable.

4. **`SIGNAL LOST` is presented as a lock that does not exist.** "The locked error status word … do not coin a new one" appears in this bundle and nowhere else — not in any other handoff, and not in `apps/web/src`. The shipped `EmptyState` (`consumer/empty-state/EmptyState.tsx`) takes a caller-supplied `eyebrow` and derives its rail label from `state` (`err` when `state="error"`); there is no locked vocabulary anywhere in it. Either the word comes from a handoff this audit could not find, or it is new copy — in which case it is a copy-writer call under the `copy-review` skill, not a design lock. Ask Design which; do not ship it as locked on the strength of the sentence.

5. **Point the field geometry at the shipped component, not the prototype.** "Match `SearchBarSM` geometry (44 min-height, radius 11)" names a JSX component in `design_handoff_phase5b_screens/`. The shipped `SearchBar.tsx` uses radius 10 and 12. The stated intent — "the field inside the tour is the same object as the one on `/search`" — is right, and following the instruction literally would defeat it. Match `SearchBar.tsx`.

6. **The error state is a component swap, and worth naming as one.** Step 7 currently renders a local `Notice`, not `EmptyState`. Adopting the Hybrid anatomy means routing that state through `EmptyState` — whose existing API (`eyebrow`, `title`, `body`, `state="error"`, `primaryCta`, `secondaryCta`) already fits E1 and E2 without extension. Low cost, but it is not "restyle the Notice".

7. **Several "reuse" targets are prototype names with no shipped referent.** `BulkFollowSheet`'s row — the grammar the result row is meant to inherit — does not exist in the app; the nearest shipped equivalent is `ArtistPickTile` (`role="checkbox"`, full-tile target, check glyph + border + fill), which is the same grammar in tile form. `nfLocked` is `useEntitlement('following')`, `NFDots` is `ProgressDots`, `CCMark` is `components/brand/cc-cluster-mark`. Normal handoff drift, but the row is the one place the prompt leans on a named component for its interaction contract, so it needs a real referent before someone invents a second one.

## Ruled 2026-09-19 — R2 is closed, build all of it

**The grid error state: retry only.** Not E1, not E2. Design's objection to E2 holds — search beside retry reads as "we don't think it'll work" — but E1's secondary duplicates two affordances already on screen in that state: the Skip rail above the grid, and the rail's own `Continue without following →`, which renders at zero picks by design. A third way out, stated a third time, is noise in an error state. Retry is a real button with a pending state, never a spinner-only control. The rest of the anatomy stands, subject to the `SIGNAL LOST` question in correction 4.

Note for the record: half of Design's case against E2 was that it is "wrong under direction 3, shaky under 2". With direction 1 chosen, search no longer exits the tour, so that half lapses. Retry-only is a narrower answer than either candidate rather than a rejection of the reasoning behind them.

**The Stripe return: eng scope, no design ticket.** Checkout is embedded — `confirmPayment` with `redirect: 'if_required'`, and the 3DS/SCA challenge is Stripe's own overlay inside the sheet (`CheckoutPanel.tsx`). The common path never leaves the page: the sheet closes, `closePicker` re-reads the plan, the held picks commit for real, and the tour advances to the send-off. Nothing is lost and nothing is silently dropped; the rail the reader pressed already said `Follow N artists with Premium`. A confirmation screen would serve a reader who, after launch, let a trial lapse, returned to the tour from the account menu, picked artists and paid mid-tour. That is thin enough not to draw.

**One real defect found while ruling it, and it is ours.** `confirmPayment` passes `return_url: window.location.href`. Card payments confirm in place, but a redirect-based method in the Payment Element does leave and come back — and `/onboarding` mounts at `index = 0`. The picks are restored from `sessionStorage`; **the step index is not**. That visitor returns to step 1 holding their selection, six steps from the rail they were about to fire. Fix it in this build: persist the index in the same mirror the picks already use, restored in the same effect. It is the same class of defect as the sequencing bug this step just came out of, and no mock would have shown it.

## Decisions inherited — respect these

- One commit affordance on screen, ever: the rail. No `Done`, no `Apply`.
- Nothing is written until the rail fires. Picks are **selected** during the step, **followed** only at commit. Never "saved".
- Do not render `FollowButton` anywhere on step 7.
- Do not hide the picker from free users.
- Following stays all-or-nothing Premium (ruled 2026-09-19); quantity-gating is a post-launch question.
- No route change and no history entry on the mode swap; back returns to `grid` and returns focus to the trigger.
- Mobile 402 + 320 and desktop ship together; 320 is the baseline.
- Token-only colour; `--signal` for CTA and selection, `--accent` reserved for brand and Watching.
- All copy in the bundle is placeholder and goes through `copy-review` before build.
