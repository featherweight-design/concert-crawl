# Readiness Review — /bot crawler transparency page

**Verdict:** 🟡 Yellow
**Audited:** 2026-08-29
**Related ticket(s):** #1228 (Gate B launch-bar item)
**Plan PR target:** `docs/superpowers/plans/2026-08-XX-bot-transparency-page.md`

## Summary

The design is ready. Layout, tokens, breakpoint, a11y and the decisions log are all
sound, and the handoff's "For eng" section independently identified the single
highest-risk implementation line (`isAlwaysPublic`, not `isPublicOnceLaunched`)
before we did. Nothing about the page's structure needs another Design pass.

What is not ready is the copy — which is the deliverable Design itself named as the
point of the page. An audit of all nine factual claims in `BOT_COPY` against
`origin/main` found **one false, three inaccurate, and one material omission**. On a
page whose only reader is a sysadmin holding the logs that disprove us, a wrong fact
row is worse than no page. All five are fixable in `BOT_COPY` alone — no component,
no layout, no state changes — so per design-pipeline.md § "Who owns copy" they are a
copy-writer call and do **not** go back to Design. That, plus two build-time traps,
is what keeps this Yellow rather than Orange.

## Per-dimension findings

### 🗺️ Scope clarity

- ✅ Boundary is exact: one static public page, no auth, no nav, no theme picker.
- ✅ Non-goals stated and reasoned — no IP/ASN publication (§"Open for product"), no
  adoption of the treatment by `/legal` (deliberately deferred, with the reason).
- ✅ Open questions are logged and correctly routed: the two-business-day reply and
  30-day removal are flagged as Design's numbers needing Hugh's yes, with the right
  framing — "whoever says yes owns the inbox."

### 🎭 State coverage

- ✅ One breakpoint (560px), both sides drawn, nothing hidden behind a disclosure at
  any width. Satisfies `feedback_mobile_desktop_parity.md` — the phone reader gets
  the identical document, which for a reference page is the whole requirement.
- ✅ Clipboard failure is designed for rather than ignored: `user-select: all` mono
  text means the Copy button is a convenience, never the only route to the string.
- ✅ `<CopyBlock>` confirmed "Copied" unconditionally — `navigator.clipboard.writeText`
  returns a Promise, so the sync `try/catch` could not catch a rejection and an
  insecure-context failure read as success. **Fixed in place in this PR.** It matters
  more here than elsewhere: a false confirmation sends an operator away with an empty
  clipboard and no reason to notice the selectable text beside the button.
- 🟡 Copy-button success/failure feedback is not specified. `InviteSheet.tsx` and
  `ShareSheet.tsx` already settle this pattern; eng conforms rather than asking.
- ✅ No loading/empty/error states to cover — the page is fully static.

### 🔌 Data contract

- ✅ No API, no schema, no props beyond `w` / `insetTop` / `insetBottom`. There is no
  contract to get wrong, and every named element is reachable by construction.
- 🟡 `LAST UPDATED · AUG 2026` is the one dynamic value. Design correctly refuses to
  let it rot ("a stale date on a transparency page is worse than no date") but leaves
  the source to eng. Plan PR picks one: a constant next to `BOT_COPY` is the honest
  option, since a deploy timestamp would advertise churn the page didn't have.

### 🧱 Codebase fit

- ✅ Fully tokenised; every mix goes through `color-mix(in oklch, var(--token) N%, …)`.
  §6 of the canvas proves it in electric and jade. Nothing hard-codes a colour.
- ✅ Copy is already declared as data in `BOT_COPY`, which is exactly the
  `definitions/copy.ts` convention and satisfies `react/jsx-no-literals`.
- 🟡 **Em-dash lint will block the build.** `apps/web/eslint.config.mjs` applies a
  `no-restricted-syntax` rule to `src/**/definitions/copy.ts` banning `—` except as a
  leading sign-off or a bare placeholder. `BOT_COPY` carries roughly nine, including
  `lede`, `facts.javascript`, `facts.recheck`, `facts.crawlDelay`, `facts.weNever`,
  `stop.robotsNote` and `stop.contactBody`. These get rewritten at copy-review, not
  suppressed — a bare disable is banned, and there is no reason to name here.
- 🟡 Clipboard logic exists already in `apps/web/src/lib/share/destinations.ts` and
  `InviteSheet.tsx`. `<CopyBlock>` reuses it rather than writing a third handler.
- 🟡 `CCMark` is marked "verbatim copy — source of truth is `browse-home.jsx`", so
  the build imports the real component instead of porting the prototype's copy.
- ✅ Spelling: `recognise` (§01 title) and `Honoured` (Crawl-delay row) were British
  against near-uniformly American existing copy. **Swept in place in this PR** — the
  whole class, not the flagged instance. Those two were the only occurrences.

### ♿ Cross-cutting

- ✅ Real `<h1>`/`<h2>`/`<h3>` hierarchy, correctly justified — find-in-page is this
  page's only navigation.
- ✅ `aria-label` on copy buttons; 44px targets at 320; no hover-only affordance.
- ✅ `mailto:` is a real link at 20px mono, not obfuscated and not an image.
- 🟡 **Indexability is unaddressed.** If the build reuses the `/legal` page shell it
  will inherit `robots: { index: false }` from `apps/web/src/app/legal/terms/page.tsx`.
  That is right for terms and wrong here: an operator without the exact URL will
  search "ConcertCrawl bot", and finding nothing reads as "unidentified scraper,
  block it." The page must be indexable. Eng-side; not a Design question.
- 🟡 No analytics specified. Correct as-is — instrumenting the page a venue operator
  visits to check whether we respect them would be a poor first impression. Plan PR
  states the omission deliberately rather than leaving it to a later "why no events?"

### ⏰ Drift from reality

This is where the handoff needs work. Every claim in `BOT_COPY` was audited against
`origin/main`.

- ✅ **Request rate** — true. `packages/crawler-core/src/lib/fetchers/jitter.ts`
  applies ±500ms to a 3000ms default. "A random jitter so we never arrive on a fixed
  beat" is accurate.
- 🔴 **Never parallel against one host** — **false**, and this audit originally passed
  it. `MAX_CONCURRENT = 1` in `apps/crawler/src/run.ts` holds _within a process_, so
  the daily pass and the trigger drain are each internally sequential. But they are
  two separate Render cron jobs with no per-venue lock, and `crawl.ts:1682` says so
  outright: they can overlap on the same venue. The sentence was removed from
  `facts.rate` during the build; what remains (3-second spacing plus jitter) is true
  of each process independently. Making the claim true again would need a per-venue
  advisory lock, which is a product call rather than a copy fix.
- ✅ **Per venue configurable** — true. `venues.crawlDelayMs`, read at fetch time.
- ✅ **We never touch a login / form / checkout / person** — true. No auth, no form
  submission, no click-through, no PII anywhere in the crawl path.
- ✅ **Disallow wording** — true, and precisely so. The fail-open sentence matches
  `robots.ts` exactly, and the README's ban on the word "unconditionally" is correct.
- ✅ **robots.txt re-check** — true. The cache in `robots.ts` is an in-memory `Map`
  that dies with the process, so every cron invocation refetches. "At the start of
  every pass, so at least once a day" is right.
- 🔴 **JavaScript: "We don't run it. Plain HTTP GET, HTML parsed as text — no
  headless browser."** **False.** `packages/crawler-core/src/lib/fetcher.ts`
  `fetchPage()` launches Playwright and navigates with `waitUntil: 'networkidle'`,
  executing JS in full. `crawl.ts` dispatches on `venues.crawlMode`: `'browser'`
  always uses Playwright, `null` tries HTTP first and **falls back to the browser**,
  and only `'http'` is browser-free. `crawlWaitForSelector` exists precisely to wait
  on rendered content. This is the most damaging claim on the page, because the
  venues most likely to have someone reading their logs are the ones we render.
- 🟠 **Trigger checks: "Every 10 minutes we make a lightweight check for signs a page
  has changed. Nothing is re-read unless something did."** **Inaccurate.** The
  `*/10` cron drains the `crawl_triggers` queue, and the only writer of that table is
  `apps/api/src/routes/admin/crawl.ts` — an admin pressing a button. There is no
  10-minute change-detection sweep. Content-hash dedup does exist
  (`skip-guard.ts`, 7-day window) but runs inside a crawl, not as a pre-check.
- 🟠 **Full pass: "Once a day, 3:00 AM Mountain time."** **Half the year.**
  `render.yaml` pins `0 9 * * *` in UTC and deliberately does not chase DST, so it is
  3 AM MDT and 2 AM MST. A sysadmin correlating log timestamps in January finds us an
  hour early. State UTC — it is what their logs show anyway.
- 🟠 **We read: "...ticket price, on-sale status, and the link back."**
  **Inaccurate in both directions.** `NormalizedEvent` has no on-sale field, so we
  claim to read something we don't; and it does carry `description` and `imageUrl`,
  which the list omits. Under-claiming is the worse half: an operator who sees us
  pull their event artwork after reading this list stops trusting the whole page.
- 🟠 **Retention is absent.** The page commits to removal on request but never says
  how long we keep data absent a request. There is no purge job and the Concerts
  "Past" section depends on that, so retention is indefinite. Hugh locked "say it
  plainly" with Design on 2026-08-29; it did not make it into `BOT_COPY`. Add a
  retention row — Design's own precedent (§"Open for product": an allowlist would be
  "a sixth fact row in section 01 and nothing else") establishes that adding rows is
  not a design change.
- 🟡 **"Everything we hold about your venue is visible on one page, in public."**
  Overclaims. We also hold crawl runs, failure logs, admin crawl notes and raw
  extraction payloads. Narrow to the listings and price history, which is what the
  reader means and what the removal promise actually covers.
- ✅ **Crawl-delay** — not true _yet_, and the handoff already knows: "page and parser
  land together" is the right call and matches Hugh's 2026-08-29 decision to fold the
  parser change in as a story. See Decisions inherited.

### 📝 Decision log

- ✅ Seven decisions, each with its reasoning rather than its conclusion alone. The
  "banned word: unconditionally" note is the model of what a handoff decision log is
  for — it records a trap so nobody walks back into it.
- ✅ Locked vs. tentative is cleanly separated: "Open for product" isolates the two
  numbers that are Design's guess from everything that is settled.
- ✅ Matches every answer locked with Hugh on 2026-08-29 — intro-then-spec layout,
  light-only, `venues@concertcrawl.app` alone, light brand trace, short who-we-are
  paragraph plus link, self-serve-before-email opt-out, no source IPs.

## What this PR changed vs. what the build changes

Two mechanical findings were applied to the prototype here: the British-spelling
sweep and the `<CopyBlock>` clipboard bug. Neither involves judgment.

The five drift findings are **deliberately left as Design delivered them.** Rewriting
them is not a nit sweep — telling a venue operator that we do run a headless browser
is a disclosure decision with the same weight as the page itself, and the retention
row is a sentence Hugh has to stand behind. They are recorded above with the exact
evidence so the copy-review pass in the build can write them once, correctly, rather
than have them quietly edited into the artifact now.

## Gaps requiring Design round-trip

None. Every finding above resolves in `BOT_COPY` or in eng implementation. Per
design-pipeline.md § "Who owns copy", wording questions do not go back to Design, and
no finding here forces a layout change.

## Eng-side clarifications

1. **Route gating** — `/bot` goes in `isAlwaysPublic` in `apps/web/src/middleware.ts`,
   next to `/legal(.*)`. Never `isPublicOnceLaunched`. Highest-risk line in the build.
2. **Indexability** — do not inherit `robots: { index: false }` from the `/legal`
   shell. This page must be findable by search.
3. **Copy-review pass on `BOT_COPY` before implementation**, applying the drift fixes
   in place and clearing the em-dashes. Per the pipeline, findings are applied here,
   not sent back to Design.
4. **Crawl-delay parser** ships in the same epic as the page, as its own story —
   take the longer of the venue's stated delay and our 3s default, with an upper bound
   so `Crawl-delay: 300` cannot stall a nightly run past its deadline budget (cf.
   #1199), logging when the cap binds.
5. **`LAST UPDATED`** renders from a maintained constant, not a deploy timestamp.
6. **Reuse before building** — clipboard from `lib/share/destinations.ts`, `CCMark`
   from its real source, not the prototype's local copies.
7. **Analytics** are deliberately omitted; the plan says so explicitly.

## Decisions inherited

Locked with Hugh and Design on 2026-08-29. The plan must not re-litigate these.

- Layout is a short branded intro handing off to a numbered spec block.
- Light theme only. No theme control on this page, notwithstanding full tokenisation.
- `venues@concertcrawl.app` is the only address published. Not `support@` — that
  routes venue operations into user support. It is a Cloudflare Email Routing rule
  forwarding to hugh@featherweight.design; MX/DKIM/SPF/DMARC are already live, so it
  is a routing rule, not a DNS change and not a deploy. **Hugh's action, and it must
  exist before the page ships** — publishing an address that bounces is worse than the
  404 this page replaces.
- Voice is clear with a light brand trace. The page explains what Concert Crawl is in
  one short paragraph plus a link, with no "why this helps your venue" pitch.
- Opt-out order is robots.txt self-serve first, email second, removal of
  already-collected data third.
- No source IPs are published. Render has no static outbound IPs on standard plans;
  identification is by User-Agent.
- Retention is indefinite and is stated plainly rather than implying a window.
- `Crawl-delay` is not honoured today and the parser lands with the page, as a story
  inside this epic rather than as prior work.

**Still open for Hugh** (Design flagged both correctly): whether the page commits to
a two-business-day reply and a 30-day removal window. No removal workflow exists —
at current volume both numbers are Hugh personally. The 2026-04-23 spec promises 24h,
which is a third number and should not survive into the page unexamined.
