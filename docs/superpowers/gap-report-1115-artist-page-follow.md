# Gap Report — Artist Page PR-F (Follow, Watch, sticky bar)

Source of truth: `docs/superpowers/design-tables/1115-artist-page.md` (Agent 1 output,
committed in PR-A). This report is Agent 2 + Agent 3 for the PR-F slice only —
§1 page order, §3 chrome, §6 Follow, §8 SectionHead, §9 ShowRow, §11 EmptyUpcoming,
§12 loading, §14 accessibility.

## Pass 1 — Visual properties

| Design § | Element                                                                                                                                      | Verdict                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1       | Page order, `hasShows` → plate/name/history/follow/player/upcoming/previously                                                                | ✅ MATCH                                                                                                                                                                                                       |
| §1       | Page order, `!hasShows` → upcoming (empty, follow inside) → previously → player                                                              | ✅ MATCH                                                                                                                                                                                                       |
| §1       | Invariant: exactly one live follow affordance                                                                                                | ✅ MATCH — enforced by `showFollow` / `inlineFollow` / `useIsDesktop`, covered by four unit cases and by the Gate 2 runtime probe (`follow=1` in all 9 viewport × state combinations, before and after scroll) |
| §3       | `StickyBar` height 56, `var(--bg)`, `1px solid var(--border)` bottom, gap 10, padding `0 12px`                                               | ✅ MATCH                                                                                                                                                                                                       |
| §3       | `StickyBar` name Inter 800 / 15 / -0.01em, nowrap + ellipsis                                                                                 | ✅ MATCH                                                                                                                                                                                                       |
| §3       | `StickyBar` follow rendered only when `showFollow`                                                                                           | ✅ MATCH                                                                                                                                                                                                       |
| §3       | `StickyBar` back button 44×44, `flexShrink: 0`                                                                                               | ✅ MATCH (`BackChip inline`)                                                                                                                                                                                   |
| §3       | `BackChip` 44 hit / 36 visible, chevron `stroke="var(--fg)"`, `aria-label` "Back"                                                            | ✅ MATCH                                                                                                                                                                                                       |
| §3       | No desktop sub-header; rail is `position: sticky`                                                                                            | ✅ MATCH                                                                                                                                                                                                       |
| §6       | `FollowButton` base — `all: unset`, `box-sizing`, gap 7, min-height 44, radius 10, Inter 800 / -0.01em                                       | ✅ MATCH                                                                                                                                                                                                       |
| §6       | `full` 48 / 100% / 15px; `compact` 44 / `0 14px` / 13.5px                                                                                    | ✅ MATCH                                                                                                                                                                                                       |
| §6       | Not-following skin background/color                                                                                                          | ✅ MATCH                                                                                                                                                                                                       |
| §6       | Following skin `color-mix(in oklab, var(--signal) 14%, transparent)` / `var(--signal)`                                                       | ✅ MATCH                                                                                                                                                                                                       |
| §6       | **Border `1px solid var(--signal)` on both signed-in skins**                                                                                 | ❌ **MISMATCH → FIXED** (see gap 1)                                                                                                                                                                            |
| §6       | Plus glyph 13×13 `M7 2v10M2 7h10`; check glyph `M2 7.5l3.4 3.4L12 3.6`; strokeWidth 2.4, round caps                                          | ✅ MATCH                                                                                                                                                                                                       |
| §6       | Labels + `aria-pressed` omitted when signed out + full-sentence `aria-label`                                                                 | ✅ MATCH                                                                                                                                                                                                       |
| §6       | `FollowBlock` sub-line 11.5px / `var(--fg-subtle)` / margin-top 8 / line-height 1.45, three copy states                                      | ✅ MATCH                                                                                                                                                                                                       |
| §6       | Placement per state (hero / rail `marginTop: 16` / sticky compact / inside empty)                                                            | ✅ MATCH                                                                                                                                                                                                       |
| §8       | `SectionHead` real `<h2>`, flex, gap 10, margin-bottom 12, rule `flex: 1 / height 1`, count Mono 10 / 600 / .1em / uppercase                 | ✅ MATCH                                                                                                                                                                                                       |
| §9       | `ShowRow` anchor `.ap-row`, gap 12, min-height 60, padding `8px 8px`, margin `0 -8px`, radius 8                                              | ✅ MATCH                                                                                                                                                                                                       |
| §9       | Venue Inter 700 / 14 nowrap-ellipsis; city 11.5 `var(--fg-muted)` margin-top 2; `PriceChip` right                                            | ✅ MATCH                                                                                                                                                                                                       |
| §11      | `EmptyUpcoming` head "Upcoming", **no count**                                                                                                | ✅ MATCH                                                                                                                                                                                                       |
| §11      | Card radius 14, `1px solid var(--border)`, `var(--surface-1)`, padding 18                                                                    | ✅ MATCH                                                                                                                                                                                                       |
| §11      | Title Inter 800 / 17 / -0.02em; body 13 / 1.55 `var(--fg-muted)` `text-wrap: pretty`; margin `8px 0 16px` when `inlineFollow` else `8px 0 0` | ✅ MATCH                                                                                                                                                                                                       |
| §11      | Follow rendered only when `inlineFollow`                                                                                                     | ✅ MATCH                                                                                                                                                                                                       |
| §12      | Follow slot reserved at the control's own 48px / radius 10, desktop in rail at `marginTop: 16`, mobile in `.ap-block-follow`                 | ✅ MATCH                                                                                                                                                                                                       |
| §14      | Focus order back → follow → skip player → iframe → rows → show-all                                                                           | ✅ MATCH (asserted in `ArtistPageContent.test.tsx`)                                                                                                                                                            |
| §14      | ≥44px touch targets on sticky-bar back + follow                                                                                              | ✅ MATCH                                                                                                                                                                                                       |
| §14      | Follow state never colour-only — glyph carries it                                                                                            | ✅ MATCH                                                                                                                                                                                                       |

## Pass 2 — State reachability

| State                                       | Trigger                                        | Verdict                                                                                                                                                                                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signed out                                  | `ArtistDetailResponse.following === null`      | ✅ REACHABLE — field in `packages/types`, route returns `null` for anonymous callers, `ArtistPageContent` derives `signedOut`, verified in the browser at 320/390/desktop (zero `/follow` calls, picker opens)                                                                              |
| Signed in, not following                    | `following === false`                          | ✅ REACHABLE                                                                                                                                                                                                                                                                                |
| Signed in, following                        | `following === true`                           | ✅ REACHABLE                                                                                                                                                                                                                                                                                |
| No upcoming shows                           | `shows.length === 0`                           | ✅ REACHABLE — forced with the `gate-two-empty` fixture                                                                                                                                                                                                                                     |
| No Spotify match                            | `spotifyArtistId === null`                     | ✅ REACHABLE — forced with the `gate-two-shows` fixture                                                                                                                                                                                                                                     |
| Rejected follow write (optimistic rollback) | POST/DELETE `/v1/artists/:slug/follow` non-2xx | ⚠️ PARTIALLY VERIFIED — reachable in code and covered by `use-artist-follow.test.tsx` ("rolls back when the request is rejected"), but **not forcible in the local browser**: no Clerk session is available in the worktree dev stack, so the signed-in write path cannot be driven by hand |

## Gap list

### Visual gaps

1. `apps/web/src/components/consumer/artist-page/FollowButton.tsx` — `FollowButton` —
   `border` — design: `1px solid var(--signal)` → implementation: none.
   `all: unset` strips the border and nothing put it back. Invisible on the
   not-following skin (border colour equals the fill), but the Following skin's
   background is a 14% mix of `--signal`, so the control shipped with **no edge at
   all** in its followed state — the one state the design draws as an outline.

   **Fixed** (test-first): assertions added to `FollowButton.test.tsx` for both
   signed-in skins, watched fail, then `border: '1px solid var(--signal)'` added to
   the shared style. `box-sizing: border-box` was already set, so the 48px and 44px
   heights are unchanged.

### State reachability gaps

None. The rejected-follow row above is a verification limitation, not a code gap.

## Documented deviations from the table

These are intentional and each has a reason that post-dates or outranks the table.

1. **§6 signed-out skin.** The table specifies a third skin — `transparent` background,
   `var(--fg)` ink, `1px solid var(--border-strong)`, no glyph. We ship the
   not-following skin instead. #794 §3.10 requires signed-out controls to be
   pixel-identical at rest to signed-in-and-not-following, so a distinct skin would
   leak auth state into the layout. The honesty lives in the accessible name, in
   `aria-haspopup="dialog"`, and in the fact that activation opens the tier picker
   rather than writing a follow. `FollowButton.test.tsx` asserts the two `style`
   attributes are byte-identical.
2. **§3 back-chip background.** The table says `var(--scrim)` and flags "verify in
   Light, whose scrim is 0.40 vs 0.72 elsewhere". That verification failed — cold-eyes
   finding 7. `--scrim` is a dark wash on every theme, which puts dark `--fg` ink on a
   dark disc in Light mode over the plate's light stripes. Replaced with
   `color-mix(in oklab, var(--bg) 82%, transparent)` plus an 8px backdrop blur, which
   is opposite the foreground in every theme by construction. This closes the flag the
   table itself raised.
3. **§3 `StickyBar` positioning.** The table records `position: absolute; top: compact ? 0 : 44`.
   That offset is the prototype's fake device chrome. The real app uses
   `position: fixed; top: 0`.
4. **§8 count on "Upcoming".** Cold-eyes finding 6 — the heading and the mono count said
   the same thing and the count was the string that clipped at 320px. Removed from the
   upcoming head. `SectionHead` keeps the `count` prop and its full styling; `PastShows`
   still passes it, and `ARTIST_COPY.showCount` is still consumed there.
5. **§9 `ShowRow` additions.** The row now carries a `WatchShowButton` (cold-eyes
   finding 4 — the same event object offers one on venue detail) and a `StatusPill`
   (closes §17 item 11, which flagged sold-out/cancelled as having no treatment). The
   Watch control is a **sibling** of the anchor, never a child; the anchor keeps the
   full 60px tap area. Watching is an eye — the reused `WatchShowButton` is the same
   component venue detail renders, not a second one.

## Agent 3 — Confirmation

Only item checked: visual gap 1.

- `FollowButton` border — **FIXED**. `border: '1px solid var(--signal)'` present in the
  shared style object; asserted for both the not-following and following skins.

**VERDICT: 0 gaps remain.**
