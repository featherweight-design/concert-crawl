# 404 — Engineering Handoff

**Concert Crawl · Phase 8.x** · `/404` catch-all route (Next.js: `apps/web/src/app/not-found.tsx`).

A single full-bleed screen. The user landed here because the URL is wrong or the show is gone — we don't pretend they're still inside an app shell. No `AppBar`, no `FilterBar`, no bottom nav. Brand presence is carried by the IdentityArt poster anchor and the wordmark overlaid on it.

> Open `Not Found.html` in the canvas viewer. The bottom-right Tweaks panel cycles theme, poster seed, and attempted path on the live artboards.

---

## At a glance

|                     | Mobile                                 | Desktop                                       |
| ------------------- | -------------------------------------- | --------------------------------------------- |
| **Layout**          | Stacked — poster on top, content below | Two-column — poster left (560), content right |
| **Poster size**     | `100% × 444`                           | `560 × 100%`                                  |
| **Content padding** | `22 24 32`                             | `64 80`                                       |
| **Headline size**   | `Inter 900 / 38 / -0.035em`            | `Inter 900 / 56 / -0.04em`                    |
| **CTA shape**       | full-width, h 48                       | intrinsic, h 52                               |

Same anatomy in both: `poster → status-rail → headline → body → CTA → mono-footer`. The split point in production is `768px` — at that threshold flip `flex-direction` and swap the size constants.

---

## Files

| File                                                     | Role                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Not Found.html`                                         | Canvas — all artboards + Tweaks panel                                                 |
| `not-found-screen.jsx`                                   | `<NotFoundScreen>` + sub-components                                                   |
| `not-found-canvas.jsx`                                   | Canvas wiring + annotation overlays                                                   |
| `theme-context.jsx`                                      | Token sets for Electric / Jade / Light — copied from the design system; do not modify |
| `identity-art.jsx`                                       | Phase 7.5 IdentityArt engine — copied as a sibling; do not modify                     |
| `design-canvas.jsx`, `tweaks-panel.jsx`, `ios-frame.jsx` | Presentation-only scaffolding                                                         |

In your codebase: build `<NotFoundScreen>` from this reference; pull tokens from your existing `theme-context`; import IdentityArt from its single source of truth (`apps/web/src/lib/identity-art.tsx`) — don't ship the local copy. Mount it from `app/not-found.tsx`.

---

## Flavors

The same anatomy ships in three flavors. **Pick one at the route level; don't mix.**

| `flavor`             | When to use                                                                                                                                              | Headline                        | Poster meta                                                                                                |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `"show"` _(default)_ | Catch-all 404 from event-shaped URLs (anything under `/shows/*`, `/artists/*`, `/venues/*`). The brand-locked one.                                       | _"That show doesn't exist."_    | Full gig-poster faux-meta — `Denver · 404` eyebrow, `Cancelled` pill, `404` stamp, strikethrough fake date |
| `"generic"`          | Catch-all 404 from non-event URLs (legal pages, marketing routes, settings deep-links, the literal `/foo` typo). Show metaphor would be too on-the-nose. | _"Page not found."_             | Stripped — just the IdentityArt + the `404` stamp. Eyebrow says `concertcrawl`, no pill, no fake date.     |
| `"display"`          | When the design needs a brutalist beat — error / maintenance / future variants. The number IS the headline.                                              | _"404."_ (Inter 900 / 96–132px) | Stripped further — no `404` stamp on the poster (headline carries it).                                     |

In production, the route file picks the flavor:

```ts
// apps/web/src/app/shows/[slug]/not-found.tsx
export default () => <NotFoundScreen flavor="show" attemptedPath={…}/>;

// apps/web/src/app/not-found.tsx  (the global catch-all)
export default () => <NotFoundScreen flavor="generic" attemptedPath={…}/>;
```

The display flavor is reserved — flag for product discussion before shipping anywhere.

---

## Components

### `<NotFoundScreen chrome posterName attemptedPath themeKey flavor />`

The whole screen. Dispatcher; renders `NotFoundScreenMobile` below 768px and `NotFoundScreenDesktop` above. Both internally use the same `<NFContent>` so any copy or layout-token change applies to both breakpoints.

Props:

- `chrome: "mobile" | "desktop"` — set on the server from the request UA, or let CSS do it via a single `@media (min-width: 768px)` rule and skip the JS dispatcher. Either is fine — design accepts both.
- `posterName?: string` — feeds `IdentityArt`'s hash. **Default `"404"`. Ship this exact string** so the poster is consistent across the userbase. If you want to rotate, see _Poster name_ below.
- `attemptedPath?: string` — the URL the user tried. Default `"/"`. Pull from `headers().get('x-pathname')` (or your framework equivalent).
- `themeKey?: "electric" | "jade" | "light"` — passthrough to `ThemeProvider`. Read from the user record like every other consumer page.
- `flavor?: "show" | "generic" | "display"` — see _Flavors_ above. Default `"show"`.

### `<NFPoster posterName scale />`

The visual anchor. Wraps `<IdentityArt>` and overlays:

- **Top-left** — small mono eyebrow: `• Denver · 404`. Borrowed from the LandingPoster city-line pattern; here the "city" reads as the error itself.
- **Top-right** — `Cancelled` pill. Same shape as the `TONIGHT / SOLD OUT / PRICE DROP` state pill on real LandingPosters; "Cancelled" closes the gig-poster metaphor.
- **Bottom-left** — chunky `404` stamp (Inter 900 / 52 / -0.045em on hero scale). Replaces IdentityArt's built-in initials chip — same anchor, same chip backplate, but the "initials" are the error code. The chip's `bg` + `color` flip based on `ia_isDark(palette.bg)` so contrast holds across light- and dark-paper IdentityArt palettes.
- **Bottom-right** — strikethrough faux date: `tonight · 8pm`. Reads as "this show was going to happen and didn't." Mono 11 / 700.

The poster is intentionally fixed (deterministic from `posterName`), **not theme-aware**. IdentityArt palettes are hashed from the name string, not the active theme — that's by design (matches LandingPoster). The poster is a visual constant; everything around it retints with the theme.

### `<NFContent chrome attemptedPath />`

The text stack. Anatomy top-to-bottom:

1. **Status rail** — `• ROUTE NOT FOUND ─── 404`. Borrowed verbatim from `<EmptyState variant="hybrid">`'s mono rail. Dot uses `var(--accent)` (not `--signal`) because this is a "thing is missing" state, not a "go do this" state — same convention `EmptyState` uses for `state="no-data"`.
2. **Headline** — `That show doesn't exist.` Inter 900. Voice matches the empty-state directive in CLAUDE.md: "playful + clear" — period-terminated, declarative, no apology, no exclamation point.
3. **Body** — `Wrong night, wrong URL, or it got pulled. Either way — Denver's got plenty going on tonight.` Inter 500 / 14.5. Brand-locked Denver reference; reads like a friend, not an error page.
4. **Primary CTA** — `Browse tonight's shows →`. Single CTA, no secondary. The whole point is to send the user back to Browse — adding a "search" or "go back" muddies the decision.
5. **Mono footer** — labelled `You tried` with the attempted path beneath. Reads as a server log line, gives the user feedback that we _saw_ their URL.

There is intentionally **no "Report this" affordance** in v1. If a path is referenced enough to matter, it'll show up in logs.

---

## Tokens used

All from the existing 3-theme token set in `theme-context.jsx`. **No new tokens proposed.**

| Use                         | Token                                     |
| --------------------------- | ----------------------------------------- |
| Page background             | `var(--bg)`                               |
| Primary text (headline)     | `var(--fg)`                               |
| Secondary text (body)       | `var(--fg-muted)`                         |
| Mono footer label + path    | `var(--fg-subtle)` / `var(--fg-muted)`    |
| Status-rail dot + label     | `var(--accent)`                           |
| Status-rail rule            | `var(--border)`                           |
| Status-rail "404" code      | `var(--fg-subtle)`                        |
| Primary CTA bg              | `var(--signal)`                           |
| Primary CTA text            | `var(--fg-on-accent)`                     |
| Wordmark overlay scrim      | `var(--scrim)`                            |
| Poster→bg fade-out (mobile) | `linear-gradient(transparent, var(--bg))` |

Poster ink + chip colors come from `ia_isDark(identity.palette.bg)` — IdentityArt's own contrast helper. **Do not** override these with theme tokens; the poster needs to read against its own paper regardless of which theme is active.

---

## Type system

Inter (UI) + JetBrains Mono (metadata), no other typefaces. Per CLAUDE.md.

| Element             | Family / weight / size / tracking / leading       |
| ------------------- | ------------------------------------------------- |
| Headline · mobile   | Inter 900 · 38 · -0.035em · 1.0                   |
| Headline · desktop  | Inter 900 · 56 · -0.04em · 1.0                    |
| Body                | Inter 500 · 14.5 / 16 (desktop) · -0.005em · 1.55 |
| CTA label           | Inter 800 · 14.5 / 15 (desktop) · -0.01em         |
| Status-rail label   | JetBrains Mono 700 · 10.5 · 0.16em · uppercase    |
| Status-rail code    | JetBrains Mono 700 · 10.5 · 0.14em · uppercase    |
| 404 stamp on poster | Inter 900 · 52 · -0.045em (hero scale)            |
| Poster eyebrow      | JetBrains Mono 700 · 10 · 0.16em · uppercase      |
| Mono footer label   | JetBrains Mono 700 · 9.5 · 0.14em · uppercase     |
| Mono footer path    | JetBrains Mono 500 · 11.5 · 0.01em                |

Wordmark lockup (CCMark + `concertcrawl.`) uses the canonical sizing from `browse-home.jsx → AppBar`: Inter 800 · 17 (mobile) / 19 (desktop) · -0.02em. **Do not restyle.** The `.` is `var(--accent)`.

---

## Poster name

Default: `posterName="404"`. This is deterministic — same string in, same poster out. Ship the default and the entire userbase sees the same art block; that's a small brand asset.

If product wants the poster to feel alive at the cost of consistency, mount-time pick from this curated list:

```ts
const POSTER_SEEDS = [
  '404',
  'the show that wasnt',
  'ghost set',
  'wrong night friend',
  'tonight in denver',
  'lost gig',
]
const posterName = POSTER_SEEDS[Math.floor(Math.random() * POSTER_SEEDS.length)]
```

Each seed maps to a different IdentityArt palette × template combo. All six are pre-verified in the canvas (`6 · Poster · alternate seeds`).

---

## Accessibility

- `<h1>` is the headline. There is exactly one `h1` on the page.
- Status rail is decorative — no semantic markup, do not promote to a heading.
- Primary CTA is a real `<a href="/">`. Don't replace with a button — back-to-home should work without JS, and respond to middle-click / cmd-click like any link.
- Poster has no `alt` text needed — it's decorative, anchored by the visible `404` stamp. If you wrap `<IdentityArt>` in an `<img>` shim for static-export reasons, set `alt=""`.
- The mono footer's attempted-path is informational; render it as plain text. If users start asking "what does that mean?" we'll add a `<title>` tooltip later.
- Color contrast: all `--fg-muted` text on `--bg` checks WCAG AA across all three themes (verified in `theme-context.jsx`'s existing token contracts).

---

## Engineering notes

- **No router-back affordance.** A "← Go back" link is tempting but bad here: the previous entry might also be a dead URL (someone refreshing after we deleted an event), or might not exist at all (user pasted the URL fresh). One CTA, one destination — `/`.
- **`attemptedPath` source.** In Next.js: read from request headers (`headers().get('x-invoke-path')` or middleware-injected `x-pathname`), not from `window.location` — this component renders server-side on the 404 route. Falling back to `"/"` if unavailable is fine; the footer hides nothing meaningful in that case.
- **Caching.** This page should respond `200 OK` (Next.js soft 404) for client routing and `404 Not Found` for direct hits. Standard `not-found.tsx` behaviour — nothing custom needed.
- **No telemetry on this surface.** A "user hit 404" pageview is enough; we don't need granular event tracking on the CTA. Sentry breadcrumb if you want the attempted-path in error reports.

---

## Out of scope

- Soft-404 for unrecognised event slugs (e.g. `/shows/this-doesnt-exist`) — that's an Event-Detail-flavoured empty state, not the catch-all 404. Different copy ("That show isn't in our calendar." + venue/artist search suggestions). Flag for a follow-up if we want it.
- Maintenance / 5xx pages — those are a separate variant of this same anatomy (different headline, different status-rail code). Easy to copy when needed; out of scope for this pass.
- Authenticated vs. anonymous variants — the 404 doesn't change based on auth state. If we ever do a "we found a show like this in your saved list" variant, that's a different surface.

---

## Open questions for engineering

1. **Path source on App Router.** Confirm the header / context you want me to read `attemptedPath` from — I've defaulted the API to take a string prop so the page is decoupled from the framework.
2. **Soft 404 for unknown event slugs.** Worth a dedicated variant, or route everything through this catch-all? My read: dedicated for events (we know enough to suggest related artists/venues), this catch-all for the rest.
3. **Mount-time poster rotation.** Ship `"404"` only, or rotate from the curated list? I prefer the consistent single, but the rotated set is pre-verified if product disagrees.
