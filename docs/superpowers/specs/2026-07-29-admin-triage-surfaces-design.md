# Admin Triage Surfaces — design brief

**Ticket:** #1215 · Track 2 · July 29, 2026
**Surface:** `/admin` dashboard — the "Needs attention" panel
**Status:** brainstorm locked, awaiting R1 handoff

---

## 1. Purpose

Concert Crawl has one admin: Hugh. When a venue crawl breaks, he needs to find
out. For several weeks he didn't.

The ticket was filed as a wiring problem — two admin notification surfaces were
built and never mounted. Investigation found something more fundamental. The
surface that *is* mounted, the dashboard "Needs attention" panel, structurally
cannot show the alerts that went unnoticed.

The panel lists a venue when its crawl `status === 'failed'` or it has been
blocked. A went-dark crawl is neither: it **succeeded**, it just returned far
fewer events than its own baseline. Same for a suspected pagination ceiling or
a URL coverage regression. Detection for all three has worked correctly since
#624 and #1174 — the alerts were written to the database and emailed. The
dashboard simply had no expression for them.

Wiring the orphaned inbox into the nav would not have fixed this. The two
surfaces cover different things, and neither covers everything.

**This brief redesigns the panel around a single question: _what is wrong right
now?_** Everything else follows from that — including the deletion of the two
orphaned surfaces, which the new model makes redundant.

---

## 2. App context

### The surface today

`/admin` is the admin front door. The "Needs attention" panel sits near the top
and currently lists:

| Row | Source | Shape |
| --- | --- | --- |
| Blocked or failed venue | `venue.status`, `blockedAt` | per-venue, capped at 3 |
| Flagged events | pending event count | one aggregate row |
| Price submissions | pending submission count | one aggregate row |

It is built from `AttentionFeed` (`components/admin/dashboard/AttentionFeed.tsx`)
on the shared `Panel` primitive, with severity tints already tokenised as
`danger` / `warning` / `signal` / `neutral`. Rows are icon + title + meta +
relative time + optional action link.

The panel header carries an "Inbox ›" link — the only route in the entire app
to `/admin/inbox`.

### The two orphans

**`NotificationBell`** (`components/admin/notification-bell/`) is a complete,
polished component — 30-second polling, unread badge, per-item and mark-all
read. It is **never imported anywhere**. It renders nowhere.

**`/admin/inbox`** exists and works. It aggregates four categories
(`event_flag`, `price_submission`, `blocked_venue`, `crawl_failure`) into one
chronological queue with its own read-state system (`inbox_reads` +
`inbox_read_watermarks`, migration `0047`). It is absent from the admin nav's
nine entries and reachable only via that one header link.

The two orphans do not agree with each other. The bell reads
`notifications.read_at`; the inbox never writes that column. Half the inbox
duplicates `/admin/review` and `/admin/prices/submissions`, which have richer
purpose-built UI.

So there are three parallel notification systems, none of them complete.

### Why the dashboard wins

The dashboard is where the admin already lands, and the nav badge
infrastructure that pulls him back to it is already built (`crawl`, `review`,
and `feedback` entries carry live counts). Adding a fourth surface would make
the admin busier without making it clearer. Consolidating onto the surface with
the strongest existing habit makes it clearer without making it busier.

---

## 3. Locked decisions

Six decisions came out of the brainstorm. Each is settled; Design should treat
them as constraints rather than open questions.

### 3.1 The dashboard is the front door

The "Needs attention" panel is the triage surface. Nav badges are the
peripheral signal that pulls the admin back to it. The specialist views —
`/admin/crawl`, `/admin/review`, `/admin/prices/submissions` — remain where the
actual work happens, and the panel deep-links out to them.

**Why not a persistent bell:** a bell that follows you across every page is
built for an app you live inside all day and get interrupted in. Admin sessions
here are deliberate visits, not ambient presence.

**Why not a promoted inbox page:** a tenth nav entry competing with a panel that
already occupies the front door, for one person.

### 3.2 Derived live state, never an event log

The panel answers **"what is wrong right now,"** not "what happened since I last
looked."

Every row is computed from current state at request time. Rows appear when a
condition becomes true and vanish when it stops being true. There is no read
state, no unread count on the panel itself, and nothing to dismiss.

**Why:** an event log lets a fixed problem linger until acknowledged, and lets
an unfixed problem be acknowledged and then forgotten. Both failure modes point
the wrong way for a solo admin. Under derived state, if it is still broken it is
still listed — the panel cannot lie by omission, which is precisely how went-dark
stayed invisible.

**Consequence:** the `notifications` table stops being a UI source. It survives
as a **write-only audit log** — it is written inside the alert transaction
alongside the email send and remains the durable record of what fired and when.
Nothing in the admin UI reads it.

### 3.3 The orphaned surfaces are removed

Under the derived model, neither orphan has a job left. Both come out, along
with the read state that only existed to serve them.

**Removed:** `NotificationBell`, `/admin/inbox`, the inbox components,
`/v1/admin/inbox`, `/v1/admin/notifications`, and the `inbox_reads` and
`inbox_read_watermarks` tables.

**Kept:** the `notifications` table (write-only), `/admin/review`,
`/admin/prices/submissions`, `/admin/crawl`.

Design does not need to mock anything for the removals — they are noted here so
the panel is understood as *the* triage surface rather than one of three.

### 3.4 Two tiers: faults and queues

The panel carries two kinds of thing, and they are not equivalent.

**Faults — something is broken.** Per-venue rows, severity-weighted:

| Condition | Meaning |
| --- | --- |
| Blocked | venue returned 403 / 429 |
| Failed | consecutive crawl failures |
| Went dark | crawl succeeded, event count collapsed against baseline |
| Ceiling suspected | crawl stuck at a suspiciously round count |
| Coverage gap | URL coverage regressed |

**Queues — nothing is broken, there is work waiting.** Aggregate count rows,
visually subordinate:

| Condition | Meaning |
| --- | --- |
| Flagged events | N events awaiting review |
| Price submissions | N prices awaiting review |

**Why keep the queues on the front door at all,** given they each already have a
nav badge: because the front door was declared the complete answer to "what
needs me." If the queues vanish from it, it becomes an incomplete answer and the
admin has to check two places again. But equal visual weight would be wrong —
"Bluebird went dark" and "4 prices waiting" are different categories of news.

### 3.5 Faults are never truncated

Every currently-broken venue gets a row. No cap, no "top 3."

Ordering is severity first, then how long the condition has persisted (longest
first — a venue broken for twelve days is worse than one broken since last
night).

**Why:** the panel currently caps at three venues and silently drops the rest.
A silent cap is the same failure as a missing condition — the front door
appearing calm while things are broken. On a bad crawl night this may mean a
dozen rows, and a bad night is exactly when the full picture matters most.

The queue tier stays bounded by construction (two aggregate rows).

### 3.6 Recovery is derived, not dismissed

A went-dark venue leaves the panel when its next crawl recovers — specifically,
while its latest run remains below the drop threshold against its baseline, it
is in the set; one healthy crawl removes it.

No timer, no manual dismiss, no resolved-but-lingering state.

**Why:** the same query answers "is this broken" and "should this clear," so the
panel and the alerting logic cannot drift apart. A dismiss affordance would
reintroduce per-item state — the exact thing 3.2 and 3.3 remove — and would need
its own re-arm rule (does a *worse* drop un-dismiss it?).

---

## 4. What Design will produce

1. **The redesigned "Needs attention" panel** — full state, showing both tiers
   with several faults present.
2. **Fault row anatomy** for all five conditions, with particular attention to
   the three that have never been designed (went dark, ceiling suspected,
   coverage gap). These carry quantitative evidence the existing rows don't —
   "12 → 2 events against a 7-day average" is the useful bit, not just "this is
   broken."
3. **Severity treatment across five fault types** without the panel reading as
   an undifferentiated wall of red. Blocked and went-dark are both bad; they are
   not equally urgent or equally actionable.
4. **The tier boundary** — how faults and queues are visually separated so the
   subordination reads without the queues feeling like an afterthought.
5. **States:**
   - Empty — nothing is broken, no queues. This is a **good** state and should
     feel like one, not like an error or a shrug.
   - Queues only — nothing broken, work waiting.
   - Faults only.
   - Both tiers populated.
   - High volume — a dozen-plus faults, uncapped.
6. **Mobile layout** at 320px baseline for an uncapped panel, including how a
   long fault list behaves within the dashboard's vertical rhythm.
7. **A11y annotation** — severity conveyed by more than colour, heading
   structure, live-region behaviour on refresh, focus order through the action
   links.

---

## 5. Technical requirements

- **Themes:** production ships nine themes off one identical token set. Mocks
  need only the three base themes (Electric, Jade, Light), but every colour must
  come from a token — no hardcoded hex survives the other six. `accent-2` is
  defined in all nine and can be used directly.
- **Existing primitives:** build on `Panel` and the established
  `danger`/`warning`/`signal`/`neutral` tint scale rather than introducing a
  parallel visual language. This panel sits among other dashboard panels.
- **Copy:** every customer-facing string belongs in
  `components/admin/definitions/copy.ts` — none hardcoded in JSX. Venue names,
  counts, and timestamps are data, not copy.
- **Parity:** mobile and desktop need full behavioural parity. Visual
  differences are expected; behavioural asymmetry is not.
- **A11y:** WCAG AA. 44px minimum on interactive controls.
- **Voice:** this is an admin surface, so it runs plainer than the consumer app —
  direct and factual over playful. It should still sound like a person wrote it.
  Avoid alarm-fatigue language; the panel is read daily and mostly says nothing
  is wrong.
- **Dependencies:** no new ones preferred. Icons come from `lucide-react`.

---

## 6. What's NOT in this brief

| Out of scope | Owner |
| --- | --- |
| Consumer in-app notifications | #737 — separate system, `user_notification` rows, already designed |
| Sentry and email delivery for went-dark | Closed by #1214; independent channels, unaffected |
| Alert thresholds and detection logic | #624 / #1174 — the detection is correct and stays as-is |
| `/admin/review` and `/admin/prices/submissions` | Survive unchanged as deep-dive surfaces |
| The admin nav's existing badge system | Already built and working; no changes proposed |
| Other dashboard panels | Only "Needs attention" is in scope |

---

## 7. Decisions inherited

- **Admin visual language** — `design_handoff_admin_ui_v2` established the shell,
  panel primitives, and severity tints this panel already uses.
- **Nine-theme token discipline** — no hardcoded colour in any component.
- **Mobile-first at 320px** — expand upward.

---

## 8. Open for Design to call

Everything in §4 is Design's to decide. Explicitly unresolved and deliberately
left open:

- Row anatomy and information hierarchy for the three new crawl-health
  conditions — how much evidence to show inline versus behind the action link.
- Whether the five fault conditions need five distinct glyphs, or fewer glyphs
  differentiated by ink. (#737's handoff landed on *ink = valence, glyph =
  event* for the consumer surface — worth considering for coherence, but this is
  a different system and Design should take it or leave it on its merits.)
- The tier separator treatment.
- Empty-state illustration, copy, and tone.
- Whether persistence duration ("12d") is a first-class column, inline meta, or
  something else.
- Whether the panel needs a total count in its header.
- High-volume behaviour beyond simple stacking — the *content* is uncapped
  (locked), but presentation within that constraint is open.

---

## 9. Cross-references

- **Ticket:** #1215
- **Detection logic:** #624 (event-count drop), #1174 (cooldown fix)
- **Delivery channels:** #1214 (Sentry), existing email
- **Removed surface's origin:** #542 (admin inbox build) —
  `docs/superpowers/plans/2026-07-12-admin-inbox.md`
- **Consumer sibling:** #737 — `design/design_handoff_in_app_notifications/`
- **Admin visual language:** `design/design_handoff_admin_ui_v2/`
- **Pipeline:** `docs/superpowers/design-pipeline.md`
- **Target handoff folder:** `design/design_handoff_admin_triage/`
