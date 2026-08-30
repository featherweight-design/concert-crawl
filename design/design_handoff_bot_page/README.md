# /bot — crawler transparency page

The public page our crawler's User-Agent points at. Today that URL 404s, so the
one audience we hand a link to unprompted — a venue's technical staff, reading a
server log, deciding whether we're legitimate — lands on nothing.

Canvas: **`Bot Page.html`** — 7 sections: arrival, full page at 1280 / 393 / 320,
the two copyable strings, fact-row anatomy at both widths, the contact card, and
a token proof in the other two themes.

## Files

| File | What's in it |
|---|---|
| `bot-page.jsx` | `BOT_COPY` (every string on the page) · `BOT_UA` · `BOT_ROBOTS` · `<BotPage w>` |
| `bot-primitives.jsx` | `CCMark` (verbatim copy — source of truth is `browse-home.jsx`) · `<BotLockup>` · `<MonoTag>` · `<BotSectionHead>` · `<FactGroup>` · `<FactRow>` · `<CopyBlock>` · `<ContactCard>` |
| `theme-context.jsx` / `ios-frame.jsx` / `design-canvas.jsx` | local copies of project primitives |

---

## Decisions log

### 1. It doesn't join the /legal family — it's an intro that hands off to a spec

`/legal/terms`, `/legal/privacy` and `/legal/beta` share a plain centred column
because their reader has already decided to use the product and is looking for a
clause. This reader has decided nothing. They arrived cold, they're mildly
annoyed, and they're holding one question: *is this thing legitimate, and how do
I make it stop?*

So the page is two halves. **A short branded intro** — mark, lockup, one
sentence confirming they're in the right place, one paragraph on what Concert
Crawl is with a link out — then **a numbered spec block**: five sections of
mono-keyed fact rows they can scan, quote, and act on.

The intro is deliberately three paragraphs. Any longer and it reads as marketing
to a person who came to read a log line; any shorter and the answer to "who are
you" is missing. The last line of it is the handoff — *"Everything our crawler
does is on this page, including how to make it stop"* — which is the sentence
that buys the spec block its attention.

Sections are numbered `01`–`05` in mono. Not decoration: it means a sysadmin can
say "section 3 says 3 seconds" to a colleague, and it signals *reference
document* before a word is read.

### 2. Light, and only light

Consumer surfaces ship three themes and a picker. This page has neither. It's
documentation arriving in a browser tab next to a terminal, and our dark app
chrome would read as a marketing site — exactly the frame we don't want when the
question is credibility.

The page is still **fully tokenised** (§6 of the canvas renders it in electric
and jade to prove it). Nothing hard-codes a colour, so if `/bot` ever inherits a
themed shell it survives intact. That's a portability guarantee, not a shipping
plan: **no theme control goes on this page.**

### 3. Self-serve before email

"Making us stop" answers in this order: **robots.txt block first**, contact
second, data removal third. An operator who can solve their problem in their own
editor should never have to wait on our inbox — and a page that leads with
"email us" reads like a page hoping you won't.

```
User-agent: ConcertCrawl
Disallow: /
```

The block and the User-Agent string are the only two things a reader takes away
verbatim, so both are `<CopyBlock>`: selectable mono text with `user-select: all`,
plus a Copy button as a convenience. The button is never the only path — a
clipboard API failure must not make the string unobtainable.

### 4. Precision is the design, so the copy is the deliverable

Every claim on this page is a promise a technical reader will test. Three rows
were written against exactly what the code does:

- **Disallow** — *"We request robots.txt before crawling and obey any Disallow
  that applies to us. If it's unreachable, we proceed at our normal rate."*
  The word **unconditionally** is banned here: the crawler fails open, and a
  hedge-free lie is worse than an accurate fail-open sentence. This wording
  reads as a commitment *and* survives an audit.
- **Crawl-delay** — *"Where you state one, we take the longer of your value and
  our own 3-second default — we never speed up because a site permits it."*
  States the floor as well as the ceiling, which "we honour Crawl-delay" doesn't.
- **What we never do** — enumerated, not summarised. "No personal data" is a
  claim; "we don't submit forms, follow a checkout, or touch anything behind a
  login" is a description someone can check against their own logs.

All of it lives in `BOT_COPY` as data. When the crawler's behaviour changes, one
object changes and no component is touched.

### 5. `--signal` for the contact card, `--accent` stays on the mark

Per CLAUDE.md §2: the card is `color-mix(--signal 7%)` on a 38% `--signal`
border, and the address is its headline — not a link buried in a sentence,
because it may be the only string the reader copies. `--accent` appears exactly
once, in the wordmark, doing brand presence and nothing else.

### 6. Voice: clear with a light brand trace

Two sentences carry the personality and the rest is plain. The headline —
*"This is our crawler."* — and the closer: *"We'd rather be the link that sends
someone to your box office than a line you have to block."* That closer is the
page's actual argument, and it's the last thing on the page for that reason.

No jokes in the fact rows. The Hybrid empty-state voice is right for a user who
already likes us; it's the wrong register for someone with their finger over a
firewall rule.

### 7. One breakpoint, nothing hidden

560px. Above it, fact rows are a fixed 168px mono key column plus prose, and
display type steps up; below, the key becomes a label above its value. A
12-character column beside a 40-character measure is worse than a stack.

Nothing collapses behind a disclosure at any width. A venue manager reading this
on a phone in a back office gets the same document as someone at a desk.

---

## Component handoff

### `<BotPage w />`

`w` is the container width and drives the single 560px breakpoint. `insetTop` /
`insetBottom` pad the header and footer for a device frame's status bar and home
indicator; both default to 0, so the real page is unchanged. Page measure
caps at 720; header and footer rules run full-bleed with their content on the
same 720 measure.

```
header   1px --border bottom · BotLockup (links to concertcrawl.app)
intro    MonoTag eyebrow · h1 900/44 (31 narrow) · lede · who-we-are · handoff line
01–05    BotSectionHead (mono number + rule, h2 19/800, note --fg-muted 62ch)
         FactGroup  --bg-elevated / 1px --border / r12
           FactRow  grid 168px 1fr (wide) | 1fr (narrow), 1px --border between
05       CopyBlock · ContactCard · removal prose
closer   17/600, max 44ch
footer   1px --border top · LAST UPDATED · Terms / Privacy / Beta terms
```

### Tokens used

`--bg` `--bg-elevated` `--surface-1` `--surface-2` `--fg` `--fg-muted`
`--fg-subtle` `--fg-on-accent` `--border` `--signal` `--accent`. All mixes go
through `color-mix(in oklch, var(--token) N%, …)`. Validated in light (ships) +
electric + jade.

### Accessibility

- Real `<h1>` / `<h2>` / `<h3>` hierarchy — this page will be read with a
  reader's find-in-page and with assistive tech, and it has no other navigation.
- Copy buttons carry `aria-label` ("Copy to clipboard"); the code they copy is
  `user-select: all` text, so the button is never the only route.
- Contact address is a `mailto:` link at 20px mono, not an image, not obfuscated.
- All interactive targets clear 44px at 320. No hover-only affordance anywhere.

---

## For eng

1. **`/bot` must be public immediately — not at launch.** It belongs in
   middleware's `isAlwaysPublic` list next to `/legal`, **not** in
   `isPublicOnceLaunched`. If it lands in the wrong list, the crawler spends the
   whole private beta advertising a URL that bounces venue operators into a
   sign-in wall — a worse version of the 404 we're fixing. **This is the single
   highest-risk line in the handoff.**
2. **Crawl-delay must actually be honoured before this ships.** The page states
   the longer-of-the-two rule as fact. Page and parser land together.
3. **The venue link is designed present and resolves for everyone at launch** —
   venue pages are invite-gated during private beta. It's deliberately not
   load-bearing: the page's core job survives the link being gated.
4. **Copy lives in `BOT_COPY`.** Behaviour changes to the crawler are a copy
   edit, not a design pass. If a claim in that object stops being true, the page
   is a liability — treat it like a config value with an owner.
5. **`LAST UPDATED` is real.** Render it from the deploy or a constant someone
   maintains; a stale date on a transparency page is worse than no date.

## Open for product

- **Two-business-day reply and 30-day removal are written as commitments.**
  Both are my numbers, not Hugh's — they need a yes before ship, and whoever
  says yes owns the inbox.
- **No IP range or ASN is published** (not selected). If venues start asking for
  an allowlist entry, that's a sixth fact row in section 01 and nothing else.
- **The /legal family didn't adopt this treatment.** Terms / Privacy / Beta keep
  their centred column. If they're ever refreshed, `FactGroup` + `BotSectionHead`
  would carry them — but a terms page has a different reader and this wasn't the
  pass to decide that.
