# Claude Code prompt — Native artist following

Implement native artist following. Design handoff: `design_handoff_native_following/` (open `Native Following.html`, read `README.md` first).

> **Copy is placeholder.** Every user-facing string in the mocks is a structural stand-in. Build the structure; the copy-writer supplies the strings. Do not ship the mock copy.

**This is a diff, not a rebuild.** Every screen is the shipped component with a follow layer added:
- Browse = `browse-home.jsx` FilterBar + `<EventRowList surface="browse"/>`; adds one chip and two row data fields (`following`, `followSource`).
- Event detail = `<EventDetail/>` from event detail v2 + **one new optional prop `billBlock`** under the Watch CTA.
- Artist page = `<ArtistPageMobile/>` + one pass-through prop (`followState`), threaded to `FollowBlock` and to `EmptyUpcoming`'s inline button. **No behaviour change — keep the `hasShows` guard.** An artist with no upcoming date already gets a follow button, inside `EmptyUpcoming`; lifting the guard would render two.
- Follow button = the existing `FollowButton` in `artist-surface.jsx`, extended with **two** states (locked, pending); **idle and following skins unchanged**.
- **Gate everything through `nfLocked(tier) = free || supporter`.** Do not test `tier === "free"` inline — that leaks a live Follow button to Supporter.
- **No follower count.** Cut; not an API build item for this release.
- `buildMeta` in `event-row.jsx`: the Spotify logo on the Following chip must become conditional on `followSource`. It is hardcoded today and would mark every native follow as Spotify.
- Art is `<IdentityArt/>` (Phase 7.5) throughout.

Spotify-powered personalization stays behind the existing feature flag for connected users. Native is the base shape; **Spotify is a `source` prop on native components, not a second IA.** Build native first, then make the Spotify path a `source="spotify"` variant of the same components.

## Contract

`FollowButton` — one component, four states:

| state | look | behaviour |
|---|---|---|
| `idle` | `--signal` fill | follow |
| `following` | shipped skin: `--signal` @14% fill, `--signal` border + text, check | unfollow, no confirm |
| `locked` | the shipped signed-out skin (transparent, `--border-strong`, `--fg`) + lock glyph, **same size/label as idle** | opens paywall. **Not `disabled`.** Logged-out → tier picker |
| `pending` | idle at 0.72 opacity, label "Following…" | label swap only, **no width change** |

**There is no fifth state.** An artist with zero Denver shows cannot exist (artists are a projection off event billing; the detail endpoint 404s with no visible event). The real case is "played Denver before, nothing upcoming": **normal live Follow button**, plus a muted `NoDatesLine` in artist rows (search results, shelves, the Artists tab). On the artist page, `EmptyUpcoming`'s own copy already carries the fact. Never inert.

`--accent` is reserved for Watching a show. Following never uses it. Sizes, per `NF_FOLLOW_SIZES`: `sm` 36 (only where the row is also a target) · `md` 44 · `full` 48.

In shelves and the onboarding picker the affordance is a **badge on the art**, not a full button (same states, same gesture, less shouting). Row attribution is the shipped `RowMetaChip`. The artist page shows exactly **one** live follow affordance (keep both guards from the artist-page work: `showFollow` on the sticky sub-header, `hasShows` on `FollowBlock`).

## Work

1. **`FollowButton` + `FollowingTag`** from `nf-shared.jsx`. Gate on `premium || founder`; free/supporter render `locked`.
2. **Paywall.** Render existing `<MiniPaywall anchor={FOLLOW_ANCHOR}/>`; `FOLLOW_ANCHOR` is in `nf-following.jsx`. Do not fork the paywall.
3. **Onboarding steps 6–7 of 8** — the shipped flow is already six steps (welcome · how · today · theme · notyet · done); these two slot in before `done`. (`nf-cold-start.jsx` / `nf-desktop.jsx`). Genres → suggested artists grid, multi-select, **one write at commit**. Both steps skippable, neither blocks sign-in. Suggestion query = artists with an upcoming Denver date, filtered by picked genres, ordered by follower count — so every suggestion is followable by construction. Genres are **not** persisted as preferences. Free/supporter: selection allowed, commit paywalled, **picks survive the upgrade round-trip**.
4. **Browse shelf slot.** One component, three modes: `zero` (starter shelf — followable artists with dates, shuffled per session), `some` (your followed artists with upcoming dates), Spotify (same as `some`, never `zero`). This is the same slot the Spotify taste shelf occupies.
5. **Scope chip "My artists."** `off | on | locked | absent`. **Locked sets no `aria-disabled`** — it opens the paywall, so it stays in the tab order and stays activatable. **Absent at zero follows** — render it absent from first paint for a 0-follow user; never remove it mid-session. Additive (AND) with date/venue/price/genre. Active state uses `--signal`. Scope banner is `role=status`.
6. **Bill block gates as ONE unit.** "Follow all N" and the per-row buttons lock together below Premium: a 4-act bill is one paywall, one tap. Above Premium rows are independent.
7. **Desktop is required for all three new surfaces**: artist search results (two-column, list + explainer rail), the bill block (in the detail page's right rail, under Watch), and the first-watch nudge (**replaces the rail's watch card in place** — not a ported card, and not a modal; on desktop the user never leaves the detail page, so a card injected into browse would fire at an empty room).
8. **My shows ▸ Artists tab.** The find-more affordance is a labelled ROW ("Find artists to follow" / "Search by name, or browse who's playing Denver soon"), not a "+ Follow more" button — beside a column of Following buttons, that button read like it might follow everything at once. Third tab beside Watching / History. Two groups: upcoming Denver dates (date in `--signal`, sorted soonest first) then no dates (muted, alphabetical). Alerts row deep-links to Settings ▸ Notifications with current state as its meta line. "Follow more" reuses the onboarding step-7 picker. Empty state per `MyShowsArtistsEmpty`.
7. **Follow from search results** — Artists section above Shows when the query matches an artist name. `FollowButton size="sm"`, icon-only under 360.
8. **Follow the bill** on event detail — `BillFollowBlock`: "Follow all N" plus per-artist rows.
9. **Settings ▸ Notifications** — add to the existing screen, grouped `Artists you follow` / `Shows you're watching`:
   - `New show alerts` — above Watch updates. Copy: "An artist you follow books a Denver date. Sent when we find it, not on a schedule."
   - `Add them to Watching for me` — **sub-row of the above**, indented, default **off**.
   - `Weekly digest` — Friday, one email.
   - Free/supporter: whole artist group renders as one locked card with an upgrade route. Not dead toggles.
10. **Push on crawl discovery.** Copy varies by auto-watch (see `NF_PUSH`). **Batch everything inside one crawl run into a single notification** — a big run must not fire eight pushes in ninety seconds. In-app tray rows per `TrayRows` once #737 lands.
11. **Weekly digest email** — native rewrite of the existing template. Inline hex (email can't read CSS vars). Quiet week still sends, light, with two follow suggestions — never a blank send. Unsubscribe per-family first, global secondary. Plain-text part included.
12. **Premium tier copy** — headline benefit becomes "Follow artists: get a heads-up when they play Denver." Spotify sync drops to a fine-print line.
13. **First-watch nudge** — replace the Spotify pitch with variant A (artist-anchored, `NUDGE_COPY.artist`). Single-fire, dismissable, never returns. Free tier still sees it with the lock on the CTA. Also add variant C's inline follow row to the watch confirmation as the permanent path.

## Non-negotiable

- **Mobile (390 + 320) and desktop ship together.** 320 is the baseline.
- **Token-only colour** — `var(--*)` from `theme-context.jsx`, verified in Electric / Jade / Light. No raw hex in screen code. Email is the sole exception.
- **`--accent` = Watching. `--signal` = CTA + status.** Never swap them.
- **Spotify logo is the official asset dropped into a slot** — never a redrawn mark. Spotify green is not an app colour.
- **Do not ship the notification screens before delivery exists** (#737). We don't promise pings we can't send.
- Use `CCMark` from `browse-home.jsx` for the logo. Never a placeholder monogram.
- Vocabulary: **Watching** (shows) · **Following** (artists) · **price check**, never contest/dispute in user-facing copy.

## A11y

`aria-pressed` on FollowButton; locked is not `disabled` and carries an `aria-describedby` gate sentence. Artist tiles `role=checkbox` in a labelled group — selection is check glyph **+** border **+** fill, never colour alone (Light needs all three for AA). Tabs are a real tablist, arrow-key nav, count inside the accessible name ("Artists, 7"). Toggles `role=switch`, labelled by row title, described by body line, rows ≥44px. Tray unread = dot + bold weight. Group headings are `h2`. Commit button carries the count in its text.

## Open — needs a product answer before build

The bottom-nav tab reads `watching` but the screen is "My shows" with Watching / Artists / History tabs. Recommend the nav label becomes **my shows** when Artists lands. Confirm with Hugh; the Watching concept itself does not change.
