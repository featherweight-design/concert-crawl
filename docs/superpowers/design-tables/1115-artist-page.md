# Design Property Table — Artist Page (#1115)

Source-of-truth enumeration of every visual, state, copy and interaction claim in
`design/design_handoff_artist_page/` — built from `CLAUDE_CODE_HANDOFF.md`, `README.md`,
`READINESS.md`, `artist-page.jsx`, `artist-surface.jsx`, `artist-embed.jsx`,
`artist-data.jsx`, `identity-art.jsx`. **The handoff alone.** No engineering plan, no app
source, no PRs were consulted.

Conventions used below:

- Numeric style values are unitless in JSX = **px**.
- **Mobile** = `ArtistPageMobile`. **Desktop** = `ArtistPageDesktop`. The prototype switches
  on component, not media query; the only _numeric_ breakpoint the handoff pins is
  `AP_NARROW_BP = 360` (`narrow` prop). 320 is the design floor, not a breakpoint.
- Fonts: **Inter** = `Inter, system-ui`; **Mono** = `'JetBrains Mono', monospace`.
- `ARTIST_COPY` (artist-data.jsx:37-99) is the string set; lift verbatim into
  `apps/web/src/components/consumer/definitions/copy.ts`.
- `CRAWL_SINCE = "March 2026"` is **data**, not copy (artist-data.jsx:102).
- Every colour is `var(--*)`. The **one** production-surviving hex is
  `EMBED_LIGHT_PLATE = "#191A1F"` (artist-embed.jsx:204). All other hexes in the bundle
  (`#231F2B`, `#3A3446`, `#2B2634`, `rgba(255,255,255,0.5)` in `ArtistPlate`; the `FOREIGN`
  palette `#F2F2F2 / #A6A6A6 / #4A4A52 / #E8E8E8 / #5A5A60`; `#1A1A1D` default `bg`;
  `rgba(255,255,255,0.06)` inset ring) are **mock-only** and must not ship.

---

## 0. Constants

| Constant            | Value                       | File                 | Meaning                                        |
| ------------------- | --------------------------- | -------------------- | ---------------------------------------------- |
| `AP_HERO_H.wide`    | 200                         | artist-page.jsx:14   | Mobile hero plate height at ≥360px             |
| `AP_HERO_H.narrow`  | 150                         | artist-page.jsx:14   | Mobile hero plate height below 360px           |
| `AP_NARROW_BP`      | 360                         | artist-page.jsx:15   | `< 360` = narrow layout; 320 is its floor      |
| `EMBED_H.compact`   | 152                         | artist-embed.jsx:19  | Default iframe height (all viewports)          |
| `EMBED_H.tall`      | 352                         | artist-embed.jsx:19  | Optional; **desktop-only at most**             |
| `RESIDENCY_MIN`     | 3                           | artist-data.jsx:140  | Min nights for a cluster to earn "run"         |
| `RESIDENCY_WINDOW`  | 21 (days)                   | artist-data.jsx:141  | Max gap BETWEEN nights **and** max span of run |
| `SHOWS_VISIBLE`     | 5                           | artist-data.jsx:142  | Truncation cap, measured in **items**          |
| `EMBED_LIGHT_PLATE` | `#191A1F`                   | artist-embed.jsx:204 | Fixed dark plate handed to iframe in Light     |
| `CRAWL_SINCE`       | `"March 2026"`              | artist-data.jsx:102  | Crawl-window label; data, single source        |
| Route               | `/artists/{canonical-slug}` | HANDOFF §Overview    | Slug, **not** Spotify ID                       |
| Gutter (mobile)     | 18 wide / **14** narrow     | artist-page.jsx:24   | `pad`                                          |

### Global CSS injected (`#ap-styles`, artist-surface.jsx:8-20)

| Rule               | Definition                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `@keyframes ap-sh` | `0%{translateX(-100%)} 100%{translateX(100%)}`                                                                           |
| `.ap-shimmer`      | `linear-gradient(90deg,transparent,var(--overlay-hover),transparent)`; `ap-sh 1.4s ease-in-out infinite`                 |
| `.ap-skel`         | `background:var(--surface-2); border-radius:6px; position:relative; overflow:hidden`; `:after` = same shimmer, `inset:0` |
| `.ap-row:hover`    | `background: var(--overlay-hover)`                                                                                       |
| `.ap-page a`       | `color: var(--signal)`; `:hover` → `color: var(--fg)`                                                                    |

---

## 1. Page order — state-dependent (artist-page.jsx:3-8, HANDOFF §Page structure)

| Condition                     | Order                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `hasShows` (shows.length > 0) | plate → name → history → **follow** → player → upcoming → previously               |
| `!hasShows`                   | plate → name → history → **upcoming (empty, follow inside)** → previously → player |

**Invariant: exactly one live follow affordance at any time.** Enforced in code —
`StickyBar` takes `showFollow`, page passes `hasShows`; `EmptyUpcoming` takes `inlineFollow`
(desktop passes `false`). Two follow buttons on screen simultaneously is a bug, not a variant.

Block top margins: mobile Player `marginTop: 22`, Shows `24`, Past `26`. Desktop Player `26`,
Shows `30`, Past `34`.

---

## 2. `ArtistPlate` (artist-surface.jsx:28-49)

Props: `name`, `photo`, `height`, `initials = true`.

| State                          | Render                                                                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Has photo**                  | `<img>` in fixed-height container, `object-fit: cover`, `overflow: hidden`, `position: relative`; tint overlay `background: var(--image-tint)` at `inset:0`. **The image never sets layout.** |
| **No photo / no ID / onError** | `<IdentityArt name={artist} kind="artist" scale="hero" showInitials height={height} grain={0.1} />` in the **identical** container — Phase 7.5 hard-swap contract, zero reflow.               |
| **Expired signed URL**         | Must degrade at **render time** via `onError` swap, not only a null check (README gap #2, READINESS 🟡).                                                                                      |
| **Loading (clock 1)**          | `HeroSkeleton` replaces the plate entirely at the same height.                                                                                                                                |

Heights: mobile 200 (≥360) / 150 (<360); desktop **320×320**, `border-radius: 14`, `overflow: hidden`.

**Bottom gradient** (mobile only, artist-page.jsx:58-59): absolute, `left/right: 0; bottom: 0`,
`height: 80`, `background: linear-gradient(transparent, var(--bg))`, `pointerEvents: none`.

### `IdentityArt` properties relied on (identity-art.jsx)

| Property         | Value                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Namespace        | `"artist"` — separate hash seed from `"venue"`                                                                                                                                                               |
| Artist templates | `mesh`, `stripes`, `concentric`, `halftone` (blueprint is venue-only)                                                                                                                                        |
| Palettes         | 8 (`p0`–`p7`), riso/silkscreen, mix of light + dark papers                                                                                                                                                   |
| Grain            | `0.10` default; handoff passes `grain={0.1}`; opacity 0.85 light / 0.55 dark                                                                                                                                 |
| Initials stamp   | `hero` only by default; `left:12 bottom:12`, padding `6px 12px`, radius 10, Inter 900 44px, `-0.04em`, chip backplate `rgba(0,0,0,0.55)` dark / `rgba(255,255,255,0.78)` light, `backdrop-filter: blur(6px)` |
| Vignette         | `linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)` — so the back chip reads                                                                                                                 |
| Determinism      | Same name + kind → same image, always                                                                                                                                                                        |

---

## 3. Chrome

### `BackChip` — mobile (artist-surface.jsx:52-64)

| Property      | Value                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Button box    | **44 × 44**, `position: absolute`, `left: 14`, `zIndex: 20`, flex-centred                                                       |
| `top`         | **56** with device chrome; **14** without (`deviceChrome ? 56 : 14`)                                                            |
| Visible chip  | 36 × 36, `border-radius: 18`, `background: var(--scrim)`                                                                        |
| Glyph         | 16×16 SVG chevron, `stroke="var(--fg)"` (**never `#fff`** — R1 defect), `strokeWidth 2`, round caps/joins, path `M10 3L5 8l5 5` |
| `aria-label`  | `ARTIST_COPY.backLabel` = **"Back"**                                                                                            |
| Cursor        | `pointer`                                                                                                                       |
| Contrast note | `--fg` on `--scrim`; verify in Light, whose scrim is 0.40 vs 0.72 elsewhere                                                     |

### `Crumb` — desktop only (artist-surface.jsx:66-75)

| Element   | Value                                                                              |
| --------- | ---------------------------------------------------------------------------------- |
| Container | `<nav>`, flex, `gap: 8`, Inter 13, `color: var(--fg-muted)`, `marginBottom: 18`    |
| Root link | `ARTIST_COPY.crumbRoot` = **"Browse"**, `var(--fg-muted)`, `text-decoration: none` |
| Separator | `/` in `var(--fg-subtle)`                                                          |
| Current   | `{name}`, `var(--fg)`, `fontWeight: 600`                                           |

### `StickyBar` — mobile only (artist-surface.jsx:81-97)

Props: `name`, `following`, `compact`, `showFollow = true`.

| Property    | Value                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Position    | absolute, `top: compact ? 0 : 44`, `left/right: 0`, `zIndex: 30`                                                                |
| Height      | **56**                                                                                                                          |
| Background  | `var(--bg)`; `border-bottom: 1px solid var(--border)`                                                                           |
| Layout      | flex, `align-items: center`, `gap: 10`, `padding: 0 12px`                                                                       |
| Back button | 44×44, same chevron SVG, `stroke="var(--fg)"`, `aria-label` "Back", `flexShrink: 0`                                             |
| Name        | `flex: 1`, `minWidth: 0`, Inter **800 / 15**, `-0.01em`, `var(--fg)`, `nowrap` + `overflow: hidden` + `text-overflow: ellipsis` |
| Follow      | `<FollowButton size="compact">` — rendered **only when `showFollow`** (= `hasShows`)                                            |
| Trigger     | Appears when the hero name leaves the viewport                                                                                  |

**States:** (a) with-shows + not-following, (b) with-shows + following, (c) **no-shows → back + name only**.

### Desktop scroll behaviour

**There is no desktop sub-header.** Left rail (plate + follow) is `position: sticky; top: 24`
inside the grid; outer container `overflowY: auto`. If the rail is ever dropped, desktop needs
the sub-header — one decision, not two.

---

## 4. Name (`h1`)

| Surface     | Font                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Mobile ≥360 | Inter **900 / 31px**, `line-height: 1.08`, `letter-spacing: -0.035em`, `var(--fg)`, `text-wrap: balance`, `margin: 0` |
| Mobile <360 | Inter **900 / 27px**, otherwise identical                                                                             |
| Desktop     | Inter **900 / 42px**, `line-height: 1.04`, `letter-spacing: -0.04em`                                                  |

Mobile content column overlaps the plate's lower edge via `margin-top: -26px`; column padding
`0 {pad}px 48px`.

> **Discrepancy (flagged):** the prose in `CLAUDE_CODE_HANDOFF.md` §Name says `-0.035em` for
> all three sizes; `artist-page.jsx:159` uses `-0.04em` on desktop. Code wins per "recreate the
> prototypes," but this is a real conflict.

---

## 5. `HistoryLine` (artist-surface.jsx:151-158, artist-data.jsx:113-128)

| Property | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Element  | `<p>`, `margin: 10px 0 0`                                            |
| Type     | Inter **13px / 1.55**, `color: var(--fg-muted)`, `text-wrap: pretty` |
| Desktop  | wrapped in `maxWidth: 560`                                           |

### Three forms + the selection logic

| Case                                     | String                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `count === 0`                            | `historyNone(since)` — "First time we've caught them. We only started looking in {since}." |
| `count === 1` **and** `venues[0]` truthy | `historyOne(venue)` — "We've caught them once: {venue}."                                   |
| `count === 1` **and no venue**           | falls back to `historyNone` (never "once — once")                                          |
| `count >= 2`                             | `historyMany(n, venues)` — "{n} shows on our map: {venues}."                               |

`joinList`: 1 → `a`; 2 → `a & b`; 3+ → `a, b & c` (Oxford-less serial with `&`).

**CONTRACT:** `history` and `past` are the **same set** — one query feeds both.
`history.count` MUST equal `past.length`; `history.venues` must be drawn from `past`.

---

## 6. `FollowButton` (artist-surface.jsx:103-135)

Props: `following`, `name`, `size = "full" | "compact"`, `signedOut = false`, `onToggle`.

### Base (both sizes)

`all: unset`, `box-sizing: border-box`, `cursor: pointer`, flex centred, `gap: 7`,
Inter **800**, `letter-spacing: -0.01em`, `min-height: 44`, `border-radius: 10`.

| Size      | Height | Width | Padding  | Font size | Other           |
| --------- | ------ | ----- | -------- | --------- | --------------- |
| `full`    | **48** | 100%  | —        | **15**    | —               |
| `compact` | **44** | auto  | `0 14px` | **13.5**  | `flexShrink: 0` |

### Skins — three, exhaustive

| State             | background                                            | color                 | border                           | Glyph                                                                       |
| ----------------- | ----------------------------------------------------- | --------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| **Not following** | `var(--signal)`                                       | `var(--fg-on-accent)` | `1px solid var(--signal)`        | **Plus** 13×13, `M7 2v10M2 7h10`, `strokeWidth 2.4`, round cap              |
| **Following**     | `color-mix(in oklab, var(--signal) 14%, transparent)` | `var(--signal)`       | `1px solid var(--signal)`        | **Check** 13×13, `M2 7.5l3.4 3.4L12 3.6`, `strokeWidth 2.4`, round cap+join |
| **Signed out**    | `transparent`                                         | `var(--fg)`           | `1px solid var(--border-strong)` | **none**                                                                    |

Glyph `stroke="currentColor"`, `fill="none"`, `viewBox="0 0 14 14"`.

### Labels + ARIA

| State         | Label                                       | `aria-pressed`        | `aria-label`                                                                          |
| ------------- | ------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| Not following | `follow` = **"Follow"**                     | `false`               | `followAria(name)` = "Follow {name} — every show they book is added to your Watching" |
| Following     | `following` = **"Following"**               | `true`                | `followingAria(name)` = "Following {name}. Activate to stop following."               |
| Signed out    | `followSignedOut` = **"Sign in to follow"** | `undefined` (omitted) | "Sign in to follow"                                                                   |

State is **never colour-only** — the glyph carries it too.

### `FollowBlock` sub-line (artist-surface.jsx:137-148)

Inter **11.5px**, `color: var(--fg-subtle)`, `margin-top: 8`, `line-height: 1.45`.

| State         | Copy key               | Text                                                        |
| ------------- | ---------------------- | ----------------------------------------------------------- |
| Not following | `followPitch`          | "Every show they book lands in your Watching."              |
| Following     | `followPitchActive`    | "Their shows land in your Watching."                        |
| Signed out    | `followSignedOutPitch` | "Following needs an account. Everything else here doesn't." |

### Semantics (HANDOFF §Follow)

- Writes `user_artist_follows` with `source: 'manual'`; carries existing `autoWatch`.
- **Never writes to the user's Spotify account.**
- Identical behaviour for non-Spotify artists.
- If the connected Spotify already follows the artist → mounts **pre-toggled and discloses
  nothing**: no badge, no source note. `source` stays a schema concern.
- Follow is the **only** thing requiring sign-in; the rest of the page is fully usable
  signed-out, free tier.

### Placement per state

| Condition              | Mobile                                           | Desktop                                       |
| ---------------------- | ------------------------------------------------ | --------------------------------------------- |
| `hasShows`, unscrolled | Hero `FollowBlock` (`marginTop: 18`)             | Sticky left rail, `marginTop: 16` under plate |
| `hasShows`, scrolled   | StickyBar compact instance (hero one off-screen) | Rail stays pinned; no second instance         |
| `!hasShows`            | Inside `EmptyUpcoming` (`inlineFollow`)          | Rail only — `inlineFollow={false}`            |
| `!hasShows`, scrolled  | StickyBar with **no** follow                     | n/a                                           |

---

## 7. Player / embed

Direction shipped: **B · Mat**. (`shelf` and `flush` exist in the bundle as the arguable
alternatives; A · Shelf costs ~56px of chrome, C · Flush reads as an unstyled div in Light.)

### `ArtistEmbed` router (artist-embed.jsx:190-197) — dispatch order

1. `!spotifyId` → `EmbedAbsent` (wins over loading)
2. `loading` → `EmbedLoading`
3. `direction === "shelf"` → `EmbedShelf`
4. `direction === "flush"` → `EmbedFlush`
5. default → `EmbedMat`

### `EmbedRail` (artist-embed.jsx:60-70)

| Element   | Value                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Container | flex, `align-items: baseline`, `gap: 8`, `margin-bottom: 8`                                                               |
| Left      | Mono **10px / 700**, `letter-spacing: .14em`, `uppercase`, `var(--fg-subtle)` — `playerRail` = **"Player · Spotify"**     |
| Rule      | `flex: 1`, `height: 1`, `background: var(--border)`                                                                       |
| Right     | Mono **10px / 600**, `letter-spacing: .1em`, `uppercase`, `var(--fg-subtle)` — `playerRailThirdParty` = **"third party"** |

### `EmbedMat` (artist-embed.jsx:118-131)

| Layer   | Value                                                                                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mat     | `padding: 8`, `border-radius: 12`, `background: var(--surface-1)` (`matToken`), `border: 1px solid var(--border)`                                                       |
| iframe  | `border-radius: 8`, `width: 100%`, `height: 152` (compact)                                                                                                              |
| Caption | Inter **11.5px**, `var(--fg-subtle)`, `margin-top: 8`, `line-height: 1.45` — `playerPreviewNote` = **"30-second previews. Full tracks if you're signed into Spotify."** |

Production iframe:
`<iframe src="https://open.spotify.com/embed/artist/{spotifyId}" title={playerTitle(name)} loading="lazy" allow="encrypted-media">`
where `playerTitle(name)` = **"Spotify player for {name}"**.

### `embedPlate(themeKey, direction = "mat")` — the only value we send them

```js
const EMBED_LIGHT_PLATE = '#191A1F'
function embedPlate(themeKey, direction = 'mat') {
  const t = THEMES[themeKey]
  if (!t) return EMBED_LIGHT_PLATE
  if (t.mode === 'light') return EMBED_LIGHT_PLATE
  return direction === 'flush' ? t.tokens['bg'] : t.tokens['surface-1']
}
```

- Branches on `theme.mode`, **never** on a theme name — that's what makes three mocked themes
  cover all nine.
- Token must be resolved to a **hex at runtime** (`getComputedStyle().getPropertyValue` or the
  theme table); the embed cannot read `var(--*)`.
- Keep the `direction` arg only if more than one direction ships. If **mat** ships alone, drop it.

### `EmbedSkipLink` (artist-embed.jsx:78-93)

| Aspect        | Value                                                                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text          | `playerSkip` = **"Skip player, go to shows"**                                                                                                                                                                                                                                                                        |
| Href          | `#{targetId}` — `#upcoming`                                                                                                                                                                                                                                                                                          |
| Conditional   | Returns `null` when `targetId` falsy. Page passes `skipTo={hasShows ? "upcoming" : null}` — **not rendered in the no-shows state**, where the player is last and the link would move focus backwards.                                                                                                                |
| Hidden style  | `position: absolute; width: 1; height: 1; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap`                                                                                                                                                                                                                |
| Focused style | `display: inline-block`, `margin-bottom: 8`, `padding: 8px 12px`, **`min-height: 44`**, `line-height: 28px`, `border-radius: 8`, `background: var(--surface-2)`, `color: var(--fg)`, `border: 1px solid var(--focus)`, `outline: 2px solid var(--focus)`, `outline-offset: 2`, Inter 13/600, `text-decoration: none` |

### `EmbedLoading` — clock 2 (artist-embed.jsx:150-171)

| Aspect  | Value                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Well    | `role="status"`, `aria-busy="true"`, **exact final height** (152), `border-radius: 8`, `background: var(--surface-2)`, flex-centred, `overflow: hidden` |
| Label   | Mono **10 / 700**, `.14em`, uppercase, `var(--fg-subtle)` — `playerLoading` = **"Loading the player…"**                                                 |
| Shimmer | `.ap-shimmer` at `inset: 0`                                                                                                                             |
| Chrome  | Mat direction wraps it in the same rail + 8px `--surface-1` mat + caption. `flush` returns the bare well.                                               |
| Rule    | Page is fully interactive; **shows list must never move when the iframe paints.** No skip link is rendered in the loading branch.                       |

### `EmbedAbsent` — no `spotifyId`, incl. unresolved matches (artist-embed.jsx:176-187)

| Element      | Value                                                                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rail         | `playerNoneRail` = **"No player"** (no right-hand "third party" label)                                                                             |
| Sentence     | Inter **13.5 / 600**, `var(--fg-muted)`, `line-height: 1.5` — `playerNone` = **"We don't have them on Spotify."**                                  |
| Continuation | same line, `fontWeight: 500`, `var(--fg-subtle)` — `playerNoneSub` = **"Doesn't mean much — plenty of good bands aren't. Their shows are below."** |
| Forbidden    | **No box, no icon, no retry button.** A hole reads as an error; a sentence reads as a fact.                                                        |

### `EmbedShelf` (not shipping — reference only)

Card `border-radius: 14`, `var(--surface-1)`, `1px var(--border)`, `padding: 16`; title
`playerShelfTitle` = **"Have a listen"** Inter 800/15 `var(--fg)` `margin-bottom: 3`;
sub Inter 12 `var(--fg-muted)` `margin-bottom: 12` (= `playerPreviewNote`).

### `EmbedFlush` (not shipping — reference only)

Skip link + `EmbedStandIn` with `radius={0}`, no rail, no border, bg param → `--bg`.

---

## 8. `SectionHead` (artist-surface.jsx:161-173)

| Element   | Value                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| Container | flex, `align-items: center`, `gap: 10`, `margin-bottom: 12`, carries the `id`                                       |
| Title     | **real `<h2>`** (not a styled span), `margin: 0`, Inter **800 / 15**, `-0.01em`, `var(--fg)`, `white-space: nowrap` |
| Rule      | `flex: 1`, `height: 1`, `background: var(--border)`                                                                 |
| Count     | rendered only when `count != null`; Mono **10 / 600**, `.1em`, uppercase, `var(--fg-subtle)`                        |

`showCount(n)` = **"{n} show"** / **"{n} shows"** (singular at n === 1).
`upcomingTitle` = **"Upcoming"**. `pastTitle` = **"Previously"**.

---

## 9. Upcoming shows

### `DateStamp` (artist-surface.jsx:176-188)

| Line | Style                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------ |
| Box  | `width: 44`, `flexShrink: 0`, `text-align: center`                                               |
| DOW  | Mono **9 / 700**, `.1em`, `var(--fg-subtle)`, uppercase from `fmtDate`                           |
| Day  | Inter **19 / 800**, `line-height: 1.1`, `-0.02em`, `var(--fg)` (or `var(--fg-muted)` when `dim`) |
| MON  | Mono **9 / 700**, `.1em`, `var(--fg-subtle)`, uppercase                                          |

`fmtDate(iso)` parses `iso + "T20:00:00"`, `en-US`, `weekday: short` + `month: short`, both uppercased.

### `PriceChip` (artist-surface.jsx:190-201)

| State                     | Style                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Known                     | Mono **12 / 700**, `var(--fg)`, `padding: 4px 8px`, `border-radius: 6`, `background: var(--surface-2)`, `border: 1px solid var(--border)`, content `${price}` |
| Unknown (`price == null`) | Mono **10 / 600**, `letter-spacing: .06em`, uppercase, `var(--fg-subtle)`, **no box** — `priceUnknown` = **`tba`** (uppercased by CSS to TBA)                                      |

### `ShowRow` (artist-surface.jsx:203-219)

| Property  | Value                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Element   | full-row `<a>` to event detail, `className="ap-row"`, `text-decoration: none`, `color: inherit`                               |
| Box       | flex, `align-items: center`, `gap: 12`, **`min-height: 60`**, `padding: 8px 8px`, `margin: 0 -8px`, `border-radius: 8`        |
| Venue     | Inter **700 / 14**, `var(--fg)`, `nowrap` + ellipsis                                                                          |
| City      | Inter **11.5**, `var(--fg-muted)`, `margin-top: 2`                                                                            |
| Price     | `PriceChip`, right                                                                                                            |
| Hover     | `background: var(--overlay-hover)`                                                                                            |
| Divider   | 1px `var(--border)`, `margin-left: 56`, rendered **only between consecutive one-offs** (`i > 0 && shown[i-1].kind === "one"`) |
| Forbidden | No genre chips, no supporting-artist lines, no images                                                                         |

### `RunGroup` (artist-surface.jsx:223-260)

| Element    | Value                                                                                                                                                                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card       | `border-radius: 12`, `1px solid var(--border)`, `background: var(--surface-1)`, `padding: 12`, `margin: 2px 0`                                                                                                                                                                                                    |
| Header row | flex, `align-items: center`, `gap: 8`, `margin-bottom: 8`                                                                                                                                                                                                                                                         |
| Venue      | Inter **700 / 14**, `var(--fg)`, ellipsis                                                                                                                                                                                                                                                                         |
| City       | Inter **11.5**, `var(--fg-muted)`, `margin-top: 2`                                                                                                                                                                                                                                                                |
| Run chip   | Mono **9.5 / 700**, `.1em`, uppercase, `color: var(--signal)`, `padding: 4px 8px`, `border-radius: 5`, `background: color-mix(in oklab, var(--signal) 12%, transparent)`, `border: 1px solid color-mix(in oklab, var(--signal) 40%, transparent)`, `flexShrink: 0` — text `residencyRun(n)` = **"{n}-night run"** |
| Date rows  | `<a className="ap-row">`, flex, `gap: 12`, **`min-height: 44`**, `padding: 0 8px`, `margin: 0 -8px`, `border-radius: 6`, `border-top: 1px solid var(--border)` for all but the first                                                                                                                              |
| Date text  | Mono **11.5 / 700**, `.06em`, `var(--fg-muted)`, `width: 92`, `flexShrink: 0`, format `DOW MON D`                                                                                                                                                                                                                 |
| Spacer     | `flex: 1` between date and price                                                                                                                                                                                                                                                                                  |
| Price      | `PriceChip` per date                                                                                                                                                                                                                                                                                              |

### `groupShows` (artist-data.jsx:147-177) — **clustered, not span-based**

1. Bucket shows by `venue`.
2. Sort each venue's list ascending by date.
3. Walk consecutively; cut a new cluster whenever `gap > RESIDENCY_WINDOW (21 days)`.
4. A cluster becomes `{kind:"run"}` **only if both**: `length >= RESIDENCY_MIN (3)` **and**
   `(last - first) <= RESIDENCY_WINDOW`. Otherwise every member emits as `{kind:"one"}`.
5. Final `items` sorted by first date (run) / own date (one-off) — runs sit **inline** with one-offs.

Both tests are required: gap alone would render three nights 21 days apart as a "3-night run"
spanning six weeks (a tour, not a residency); first-vs-last alone would fail to group a band
that plays five nights in August and returns to the same room in November.

### Truncation (`UpcomingShows`, artist-surface.jsx:262-292)

| Aspect         | Value                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cap unit       | **items** — `items.length > SHOWS_VISIBLE (5)`; a run counts as **one** item                                                                                                                                      |
| Label unit     | **shows** — `showAll(artist.shows.length)` = **"Show all {n} shows"**, matching the head count                                                                                                                    |
| Collapsed      | `items.slice(0, 5)`                                                                                                                                                                                               |
| Expanded label | `showFewer` = **"Show fewer"**                                                                                                                                                                                    |
| Button         | `all: unset`, `cursor: pointer`, `margin-top: 10`, `width: 100%`, **`min-height: 44`**, flex-centred, `border-radius: 10`, `border: 1px solid var(--border-strong)`, `color: var(--fg-muted)`, Inter **13 / 700** |
| ARIA           | `aria-expanded` on both states                                                                                                                                                                                    |
| Section        | `<section aria-label={showsListAria(name)}>` = "Upcoming shows for {name}"; `SectionHead id="upcoming"`                                                                                                           |
| List gap       | flex column, `gap: 2`                                                                                                                                                                                             |

---

## 10. `PastShows` — "Previously" (artist-surface.jsx:299-327)

| Aspect       | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render gate  | `if (!past.length) return null` — **no empty state, no "0 shows" head**                                                                                                                                                                                                                                                                                                                                                                                                          |
| Section      | `<section aria-label={pastListAria(name)}>` = "Past shows we've recorded for {name}"                                                                                                                                                                                                                                                                                                                                                                                             |
| Head         | `SectionHead` title `pastTitle` = "Previously", count `showCount(past.length)`, **no `id`**                                                                                                                                                                                                                                                                                                                                                                                      |
| List         | `<ul>` `list-style: none`, `margin: 0`, `padding: 0`, flex column                                                                                                                                                                                                                                                                                                                                                                                                                |
| Row          | `<li>` flex, `align-items: center`, `gap: 12`, **`min-height: 38`**, `border-top: 1px solid var(--border)` for all but the first                                                                                                                                                                                                                                                                                                                                                 |
| Date         | Mono **11 / 600**, `.06em`, `var(--fg-subtle)`, `width: 74`, `flexShrink: 0`, format `MON D`                                                                                                                                                                                                                                                                                                                                                                                     |
| Venue        | Inter **13 / 600**, `var(--fg-muted)`, `flex: 1`, `minWidth: 0`, ellipsis                                                                                                                                                                                                                                                                                                                                                                                                        |
| Forbidden    | **No price, no link-out, no setlist, no artwork** — a past show isn't actionable                                                                                                                                                                                                                                                                                                                                                                                                 |
| Closing note | `<p>` `margin: 12px 0 0`, Inter **11.5 / 1.5**, `var(--fg-subtle)`, `text-wrap: pretty` — `pastNote(since)` = **"Concert Crawl started crawling in {since}. Shows before that aren't tracked."** Load-bearing; must not be dropped as decoration. On any page with 1+ past shows this is the _only_ place the crawl window is disclosed, which is why it cannot be cut. (At zero past shows this list does not render, and `historyNone(since)` carries the disclosure instead.) |
| Contract     | `history.count` **must equal** this list's row count                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Known gap    | No pagination. Fine at current crawl depth; needs Upcoming's truncation control after a year or a backfill (README gap #6, flagged not requested).                                                                                                                                                                                                                                                                                                                               |

---

## 11. `EmptyUpcoming` (artist-surface.jsx:332-347)

Props: `name`, `following`, `signedOut`, `inlineFollow = true` (desktop passes `false`).

| Element              | Value                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Head                 | `SectionHead id="upcoming"` title "Upcoming", **no count**                                                                         |
| Card                 | `border-radius: 14`, `border: 1px solid var(--border)`, `background: var(--surface-1)`, `padding: 18`                              |
| Title                | Inter **800 / 17**, `letter-spacing: -0.02em`, `var(--fg)` — `emptyTitle` = **"Nothing on the calendar."**                         |
| Body                 | `<p>` Inter **13 / 1.55**, `var(--fg-muted)`, `text-wrap: pretty`; margin `8px 0 16px` when `inlineFollow`, else `8px 0 0`         |
| Body — not following | `emptyBody` = **"No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking."**  |
| Body — following     | `emptyBodyFollowing` = **"No dates booked that we can see. You're following, so the next one lands in your Watching on its own."** |
| Follow               | Full-width `FollowButton` when `inlineFollow` (mobile). Desktop omits it — the sticky rail already has one.                        |

Not a notification promise — Phase 7 rule: no "we'll notify you"-class copy until #737 ships.

---

## 12. Loading — two independent clocks

### Clock 1 · artist fetch — full page skeleton

| Piece             | Mobile                                                          | Desktop                                                            |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| Plate             | `HeroSkeleton height={heroH}`, `border-radius: 0`, width 100%   | `HeroSkeleton height={320}` inside the radius-14 rail box          |
| Name bar          | `TextSkeleton w="72%" h={30}`                                   | `w="60%" h={40}`                                                   |
| History bar 1     | `w="94%" h={11} mt={16}`                                        | `w="92%" h={12} mt={18}`                                           |
| History bar 2     | `w="66%" h={11} mt={8}`                                         | `w="58%" h={12} mt={8}`                                            |
| Follow bar        | `.ap-skel`, `height: 48`, `border-radius: 10`, `margin-top: 20` | rail: `.ap-skel` `height: 48`, radius 10 (in `marginTop: 16` slot) |
| Shows             | `ShowsSkeleton rows={3}` in `marginTop: 30`                     | `ShowsSkeleton rows={4}` in `marginTop: 34`                        |
| Back chip / crumb | Back chip still rendered over the skeleton                      | `Crumb` still rendered                                             |

`ShowsSkeleton` (artist-surface.jsx:358-375): `role="status"`, `aria-busy="true"`, flex column
`gap: 14`; visually-hidden `<span>` (`position: absolute; width:1; height:1; overflow:hidden;
clip: rect(0 0 0 0)`) containing `loadingArtist` = **"Finding them…"**. Each row: flex,
`gap: 12`, `min-height: 44`; 44×40 radius-8 block; then `TextSkeleton w="62%" h={13}` +
`w="34%" h={10} mt={7}`; then 42×22 radius-6 block.

`TextSkeleton`: `.ap-skel`, props `w`, `h = 12`, `mt = 0`.

Shimmer everywhere: `.ap-skel:after`, `ap-sh 1.4s ease-in-out infinite`,
`linear-gradient(90deg, transparent, var(--overlay-hover), transparent)`.

### Clock 2 · player

Page fully readable and shows list interactive while the iframe is blank; well reserves the
exact final height. **The page must never block on the embed, and the embed must never cause
layout shift.**

---

## 13. Responsive behaviour

| Breakpoint / surface        | What changes                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **≥360px mobile (default)** | Hero 200px · name 31px · gutters 18px                                                                                                                                                                                                                                                                  |
| **<360px (`AP_NARROW_BP`)** | Hero **150px** · name **27px** · gutters **14px**. Player keeps 152px untouched. Nothing removed, nothing behaves differently.                                                                                                                                                                         |
| **320px**                   | Design floor — renders the narrow layout; not its own breakpoint                                                                                                                                                                                                                                       |
| **Desktop**                 | `<main maxWidth: 940; margin: 0 auto; padding: 34px 40px 60px>`; grid `320px 1fr`, `gap: 40`, `align-items: start`; left rail `position: sticky; top: 24`; breadcrumb replaces back chip; **no sub-header**; `EmptyUpcoming` gets `inlineFollow={false}`; history capped at `maxWidth: 560`; name 42px |
| **Embed height**            | 152 (compact) everywhere; 352 (tall) is a **desktop-only option at most**                                                                                                                                                                                                                              |

---

## 14. Accessibility

| Requirement     | Specification                                                                                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landmark        | `<main aria-label={pageAria(name)}>` = **"Artist page for {name}"**                                                                                                                                                                                                                                                                     |
| Heading outline | `<h1>` artist name; real `<h2>` per section via `SectionHead` (styled to 15px). **Do not ship section heads as styled `<span>`s.**                                                                                                                                                                                                      |
| Section labels  | `showsListAria(name)` = "Upcoming shows for {name}"; `pastListAria(name)` = "Past shows we've recorded for {name}"                                                                                                                                                                                                                      |
| Focus order     | back → follow → **skip player** → iframe → show rows → show-all                                                                                                                                                                                                                                                                         |
| Skip link       | Visually hidden until focus; 44px min-height when visible; `href="#upcoming"`; **not rendered when the player is the last block**                                                                                                                                                                                                       |
| iframe          | We own its `title`, its position in the sequence, a labelled route past it, and the rule that **no information on this page lives only inside the player.** We do **not** own its internal tab stops, labels, focus rings or contrast — say so in the a11y audit rather than claiming coverage.                                         |
| Follow          | `aria-pressed` (omitted when signed out) + full-sentence `aria-label`; state never colour-only (check glyph carries it)                                                                                                                                                                                                                 |
| Show-all        | `aria-expanded` in both states                                                                                                                                                                                                                                                                                                          |
| Loading         | `role="status"`, `aria-busy="true"`, visually-hidden "Finding them…" (clock 1) and on the player well (clock 2)                                                                                                                                                                                                                         |
| Touch targets   | **≥44px everywhere including tertiary**: back chip (36 visible / 44 hit area), sticky-bar back + follow, every date row inside a run card, show-all, skip link                                                                                                                                                                          |
| Focus ring      | `var(--focus)` — skip link uses `outline: 2px solid var(--focus)`, `outline-offset: 2`                                                                                                                                                                                                                                                  |
| Contrast        | Claimed as a **token-pair** property: `--fg` / `--fg-muted` / `--fg-subtle` on `--bg` and `--surface-1`; `--signal` fills against `--fg-on-accent`. Two non-token-pair cases named individually: back-chip ink `var(--fg)` on `var(--scrim)` (verify in Light, scrim 0.40 vs 0.72), and the embed interior (theirs, outside our audit). |
| Elevation       | No `--shadow` token exists and nothing here needs one — `--surface-1` + `--border` only                                                                                                                                                                                                                                                 |

---

## 15. Complete user-facing string inventory (`ARTIST_COPY`, verbatim)

| Key                      | String                                                                                                          | Surface                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `backLabel`              | `Back`                                                                                                          | back chip + sticky-bar back (`aria-label`) |
| `crumbRoot`              | `Browse`                                                                                                        | desktop breadcrumb                         |
| `follow`                 | `Follow`                                                                                                        | follow button, not-following               |
| `following`              | `Following`                                                                                                     | follow button, following                   |
| `followPitch`            | `Every show they book lands in your Watching.`                                                                  | follow sub-line, not following             |
| `followPitchActive`      | `Their shows land in your Watching.`                                                                            | follow sub-line, following                 |
| `followSignedOut`        | `Sign in to follow`                                                                                             | follow button + `aria-label`, signed out   |
| `followSignedOutPitch`   | `Following needs an account. Everything else here doesn't.`                                                     | follow sub-line, signed out                |
| `followAria(name)`       | `Follow {name} — every show they book is added to your Watching`                                                | follow `aria-label`                        |
| `followingAria(name)`    | `Following {name}. Activate to stop following.`                                                                 | follow `aria-label`                        |
| `historyNone(since)`     | `First time we've caught them. We only started looking in {since}.`                                             | history line                               |
| `historyOne(venue)`      | `We've caught them once: {venue}.`                                                                              | history line                               |
| `historyMany(n, venues)` | `{n} shows on our map: {venues}.`                                                                               | history line                               |
| `pastTitle`              | `Previously`                                                                                                    | past section head                          |
| `pastNote(since)`        | `Concert Crawl started crawling in {since}. Shows before that aren't tracked.`                                  | past section closer                        |
| `playerRail`             | `Player · Spotify`                                                                                              | embed rail, left                           |
| `playerRailThirdParty`   | `third party`                                                                                                   | embed rail, right                          |
| `playerShelfTitle`       | `Have a listen`                                                                                                 | shelf direction only (not shipping)        |
| `playerPreviewNote`      | `30-second previews. Full tracks if you're signed into Spotify.`                                                | embed caption + loading caption            |
| `playerLoading`          | `Loading the player…`                                                                                           | embed loading well                         |
| `playerSkip`             | `Skip player, go to shows`                                                                                      | skip link                                  |
| `playerTitle(name)`      | `Spotify player for {name}`                                                                                     | iframe `title` (+ stand-in `aria-label`)   |
| `playerNoneRail`         | `No player`                                                                                                     | absent-player rail                         |
| `playerNone`             | `We don't have them on Spotify.`                                                                                | absent-player sentence                     |
| `playerNoneSub`          | `Doesn't mean much — plenty of good bands aren't. Their shows are below.`                                       | absent-player continuation                 |
| `upcomingTitle`          | `Upcoming`                                                                                                      | upcoming + empty section head              |
| `showCount(n)`           | `{n} show` / `{n} shows`                                                                                        | upcoming + past section head counts        |
| `residencyRun(n)`        | `{n}-night run`                                                                                                 | run card chip                              |
| `showAll(n)`             | `Show all {n} shows`                                                                                            | truncation button, collapsed               |
| `showFewer`              | `Show fewer`                                                                                                    | truncation button, expanded                |
| `priceUnknown`           | `tba`                                                                                                           | price chip, unknown                        |
| `emptyTitle`             | `Nothing on the calendar.`                                                                                      | empty-upcoming card title                  |
| `emptyBody`              | `No dates booked that we can see. Follow them and the next one shows up in your Watching without you checking.` | empty card, not following                  |
| `emptyBodyFollowing`     | `No dates booked that we can see. You're following, so the next one lands in your Watching on its own.`         | empty card, following                      |
| `loadingArtist`          | `Finding them…`                                                                                                 | visually-hidden, clock 1                   |
| `pageAria(name)`         | `Artist page for {name}`                                                                                        | `<main aria-label>`                        |
| `showsListAria(name)`    | `Upcoming shows for {name}`                                                                                     | upcoming `<section aria-label>`            |
| `pastListAria(name)`     | `Past shows we've recorded for {name}`                                                                          | past `<section aria-label>`                |

Voice: Sour Patch with the honesty rail dominant. **Banned:** "fraud", "last chance", any
"we'll notify you"-class promise until notifications ship. Also grepped clean of "N other
users" and "event".

### Vocabulary check against CLAUDE.md's locked table

**No violations.** "Watching" is used correctly and exclusively (`followPitch`,
`followPitchActive`, `emptyBody`, `emptyBodyFollowing`, `followAria`); no "Saved", "Favorites",
or renaming of Watching appears anywhere. **Note for builders:** "Follow" here is a _new,
artist-scoped_ concept (`user_artist_follows`) and is deliberately described in terms of what
it does _to Watching_ — it is not a synonym for Watching. The locked table bans "Following" as
a synonym **for Watching**, which this is not. Keep the framing: following an artist feeds
Watching; it never replaces or renames it.

---

## 16. Full state matrix (every combination the handoff draws or specifies)

| #   | Surface      | State                                                  | Drawn at                                       |
| --- | ------------ | ------------------------------------------------------ | ---------------------------------------------- |
| 1   | Artist page  | Populated, Spotify-known                               | mobile 390 · 320 · desktop                     |
| 2   | Artist page  | Populated, no Spotify (= unresolved match)             | mobile 390 · 320 · desktop                     |
| 3   | Artist page  | No upcoming · Spotify-known                            | mobile 390 · 320 · desktop                     |
| 4   | Artist page  | No upcoming · IdentityArt fallback                     | mobile 390                                     |
| 5   | Artist page  | Many upcoming (residency + one-offs)                   | mobile 390 · 320 · desktop                     |
| 6   | Artist page  | Loading clock 1 (artist fetch skeleton)                | mobile 390 · desktop                           |
| 7   | Artist page  | Loading clock 2 (player pending, page live)            | mobile 390 · desktop                           |
| 8   | Follow       | Not following                                          | mobile · desktop                               |
| 9   | Follow       | Following                                              | mobile · desktop                               |
| 10  | Follow       | Signed out                                             | mobile · desktop                               |
| 11  | Follow       | Pre-toggled from connected Spotify (discloses nothing) | prose only                                     |
| 12  | Sticky bar   | With shows, not following                              | mobile                                         |
| 13  | Sticky bar   | With shows, following                                  | mobile                                         |
| 14  | Sticky bar   | **No shows — back + name only, no follow**             | mobile (`em-sticky`/`f-stick3`)                |
| 15  | Desktop rail | Scrolled, rail pinned                                  | desktop (`f-deskrail`/`d4`, scrollTop 420/520) |
| 16  | Plate        | Has photo (cover-cropped, `--image-tint`)              | all                                            |
| 17  | Plate        | No photo / expired URL → `IdentityArt` hard-swap       | all                                            |
| 18  | Player       | Mat, present, loaded                                   | Electric / Jade / Light                        |
| 19  | Player       | Loading well (exact height + shimmer)                  | mobile                                         |
| 20  | Player       | Absent (`No player` + one sentence)                    | mobile                                         |
| 21  | Player       | Shelf / Flush directions (rejected alternatives)       | Electric + Light                               |
| 22  | Upcoming     | One-offs only, under cap                               | all                                            |
| 23  | Upcoming     | Run group present (residency card)                     | all                                            |
| 24  | Upcoming     | Over cap, collapsed (`Show all N shows`)               | mobile · desktop                               |
| 25  | Upcoming     | Over cap, expanded (`Show fewer`)                      | mobile · desktop                               |
| 26  | Upcoming     | Empty (card + inline follow, mobile)                   | mobile                                         |
| 27  | Upcoming     | Empty (card, **no** inline follow)                     | desktop                                        |
| 28  | Empty card   | Body variant — not following                           | both                                           |
| 29  | Empty card   | Body variant — following                               | both                                           |
| 30  | Price chip   | Known price                                            | all                                            |
| 31  | Price chip   | `tba`                                                 | all                                            |
| 32  | Previously   | Multi-row list                                         | mobile · desktop · Light                       |
| 33  | Previously   | Single row                                             | mobile                                         |
| 34  | Previously   | **Absent — section does not render at all**            | mobile                                         |
| 35  | History line | Zero (`historyNone`)                                   | all                                            |
| 36  | History line | One with venue (`historyOne`)                          | all                                            |
| 37  | History line | One without venue → falls back to `historyNone`        | code only                                      |
| 38  | History line | Many (`historyMany`)                                   | all                                            |
| 39  | Skip link    | Hidden (unfocused)                                     | all with-shows states                          |
| 40  | Skip link    | Focused (44px, outlined)                               | a11y artboard                                  |
| 41  | Skip link    | **Not rendered** (no-shows / loading)                  | `a3`                                           |
| 42  | Themes       | Electric / Jade / Light full page (+ empty, fallback)  | mobile · desktop                               |

---

## 17. Ambiguities, silences, and conflicts — findings for the builders

1. **Name letter-spacing conflicts.** `CLAUDE_CODE_HANDOFF.md` §Name pins `-0.035em` for all
   three sizes; `artist-page.jsx:159` uses `-0.04em` on desktop (and `-0.035em` on mobile).
   Pick one and note it.
2. **Hover / active / disabled treatments are almost entirely unspecified.** Only
   `.ap-row:hover` (rows and run-card date rows) and `.ap-page a:hover` are defined. The
   handoff specifies **no** hover, active, pressed, or disabled state for `FollowButton`, the
   `Show all / Show fewer` button, `BackChip`, the sticky-bar back button, or the breadcrumb
   link. There is no in-flight/optimistic state for the follow write, and no error state if it
   fails.
3. **Focus-visible styling is specified only for the skip link.** Every other interactive
   element ("focus ring `--focus`") is asserted in prose with no dimensions, offset, or radius.
4. **Reduced motion is never mentioned.** The shimmer (`ap-sh 1.4s infinite`) has no
   `prefers-reduced-motion` guard anywhere in the bundle.
5. **No page-level error state.** Artist fetch failure, 404 on an unknown slug, and iframe load
   failure are all unspecified. The handoff covers loading and empty, not error.
6. **Sticky-bar appearance is not animated or specified.** "Appears when the hero name leaves
   the viewport" — no transition, no threshold value, no scroll-direction rule. The prototype
   fakes it with a `scrolled` boolean.
7. **`dim` prop on `DateStamp` is never used** by any caller. It exists (`var(--fg-muted)`
   instead of `var(--fg)` on the day number) with no state that triggers it.
8. **Desktop `EmptyUpcoming` + signed-out is a soft hole.** Desktop passes `inlineFollow={false}`
   because the rail has a follow — correct — but the signed-out desktop no-shows state means the
   conversion pitch and the "Sign in to follow" control sit in two different columns. Not drawn.
9. **`tall` (352px) embed variant has no decision.** "Desktop-only at most" is not a shipping
   rule. Treat compact-only as the default unless someone rules otherwise.
10. **Run-card date rows link to event detail, but there is no visual link affordance** beyond
    the `.ap-row` hover — and on touch there is no hover. Same for `ShowRow`.
11. **Sold-out / cancelled / postponed shows have no treatment.** The show shape is
    `{iso, venue, city, price}` only.
12. **Multi-day span display inside a run card is per-date rows only.** No summary range
    ("Aug 5–9") is specified; the chip carries only the count.
13. **`EmbedAbsent` renders no skip link and no `id="upcoming"` interaction** — fine, but note
    that the absent-player branch also short-circuits the `loading` branch, so an artist with no
    `spotifyId` never shows a loading well. Intentional-looking, unstated.
14. **Time-of-day / doors is absent from show rows entirely** (`fmtDate` hardcodes `T20:00:00`
    purely to dodge timezone rollover). Rows show date only. If event detail shows a time, the
    artist page deliberately doesn't.
15. **Past-list pagination absent** (README gap #6) and **no share affordance** (gap #7) — both
    explicitly flagged by Design as future work, not gaps to close now.
16. **Back-chip hit-area fix on Event Detail v2 / Venue Profile** is recommended by the handoff
    (gap #3, READINESS open item #4) but is out of this surface's own boundary.
17. **Supporting-artist link affordance on event detail is undesigned** (gap #4, READINESS open
    item #2) — it is the dependency that makes this route reachable and has no home.
18. **`embedPlate`'s `direction` argument should be dropped if only mat ships** (READINESS open
    item #5) — an explicit decision the handoff defers.
