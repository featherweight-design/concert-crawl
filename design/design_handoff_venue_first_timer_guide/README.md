# #764 · Venue First-Timer Guide — design handoff

**Track 2 · July 17, 2026**

A concert-goer-voice guide that answers the one question a first-timer actually
has: *what do I need to know before I walk into this room?* A warm callout fires
for first-timers (and anonymous visitors); the guide section itself is
progressive-enhancement and ships independent of the callout.

Open: `Venue First-Timer Guide.html`

---

## DNA statement

Built on the Concert Crawl consumer + admin design system. **Structural rhythm**
lifted from `calendar_jump_picker` (Section-organized canvas, Live-preview §0,
Tweaks-driven states, theme-parity closer). **Voice** is the Sour Patch bar
(#782) that shipped `shareable_cards` — honest > cheerful, specific > generic,
never brochure-y, callout is a question not a claim. **First-timer detection**
reuses `concert_history`'s `attending_at IS NOT NULL` query (#55). **Tokens
only** on the consumer surface (`var(--*)`, all 9 themes); admin shares the same
token system via the admin primitives. Brand mark unchanged (no logo work here).

Two principles bind every decision:

1. **Voice authenticity is the quality bar.** Every displayed chip + the vibe
   line reads as though a concert-goer wrote it. If it can't be authored in an
   authentic voice, it stays in the honest "not documented yet" placeholder.
2. **Automation lives admin-side, never on display.** v1 automation is passive
   (good defaults + venue basics pre-populated). Draft-generation from scraped
   data is deferred to v2 (#996). Every chip is voice-passed before publish.

---

## Template inventory

| Surface | State | Mobile | Desktop |
|---|---|---|---|
| Venue detail | First-timer · **populated** | 320 + 390 | single column, 2-col guide |
| Venue detail | First-timer · **thin guide** | 390 | single column |
| Venue detail | **Returner** (inline collapsed accordion + preview strip) | collapsed + open | inline (no empty rail) |
| Venue detail | **Anonymous** (= first-timer) | 390 | (same component) |
| Event detail | First-timer · **chip on the venue row** (right-aligned, signal-tinted) | 390 | — |
| Event detail | Returner · **baseline** (no chip) | 390 | — |
| Guide anatomy | callout ×2 · vibe · chip ×2 · **accessibility both states** | ✓ | — |
| Admin block | **populated / empty / validation** + chip-state legend | — | ✓ |
| Theme parity | populated guide · Electric / Jade / Light | ✓ | — |

Canvas §0 is a Tweaks-driven Live preview (venue state · admin state · theme ×9).

---

## The chip pool

★ **Accessibility** is always-present and locked — admin can't skip it. It has
**two states** and one of them must be satisfied to publish:

- **authored** — a real concert-goer line, or
- **honest_placeholder** — "not documented yet — call the venue," when the admin
  genuinely can't document it. Honest beats faked.

The other seven are **opt-in per venue**, shown on display only when authored
(never rendered empty): **Parking · Age policy · Bag check · Coat check ·
Will-call / entry · Food + drink · Getting there.**

Plus the free-form **Insider tip** — one short concert-goer paragraph, **surfaced
highest** (it leads the guide on display and sits at the top of the admin block,
above even accessibility). It's the hero of the guide and the free-form catch-all
— the thing you'd tell a friend who's never been (“it's literally a mountain,
hydrate and pace yourself”). This is what separates us from a scraped listing.

> **Venue basics** (address, capacity, upcoming count, type) are
> automation-populated and live in their own row on the venue page — **never
> inside the guide.** The **About** blurb is venue-page furniture (kept per prod),
> hoisted directly above the callout so basics + About + callout + guide read as
> one contiguous “before you go” block. **The map was dropped** — the Directions
> link covers it, and the guide's “Getting there” chip carries the in-voice how.

### Design calls made (not in the brief)

| Call | Decision |
|---|---|
| **Returner treatment** | An **accent-tinted card** with a one-line preview strip (`Access · Parking · Age +N`) — emphasized so it's noticeable even to repeat visitors (it's a good feature for everyone). A peer section in the single column, not a sidebar, so it never leaves an empty rail. One gesture opens it; the Insider tip leads the expanded state. |
| **Desktop layout** | **Single column**, matching prod rhythm: hero → header → basics → About → callout → guide → upcoming. Guide widens to a 2-col chip grid. No sidebar, no map. |
| **Insider tip leads** | Surfaced first inside the guide (display) and first in the admin block — the authored, human voice before the logistics. |
| **Event chip placement** | The first-timer chip is **right-aligned on the venue info row** and **signal-tinted** (not accent) — so it never reads as another commit action beside the accent **Watching** pill / **Get Tickets** CTA, and it lines up with the page's right edge like every other value. |
| **Thin-guide missing chips** | Not rendered as per-chip empty rows (repetitive, negative). They collapse into a single honest "Still gathering" cluster + one line (`"That's the lot for now — Roxy's new to us."`). No community-tips CTA — that's #981 (v2). |
| **Accessibility publish gate** | Satisfiable by authored content **or** an explicit "Can't document yet" toggle that ships the honest placeholder. Never blocks a venue from publishing, never fakes content. |
| **Callout icon** | Three ascending dots (plain circles) — echoes "the crawl" without redrawing the `CCMark`. |

---

## Voice guardrails demonstrated

Every sample below is in the deliverable and lifts verbatim into `copy.ts`.

- **Specific > generic** — `"Paid lot on Blake, $15 cash. Street opens up on Walnut after 7."` not `"paid parking available."`
- **Never brochure-y** — `"18+ to get in, 21+ with a wristband to drink. IDs checked on the sidewalk."` not `"Age policy: 18+."`
- **Callout is a question** — `"First time at Roxy?"` (works identically for anonymous + signed-in).
- **Thin honesty** — `"Here's what we've got so far."` not `"we've got tons of tips!"`
- **Vibe** — `"Roxy runs loud — grab earplugs at the bar if you forgot. Line's rough after 8:30, come early."`

No "we miss you" saccharine, no false urgency, never the word "fraud."

---

## Copy maps (ready for `copy.ts`)

All in `guide-data.jsx`, keyed for lift into
`apps/web/src/components/consumer/definitions/copy.ts` (per
`feedback_definitions_copy_rule` — all customer-facing strings externalized):

- `ROXY_GUIDE_COPY` — the eight populated chips (voice-passed reference set).
- `ROXY_VIBE` — the vibe-line reference.
- `ROXY_THIN_COPY` / `ROXY_THIN_VIBE` — thin-venue data (accessibility only).
- `CALLOUT_COPY` — `{ populated, thin }`, each `{ q, sub }`.
- `EVENT_CHIP_COPY` — the event-detail chip label.
- `PLACEHOLDER_COPY` — accessibility honest placeholder + thin-cluster copy.
- `ADMIN_COPY` — every admin field placeholder (each models specific > generic),
  the voice reminder, and the required-field messaging.

`chipState(value, {placeholder})` → `blank | authored | honest_placeholder` is
the three-state model surfaced by the admin indicators.

---

## More chips / insider tips (admin question)

The chip pool is **curated and finite on purpose** — the voice quality bar means
every chip has to be answerable in an authentic concert-goer voice, and an
open-ended "tips" field invites brochure slop. Two escape valves cover "we need
to say more":

1. **The Insider tip** is the free-form home for exactly this — loudness, room
   feel, altitude, the brutal line, anything that doesn't map to a chip. It's
   surfaced first, so the most human, most differentiating content leads.
2. **Structured additions arrive via #997** (weather, restrooms, ATMs, cell
   service). The admin picker **already scales** to them — add a key to
   `CHIP_DEFS` and the picker + field render automatically. The admin block shows
   these as ghosted `SOON · #997` chips so the growing-pool model is legible.

---

## Files

| File | Role |
|---|---|
| `Venue First-Timer Guide.html` | canvas + Tweaks (entry point) |
| `guide-data.jsx` | chip pool, tokenized `GuideIcon` set, all `*_COPY` maps, `chipState`, fixtures |
| `guide-consumer.jsx` | venue detail (all states, mobile + desktop), event detail, callout, chip, vibe, returner accordion |
| `guide-admin.jsx` | the guide block (populated/empty/validation), chip picker, per-chip fields, accessibility two-mode field, chip-state legend |
| `design-canvas.jsx` · `theme-context.jsx` · `ios-frame.jsx` · `tweaks-panel.jsx` · `admin-primitives.jsx` · `identity-art.jsx` | shared infra (copied, unmodified) |

Each authored file is under ~600 lines for Copilot reviewability.

---

## A11y (WCAG AA)

- Callout jump-to-guide and returner accordion are real buttons with
  `aria-expanded` / `aria-label`; all tap targets ≥ 44px.
- Accessibility chip is pinned first and never hidden — a mobility need can't be
  left to guess.
- No native `title=` tooltips on the authored consumer/admin surfaces
  (`guide-consumer.jsx` / `guide-admin.jsx`); icons are `aria-hidden` with
  adjacent text labels (icon is never the only signal). The copied canvas
  infra (`design-canvas.jsx`) does use `title=` for reorder affordances —
  that's out of the a11y scope of this handoff.
- Admin chip picker toggles carry `aria-pressed`; the required-field error is
  text + icon + color (not color alone).
- Tokened focus/validation rings; every color reads from `var(--*)`.

---

## Sequencing / dependencies

- **First-timer detection** depends on **#55 Concert History** (🟢 Ready):
  `attending_at IS NOT NULL` for any event at this venue → returner.
- **The section ships independent of the callout** (progressive enhancement). If
  eng ships the section before detection is wired, everyone sees the collapsed
  (returner) state; the callout lights up when detection lands.

---

## Out of scope (documented follow-ups)

- **#981** Community-submitted tips (v2) — why the thin state has no "suggest an edit" CTA.
- **#996** Draft-generation from scraped venue data (v2) — automation stays passive here.
- **#997** Chip-pool expansion (weather, restrooms, ATMs, cell service) — v2.
- Photo galleries, live conditions, mapping-app integrations (from ticket).

---

## Gap report — calls the brief didn't cover

1. **Venue-page scaffold mirrors current prod** — single column, hero → header →
   basics (Capacity / Upcoming / Type) → **About** → callout → guide → upcoming.
   About is kept; the map was dropped (Directions covers it). Everything outside
   the callout + guide is context framing, not a spec for the venue page itself.
2. **Thin-guide vibe line** — left blank (honest) rather than authored, since a
   thin venue by definition has no vibe intel yet. Confirm you'd rather a blank
   than a prompt.
3. **Admin surface is desktop-first** — matching the sibling admin handoffs. The
   block is responsive (fields stack) but wasn't drawn at 320; flag if a mobile
   admin editing pass is wanted.
4. **"Can't document yet" accessibility toggle** is a design-introduced control
   to reconcile "accessibility is required" with "we don't fake content."
   Confirm the interaction (toggle vs. a checkbox in a publish dialog).
