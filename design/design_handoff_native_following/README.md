# Native Artist Following — design handoff

> ⚠️ **All copy in this handoff is placeholder.** Every user-facing string is a structural stand-in — it sizes the layout and proves the state machine, it is not shipping copy. Headlines, body, button labels, empty-state voice, push copy, digest subject lines and the Premium benefit wording all need a pass from the **copy-writer** before build. The two things that ARE design decisions and should survive the rewrite: the vocabulary (Watching = shows, Following = artists, "My artists" = the Browse scope) and the promise structure of the alert rows (crawl-triggered, never scheduled).

Replaces Spotify-powered personalization with following a user does in our app. Open **`Native Following.html`** and use **Tweaks** to drive §0 across surface × tier × source × width × theme.

## Built on the shipped components

R2 rebuilt every screen on the real components instead of lookalikes, so what eng receives is a diff against what exists rather than a parallel design:

| Surface | Component used | What this handoff changes |
|---|---|---|
| Browse | `browse-home.jsx` FilterBar chrome + `<EventRowList surface="browse"/>` (event row system) | Adds one chip to the filter row and two data fields (`following`, `followSource`) to the row. No layout change. |
| Event detail | `<EventDetail/>` (event detail v2) | **One new optional prop, `billBlock`**, rendered directly under the Watch CTA. Nothing else. |
| Artist page | `<ArtistPageMobile/>` (artist page R2) | One pass-through prop, `followState` (locked/pending), threaded to `FollowBlock` and to `EmptyUpcoming`'s inline button. No behaviour change. |
| Follow button | `FollowButton` in `artist-surface.jsx` | Extended with **two** states (locked, pending). **idle and following skins are unchanged.** A caller passing only `following` behaves exactly as before. |
| Row attribution | `RowMetaChip` "Following" | The Spotify logo becomes **conditional on `followSource`** — R1 hardcoded it, which would mark native follows as Spotify. |
| Art | `<IdentityArt/>` (Phase 7.5) | Used directly. No stand-in gradients anywhere. |

Those are the only edits to shipped files, and each is marked `NATIVE FOLLOWING` in the copied source.

Spotify's API caps us at 5 authenticated users and Extended Quota needs 250k MAU, so Spotify-powered personalization can never launch. It survives behind a feature flag for the connected few; native is the shape everything else runs on.

---

## The one structural decision

**Native is the base information architecture. Spotify is a `source` prop on it.**

Not a reskin (Spotify's IA assumes a populated library), and not a second IA either. One component set, one settings screen, one digest template, one management surface. `source="spotify"` adds the official-logo slot and a sync header — it does not add a screen. §8 has the full matrix; exactly one row genuinely forks, and it's the zero state, which Spotify users never reach.

Consequence worth stating: the flag flipping **on** for a user is additive, never a re-navigation — their Artists tab is the same tab, pre-filled. Flipping **off** leaves a populated native list, not a broken screen.

---

## Answers to the five open questions

### 1 · Discovery and cold start
Three on-ramps, cheapest first:

- **Onboarding steps 6–7 of 8** (Hugh reopened the track). Genres narrow the field, then a grid of artists who *already have Denver dates*, multi-select, one commit. The tile **is** the checkbox, so a 12-artist grid is 12 targets not 24. Genres are a narrowing device for the suggestion query only — **not** a stored taste profile.
- **Follow from search results.** Search already indexes artists; adding the button to the result row removes the "you must be on their page" trap with no new route.
- **Follow the bill** on event detail — the support slots are where discovery actually happens. One "Follow all N", plus per-artist rows for partial follows.

**Day one with zero follows:** the Browse shelf slot **changes job** rather than going empty. Same geometry as the Spotify taste shelf, different payload — a starter shelf of followable artists with dates on the books. And the scope chip is **absent**, not empty and not locked: a scope that can only ever return nothing is a trap. Nothing on Browse renders an apology.

### 2 · Where notification preferences live
**Nowhere new.** Two rows into the shipped Settings ▸ Notifications screen, grouped *Artists you follow* / *Shows you're watching*. New show alerts sits **above** Watch updates because an announcement is the earliest signal in the chain, so reading top-down matches how the funnel runs. **Auto-watch demotes to a sub-row** of New show alerts — it's a modifier on an alert, not a peer setting. Free/Supporter get one locked card with an upgrade route, not four dead toggles.

### 3 · Dual-mode
See above and §8.

### 4 · Premium
Following takes the headline slot, phrased as the outcome: **"Follow artists — get a heads-up when they play Denver."** Spotify sync drops to a fine-print line for the connected few (honest, costs nothing). Concert History moves up into the visible set. §7 shows before/after.

### 5 · First-watch nudge
Three directions in §6. **★ Lean: A, artist-anchored** — the artist is already on screen because the user just watched their show, so the first follow is one tap with zero search. B reads better as a sentence but routes to a picker, putting the first follow two screens away. C (inline, no card) never nags but wastes the one moment we know a new user is paying attention.

**A and C aren't exclusive** — ship A as the nudge and C's inline row on the watch confirmation as the permanent, non-nagging path.

---

## The follow affordance

One `FollowButton`, **four** states: `idle · following · locked · pending`.

### There is no fifth state

R2 drew an `unavailable` state for "artist exists, no Denver shows." Eng's audit killed it and was right: artists aren't a table we author, they're a projection off event billing strings, so an artist row only exists because a crawl found them on a bill. A zero-show artist **cannot exist**, cannot appear in search (results are filtered to artists with a visible event), and has no page (the detail endpoint 404s into a Next.js 404). There was nothing to render it on.

The state that IS real, common, and worth designing for is **"played Denver before, nothing upcoming."** That artist is searchable, has a working page, and is arguably the clearest expression of why following exists — you follow them precisely because there's nothing to watch yet. So:

- **The button is a normal, live Follow.** Not a state.
- In artist rows (search results, shelves, My shows ▸ Artists) the absence is a **muted `NoDatesLine`** ("NO DATES ANNOUNCED"), matching the "nothing on the books" group in My shows ▸ Artists.

✅ **No change to the shipped artist page is needed for this.** An earlier draft of this section claimed `ArtistPageMobile` hid `FollowBlock` behind `hasShows` and so lost the follow button here. It doesn't: when there are no upcoming shows the page renders `EmptyUpcoming`, which carries its own inline `FollowButton` and its own copy for this exact case ("Nothing on the calendar." / "No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking."). That shipped with #1115. On desktop the sticky rail's `FollowBlock` was never gated on `hasShows` at all.

So the `hasShows` guard **stays**, and the only build change on this surface is threading `followState` through `EmptyUpcoming` to its inline button so locked and pending render there like everywhere else. Lifting the guard would put two live follows on one screen, breaking the invariant three lines below.

`--accent` stays reserved for **Watching a show** (settled in the Spotify R1 audit), so Following never borrows it.

**idle and following use the shipped skins unchanged** — idle is a `--signal` fill, following is `--signal` at 14% with a `--signal` border and a check. Both are buttons of the same height, font and weight. R1 paired a filled button with a mono uppercase chip and the two states read as different controls; that's fixed by using one component for both.

`locked` reuses the shipped signed-out skin plus a lock, keeps idle's size, position and label, and is **never disabled** — tapping opens the paywall. No state is inert.

### One gate helper, everywhere

```js
nfLocked(tier) // === "free" || "supporter"
```

Supporter sits behind the same paywall as Free per `packages/entitlements`. R2 tested `tier === "free"` inline on six surfaces and leaked a live Follow button to Supporter on search, the bill, the scope chip, the Artists-tab CTA and the nudge. **Never test the tier string directly.**

**On the bill, the gate is one unit.** "Follow all N" and the per-row buttons lock together below Premium, so a 4-act bill is one paywall and one tap. Above Premium the rows stay independent for partial follows.

**Two densities, one gesture.** Full buttons on the artist page, search rows and the bill. In shelves and the onboarding picker the affordance collapses to a **badge on the art** — same two states, same gesture, but six filled Follow buttons across a discovery rail was too loud.

On event rows, following is read-only context, carried by the shipped `RowMetaChip`. The artist page keeps exactly one live follow affordance: the `showFollow` guard on the sticky sub-header, and the `hasShows` guard on `FollowBlock` where the empty block owns the follow instead.

---

## Where follows live

**My shows ▸ Artists**, next to Watching and History — Hugh's call, and it avoids spending a fifth nav slot. Tab is "Artists" (the noun you manage); the verb everywhere else stays "Following". Two groups: *playing Denver* (date in `--signal`, the payoff) and *nothing on the books* (muted) — a followed artist with no date isn't a failure, it's the whole point of following them.

---

## Files

| File | Contents |
|---|---|
| `Native Following.html` | The canvas — 9 sections |
| `nf-shared.jsx` | `CCMark` (verbatim copy, CLAUDE.md §1), `NFArt`, `FollowButton`, `FollowingTag`, `SpotifySlot`/`SourceMark`, chips, chrome, `NFNote`, sample data |
| `nf-cold-start.jsx` | `FollowStepGenres`, `FollowStepArtists`, `ArtistPick`, `StarterShelf`, `YourArtistsShelf`, `ArtistSearchResults`, `BillFollowBlock`, `BulkFollowSheet` |
| `nf-following.jsx` | `FollowFilterChip`, `BrowseNative`, `MyShowsArtists` (+ empty + Spotify variants), `ArtistFollowBlock`, `ArtistPageScreen`, `FOLLOW_ANCHOR`, `PremiumBenefitCard` |
| `nf-notify.jsx` | `NotificationSettings`, `FirstWatchNudge` (3 variants), `LockScreenMock`, `TrayRows`, `DigestEmail`, `DigestPlainText` |
| `nf-desktop.jsx` | `NotificationSettingsDesktop`, `BrowseDesktop`, `MyShowsArtistsDesktop`, `FollowStepDesktop`, `ArtistSearchDesktop`, `BillFollowDesktop`, `FirstWatchNudgeDesktop` |
| deps | `theme-context.jsx`, `ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx` copied verbatim |

---

## Flagged for eng / product

- **Naming collision.** The mobile tab bar says `watching` but this screen is titled "My shows" with Watching / Artists / History tabs. Recommend the nav label becomes **my shows** once Artists lands — "watching" naming a screen that also holds artists and history is the drift. CLAUDE.md §4a needs the same edit. *Not* touching the Watching concept itself.
- **The digest's plain-text part has both states.** `DigestEmail` has a `zero` variant and `DigestPlainText` originally didn't, which would have shipped an HTML part and a text part that disagree on a quiet week. Both are drawn now (`pf-email-text` / `pf-email-text-zero`). Build them together — `templates.test.ts` asserts exact strings, so a digest edit is always a test edit.
- **Ship the real paywall.** §3's sheet is a mock of the anatomy. Render `<MiniPaywall anchor={FOLLOW_ANCHOR}/>` from `design_handoff_monetization_tier_states/monetization-paywall.jsx`; `FOLLOW_ANCHOR` is exported from `nf-following.jsx`. Logged-out follow tap goes to the tier picker, not this sheet.
- **Batch crawl-triggered pushes.** A big crawl run must not fire eight notifications in ninety seconds. Recommend collapsing everything inside one crawl run into a single push (the batched variant in §5). Needs a debounce window from eng.
- **Multi-select is one write at commit**, not N writes as you tap: a 10-artist pick should be one request and one undo. Free/Supporter selections must survive the upgrade round-trip.
- **CLAUDE.md logs "no we'll-notify-you promises until notifications ship."** These screens make that promise, so they can't land before delivery does (#737).
- **Onboarding is now EIGHT steps, not six.** The shipped flow is already six (welcome · how · today · theme · notyet · done); adding genres + artists makes eight, at positions 6 and 7. R2's "steps 4–5 of 6" was a miscount, not a proposed cut. If eight is too long, the fix is a product call about which existing step to drop — not about squeezing the follow step.
- **No follower count.** R2 drew one and Hugh liked it, but it's new API work and production has zero manual follows, so it would read 0–2 for months and undercut exactly the artist it was meant to vouch for. Cut for now; revisit when the numbers are real.
- **All copy here is placeholder** (see the banner at the top) and the ~2,500 words of Spotify-named copy across 17 sections still needs its own sweep. Both are the copy-writer's.
- **`buildMeta` in `event-row.jsx` hardcoded the Spotify logo on the Following chip.** Patched here to read `followSource`. That patch has to land or every native follow will be marked Spotify.
- **The root `theme-context.jsx` is stale.** It predates the Aug 3 CCTip change that added `--shadow-soft` / `--shadow-strong` to all three themes, so it's missing both tokens. This handoff deliberately copies the *current* set from `design_handoff_event_detail_cta_tooltip/` instead. Worth fixing at the root — every future handoff that copies the root file will drag the stale token set with it.

## A11y

Per-section `A11Y` notes on the canvas. Cross-cutting: `FollowButton` is `aria-pressed`; locked is **not** `disabled` (it has an action) and carries an `aria-describedby` gate sentence; pending swaps the label only so the target never moves mid-tap. Artist tiles are `role=checkbox` in a labelled group with check-glyph + border + fill (never colour alone — Light needs all three to hold AA). Scope banner is `role=status`. Tabs are a real tablist with the count inside the accessible name. Toggles are `role=switch`, labelled by the row title and described by the body line, every row ≥44px.
