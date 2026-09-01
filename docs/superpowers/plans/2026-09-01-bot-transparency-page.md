# /bot crawler transparency page — implementation plan

**Issue:** #1228 · **Gate:** B (launch bar) · **Design handoff:** `design/design_handoff_bot_page/`
**Readiness verdict:** 🟡 Yellow (`design/design_handoff_bot_page/READINESS.md`, PR #1638)

## Why

Every request our crawler makes carries `ConcertCrawl/1.0 (+https://concertcrawl.app/bot)`. That
URL 404s. A venue operator who finds us in their logs and follows the link lands on nothing, which
is the opposite of the transparency the honest User-Agent exists to signal. The launch bar calls
this "the cheapest item in the entire bar and the least skippable."

## Shape

Two PRs, in order. PR-A must merge first: it makes a claim on the page true before the page makes
it.

| PR | Scope | Package |
| --- | --- | --- |
| **A** | `Crawl-delay` parsing + cap | `packages/crawler-core` |
| **B** | The `/bot` page | `apps/web` |

---

## PR-A — Honour `Crawl-delay`

`parseRobotsTxt` (`packages/crawler-core/src/lib/robots.ts:14`) reads only `User-Agent:` and
`Disallow:`. Our 3-second spacing is our own default, not the site's stated preference. Deferred on
2026-08-29 with the decision to fold it into this build rather than build it standalone — the page
says we honour `Crawl-delay`, so either this ships or that row comes out.

### Changes

1. **`getCrawlDelayMs(url, userAgent): Promise<number | null>`** — new export from `robots.ts`.
   Reuses `fetchRobotsTxt`, so it hits the existing per-process `robotsTextCache` and adds no
   network call on top of the `isAllowed` gate that already ran.

2. **Extend the group-tracking loop** to collect `Crawl-delay:` alongside `Disallow:`, honouring the
   same specific-agent-beats-wildcard precedence already implemented at `robots.ts:49`. Values are
   seconds and may be fractional. A malformed or negative value is treated as absent, not as zero —
   an unparseable directive must never make us faster.

   **Fix multi-`User-agent` groups while in this code.** The loop reassigns `inSpecificGroup` on
   every `User-agent:` line (`robots.ts:39`), so consecutive agent lines don't accumulate — they
   overwrite. A group written the normal way:

   ```
   User-agent: ConcertCrawl
   User-agent: BingBot
   Crawl-delay: 10
   ```

   currently matches only on the last line read: `BingBot` sets both group flags false, so the
   `Crawl-delay` meant for us is dropped entirely. (A second agent of `*` would *not* show the bug —
   it lands in the wildcard bucket, which still applies to us.) This is a
   pre-existing `Disallow` bug, not something `Crawl-delay` introduces, but it would silently apply
   the wrong delay and it is a few lines to fix: accumulate agent lines into the active group until
   the first non-`User-agent:` directive, then treat the group as matching if *any* of them match.
   Tests cover both directives against a multi-agent group.

   **Comment lines must not end a group either.** `robots.ts:29` clears both group flags on a `#`
   line as well as a blank one. Per RFC 9309 a blank line does end a group — that half is correct
   and stays — but a comment does not, so the common layout

   ```
   User-agent: ConcertCrawl
   # be gentle, this box is small
   Crawl-delay: 10
   ```

   drops the directive today. Same one-line class of fix, same PR, covered by the same tests.
   Comments *trailing* a directive on the same line stay out of scope; nothing we claim depends on
   them.

3. **Resolve once per venue** in `crawl.ts`, next to the existing `isAllowed` call at line 406:

   ```
   const effective = Math.min(
     Math.max(venue.crawlDelayMs, robotsDelayMs ?? 0),
     CRAWL_DELAY_CAP_MS,
   )
   ```

   `max` because we never speed up because a site permits it. `min` because a site can otherwise
   stall a nightly run past its deadline budget — `Crawl-delay: 300` across a handful of venues
   would blow the pass (the #1199 class of problem). **Cap: 30 seconds**, logged as
   `robots.crawl_delay_capped` with the requested and applied values whenever it bites, so a venue
   asking for more than we give them is visible rather than silent.

   The per-fetcher `isAllowed` calls (`detail-page.ts`, `livenation.ts`, `aeg.ts`) are access gates
   and stay untouched — spacing is already threaded through `crawlDelayMs` from this one resolution.

### Tests

`parseRobotsTxt` is private and the existing suite in `robots.test.ts` drives it through `isAllowed`.
Keep that shape — test the new behaviour through `getCrawlDelayMs` rather than exporting the helper.

Unit: absent directive → `null`; specific agent beats
wildcard; fractional seconds; malformed and negative values → `null`; a value below our 3s default
does not lower the floor; a value above the cap is capped and logged. Plus one on the resolution
expression itself for the `max`-then-`min` ordering.

---

## PR-B — The page

### Route and structure

`/legal` is the closest analogue and the pattern to follow: a Server Component rendering from a
copy object, full-bleed container, Tailwind token classes, no nav, no auth, no data fetching. There
is no `/legal` layout — each page stands alone, which is what we want here.

- `apps/web/src/app/bot/page.tsx` — Server Component, five sections
- `apps/web/src/app/bot/definitions/copy.ts` — `BOT_COPY`, `as const`
- Local wrapper components for the five structural repeats the prototype identifies: `FactGroup`,
  `FactRow`, `BotSectionHead`, `CopyBlock`, `ContactCard`. `CopyBlock` is the only client
  component — it owns the clipboard button.

The prototype ships inline styles and raw CSS custom properties. Translate to the app's Tailwind
token classes (`bg-bg`, `text-fg`, `text-fg-muted`, `border`, `surface-1`); keep the prototype's one
breakpoint at 560px (168px mono key column above, stacked below).

### ⚠️ Three traps

1. **`/bot` goes in `isAlwaysPublic`, NOT `isPublicOnceLaunched`** (`apps/web/src/middleware.ts:18`),
   next to `/legal(.*)`. In `isPublicOnceLaunched` the crawler would spend the whole private beta
   advertising a URL that bounces venue operators to a sign-in wall. The handoff calls this the
   single highest-risk line in the build, and it is.

2. **Do NOT copy `robots: { index: false }` from the `/legal` pages.** All three legal pages set it
   per-page, each at line 8 — `apps/web/src/app/legal/privacy/page.tsx`,
   `.../legal/terms/page.tsx`, `.../legal/beta/page.tsx` — and nothing is inherited, so this
   is an omission rather than an override — but it is easy to paste in by reflex. Terms and privacy
   should not be searchable; this page must be. An operator without the exact URL will search
   "ConcertCrawl bot", and finding nothing reads as "unidentified scraper, block it."

3. **Pin Light without a flash.** `applyTheme` (`apps/web/src/theme/apply-theme.ts:8`) writes tokens as
   *inline styles on `<html>`*, so a bare `data-theme="light"` wrapper would lose to them. Instead, render
   the wrapper with Light's tokens in its own inline `style` — custom properties inherit, so the
   subtree wins for free. Server-rendered, no client JS, no flash for a user whose stored theme is
   dark.

   **`THEMES.light` cannot be spread directly.** Its keys are unprefixed (`bg`, `fg-muted`), which
   is why `applyTheme` writes `` `--${key}` ``. Spreading it raw would set meaningless `bg` / `fg`
   properties and pin nothing. Map the keys first:

   ```
   Object.fromEntries(Object.entries(THEMES.light).map(([key, value]) => [`--${key}`, value]))
   ```

   Ship a test asserting the wrapper carries Light's `--bg` — it is the assertion that catches a
   regression back to the raw spread.

   **Type it without a cast.** `React.CSSProperties` has no index signature for `--*` keys, and the
   usual workaround is `as React.CSSProperties` — which CLAUDE.md's principle 6 rules out. Use
   declaration merging instead, the option that principle explicitly names first:

   ```
   declare module 'react' {
     interface CSSProperties {
       [key: `--${string}`]: string | undefined
     }
   }
   ```

   One ambient declaration in `apps/web`, and every custom-property style object in the app is
   type-safe without a cast.

### Copy

The readiness review found five factual claims in the handoff's `BOT_COPY` that don't survive an
audit against `origin/main`; Copilot independently reproduced all five. Copy is a copy-writer call,
not a Design call, so these are fixed in place during this build with a `copy-review` pass. No
Design round-trip.

| Row | Handoff says | Ships as |
| --- | --- | --- |
| `javascript` | "We don't run it… no headless browser" — **false** | "We render pages in a headless browser (Chromium) because many venue calendars only exist after JavaScript runs. We don't click, submit forms, or log in." (Hugh, option A, 2026-09-01) |
| `fullPass` | "3:00 AM Mountain" — true half the year | "Once a day at 09:00 UTC." `render.yaml` pins `0 9 * * *` and deliberately doesn't chase DST. UTC is what their logs show. |
| `triggers` | "Every 10 min we check for signs a page changed" | Rewritten. No change-detection sweep exists — the `*/10` cron drains `crawl_triggers`, whose only writer is an admin pressing a button (`apps/api/src/routes/admin/crawl.ts`). |
| `weRead` | lists "on-sale status" | Drop it (no such field on `NormalizedEvent`); add `description` and `imageUrl`, which we do extract and the handoff omits. |
| *(missing)* | — | New retention row: indefinite, stated plainly. There is no event-purge job and the Concerts "Past" section depends on that. Locked 2026-08-29. |

Also: `BOT_COPY` carries ~9 em-dashes. The `no-restricted-syntax` rule on `definitions/copy.ts`
(`apps/web/eslint.config.mjs:115`) is build-blocking, so these are cleared as part of the copy pass,
not suppressed.

Audited clean and carried through unchanged: the fail-open `Disallow` wording, the ±500ms jitter,
per-venue `crawlDelayMs`, the no-login/no-form/no-PII promise, and the once-per-pass robots
re-check.

### ⚠️ A sixth wrong claim, found during plan review

**"Never parallel against one host" does not hold, and the readiness review passed it.** The review
reasoned that `MAX_CONCURRENT = 1` (`apps/crawler/src/run.ts:18`) makes both crawl paths sequential.
That is true *within* a process and false across the two. The daily pass and the trigger drain are
separate Render cron jobs, and `crawl.ts:1682` says so explicitly: "the daily cron and the triggers
cron CAN overlap on the same venue — there's no per-venue lock above this layer."

Overlap needs an admin to trigger venue X while the daily pass is mid-crawl on venue X, so it is
rare. Rare is not never, and this is a transparency page about crawl ethics. The sentence "Never
parallel against one host" comes out of the `rate` row; what stays is the true part, that we space
requests to a domain 3 seconds apart with jitter.

`design/design_handoff_bot_page/READINESS.md:103` records this claim as ✅ verified. That line is
wrong and this plan supersedes it — correct it when PR-B touches the handoff copy.

**Open for Hugh (a real question, not a copy one):** we could instead make the claim true with a
per-venue advisory lock, which is a genuine ethics improvement independent of this page. That is
scope this plan does not assume. Absent a decision, the copy tells the truth and the code is
unchanged.

Two windows are Design's invented numbers, kept on Hugh's call (2026-09-01): **two business days**
to reply, **30 days** to remove. Both are Hugh personally at current volume — there is no removal
workflow, and this plan does not build one.

### Accessibility

Real heading hierarchy, `aria-label` on both copy buttons, `mailto:` as live text rather than an
image, 44px targets at a 320px baseline. The UA string and the robots.txt block are selectable text
first — the copy button is a convenience and never the only way to get the string.

### Tests

Route renders unauthenticated (the `isAlwaysPublic` guarantee, asserted rather than assumed); page
metadata does **not** carry `robots.index === false`; the Light wrapper carries Light's tokens;
`CopyBlock` only shows "Copied" on a resolved clipboard write.

---

## Out of scope

- A removal workflow. The 30-day promise is Hugh at current volume, deliberately.
- `Allow:` and path-pattern matching (`*` / `$` inside a `Disallow` value) in the robots parser.
  Neither is claimed on the page. The wildcard *user-agent* (`*`) is already supported and stays.
- Linking `/bot` from anywhere in the app. Its entry point is the User-Agent string.

## Blocked on Hugh before ship (not before build)

`venues@concertcrawl.app` needs a Cloudflare Email Routing rule forwarding to
hugh@featherweight.design — the same mechanism `support@` already uses, so a routing rule rather
than a DNS change or a deploy. The page's only destination is that address; it must resolve before
the page is reachable.
