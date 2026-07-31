# Admin Triage Surfaces — #1215 · R1

> The `/admin` dashboard **"Needs attention"** panel, rebuilt around one question:
> **what is wrong right now?**

Open **`Admin Triage.html`** first. Everything is driven from the Tweaks panel.

---

## What this is

The panel could only ever say two things: this venue's crawl `failed`, or this
venue is blocked. The alerts that went unnoticed for weeks were a third shape —
the crawl **succeeded** and quietly returned a fraction of the venue's own
baseline. Detection was working; the front door had no expression for it.

This handoff redesigns the panel as **pure derived state** (brief §3.2). A row
exists because a condition is true at request time. It leaves when the condition
stops being true. No read state, no unread count, no dismiss, nothing that can
linger after a fix or be acknowledged before one.

That is not just a data model — it shows up in the design. There is no dismiss
affordance to place, no read/unread weight to encode, no "resolved" row state to
style, and no per-item control in the tab order. The panel got simpler because
the model did.

---

## The five decisions that were Design's to make (§8)

### 1 · Three severity bands, not five

| Band | Ink | Conditions | What it means |
|---|---|---|---|
| `hard` | `--danger` | Blocked · Crawl failing | The crawl is **not running**. Zero new events, certainly, until someone fixes it. |
| `loss` | `--warning` | Went dark · Coverage gap | The crawl runs, reports success, and **quietly drops events**. Certain data loss, nothing on fire. This is the shape that stayed invisible. |
| `suspect` | `--accent-2` | Ceiling suspected | Usually a pagination ceiling, occasionally a venue that really does have 20 shows. Needs a **look**, not a fix. |

Only two of five conditions are ever red, so red keeps meaning "not running" and
a bad night looks different from an ordinary one. The band also happens to be the
order to work in, which is why §3.5's severity-first ordering needs no separate
priority concept.

**Five glyphs, three inks** — we took #737's *ink = valence, glyph = event* split
and kept it, because it solves the same problem here: five distinguishable
severity tokens don't exist in a vocabulary that has to survive nine themes, but
five distinguishable *glyphs* are free. Glyph carries the condition, ink carries
the band.

`--accent-2` is used rather than `--signal` for the third band on purpose:
`--signal` is the action colour in this system (every deep-link in the panel is
`--signal`), and a severity ink that matches the link colour reads as "clickable",
not as "suspect".

### 2 · Row anatomy — evidence, not adjectives

The three never-designed conditions are exactly the ones carrying real numbers,
so the row is built around **the figure**, not the headline:

```
│ [glyph]  Bluebird Theater  WENT DARK                    Open run ›   for 12d
│          12 → 2 events  ▁▇▇▇▇▇▁
│          −82% against a 7-day average of 11.4 · flags at −60%
```

- **line 1** — venue (13.5/700) + condition chip + (mobile) persistence
- **line 2** — the **evidence figure** at `--fg` in tabular mono, plus a 7-bar
  micro-chart for the two trend conditions
- **line 3** — the context that makes the figure mean something: baseline,
  threshold that fired, what it used to be

Per condition:

| Condition | Evidence | Context | Deep link |
|---|---|---|---|
| Blocked | `HTTP 403` | 9 refusals in a row · last success Jul 18 | Open venue |
| Crawl failing | `6 failures in a row` | parse_failure · pauses itself at 8 | Open run |
| Went dark | `12 → 2 events` + chart | −82% vs 7-day avg 11.4 · flags at −60% | Open run |
| Ceiling suspected | `stuck at 20 events` + chart | 5 runs at the same round number · 34 before June | Diagnostics |
| Coverage gap | `9 of 14 source URLs` | 5 stopped matching · was 14/14 on Jul 12 | Open venue |

**Inline vs behind the link:** inline is whatever decides *whether to open it* —
the drop, the baseline, the threshold, how long it's been true. Everything that
decides *what to do about it* (per-run history, raw source snapshot, extraction
strategy, staged fixes) already lives on `/admin/crawl` and stays there. The row
never duplicates a specialist view.

The threshold is quoted deliberately (`flags at −60%`). Hi-Dive at −54% is in the
fixtures for the same reason: seeing how close a row sits to its own threshold is
how you learn whether to trust the detector.

### 3 · Persistence is a first-class column

`for 12d`, right-aligned, tabular, muted. It's the **second sort key**, so it
earns a column where values line up and can be compared down the list. Muted
because it qualifies the fault rather than being the news.

At 320px the column collapses into a chip beside the venue name — same value,
same type treatment, same prominence, different position.

### 4 · Tier boundary — three quiet signals, not one loud divider

The queue tier changes **ground** (`--surface-1` instead of the card), loses the
**severity rail** entirely, and drops a **type step** (13.5 → 12.5). Tier strips
label both sides in mono (`broken now` / `work waiting`) and carry the count.

Subordinate, not decorative: queue rows keep the count in the title, a real
breakdown line, a 44px target and their own deep link.

### 5 · Empty state — a good state, reported as one

> **all clear**
> **Nothing's broken.**
> All 11 venues crawled clean at 3:02 AM. 89 events came in. Both queues are empty.
> `Next sweep 6:00 PM`

A clean sweep is a **finding**, so it gets the same treatment a fault gets:
numbers, in the same mono, arranged calmly. Reassurance you can check. No
illustration, no mascot, no "all caught up ✨", and success ink appears exactly
once, as a 34px check.

When faults are clear but queues aren't, the good news still gets stated — one
success-tinted strip above the queue tier — so "nothing is broken" is never
inferred from absence.

### Also called

- **Header count:** yes, and it counts **faults**, not everything. "5 faults" is
  actionable; "21 things" would blend broken venues into a price queue and be
  alarming daily. With zero faults it flips to a `success` `all clear` badge; with
  faults only in queues, a neutral `16 in queue`.
- **High volume:** the content is uncapped (locked), so nothing is dropped,
  collapsed or scrolled inside a fixed max-height. What changes at **7+ faults**
  is structure: the single faults strip is replaced by **band strips**, so the
  list gains headings without losing a row. *Rejected: an inner scrollbar* — it
  caps what you see while claiming not to, which is the exact failure that let
  went-dark hide.

---

## States

| State | Artboard |
|---|---|
| Empty (all clear) | §5 · `Empty — a good state` |
| Queues only | §5 · `Queues only` |
| Faults only | §5 · `Faults only` |
| Both tiers | §1 · `Both tiers` + `In context` |
| High volume (16 faults, banded) | §5b |
| Refreshing | §5 · `Refreshing` |
| One fault | §5 · `One fault` |

---

## Mobile · 320px

Full behavioural parity: same rows, same order, same deep links, same uncapped
list, **same tab sequence**. Visual differences only:

- persistence moves from its column to a chip beside the venue name
- the action label sits beside the chevron in a 44px cell; the row remains the target
- Refresh becomes icon-only (accessible name preserved via visually-hidden text)
- in **banded** mode the context line drops so the evidence figure survives the
  narrow column — the figure and the micro-chart never drop

Admin is a web surface, not an installed app, so the mobile artboards use a plain
viewport frame rather than a device bezel.

---

## Accessibility

- **Headings:** `h1` dashboard → `h2` panel → `h3` tier/band strip. The fault list
  is reachable as a landmark path, not a wall of divs.
- **Severity without colour, four ways:** the condition chip's words, the glyph,
  a visually-hidden severity sentence after the chip, and position in the list
  (severity-first ordering). Colour is the fifth carrier, never the first.
- **Contrast:** no text is painted in a band ink except the chip label, which sits
  on its own 14% tint with a 34% edge. Checked in Electric, Jade and Light.
- **Live region:** `aria-live="polite"` + `aria-atomic`, **one sentence** —
  *"5 faults, 16 items in the queues."* Never a row-by-row read of sixteen rows.
  In flight it announces *"Checking venue health…"*.
- **Micro-chart:** `role="img"` with the series spelled out; the same numbers are
  written in text beside it regardless.
- **Focus order:** Refresh → each fault row in displayed order → each queue row.
  One stop per row; the action label is not separately focusable, so desktop and
  mobile produce an identical tab sequence. Nothing opens a layer, so there is no
  focus trap to manage.
- **44px:** rows run 74–96px desktop, 88–112px at 320. Refresh is 44×44. The
  action cell is 44px tall inside the row.

**Eng-owned at build, no visual consequence:** rows are rendered here as
`role="link" tabIndex=0`; production should use the router's `<Link>` so they are
real anchors with middle-click and copy-link behaviour. Keep the `aria-label` —
the composed sentence is what makes the row legible without the layout.

---

## Technical notes

- **Copy** — every string is in `triage-copy.jsx`, which mirrors the `triage`
  block of `components/admin/definitions/copy.ts`. Nothing is hardcoded in JSX.
  Venue names, counts, percentages and timestamps arrive as **data** and are
  interpolated by copy functions. `evidence.*` returns `{ stat, detail }` so the
  copy layer owns the words and the JSX owns the styling.
- **Tokens** — no hex anywhere in the panel. Severity inks are `--danger`,
  `--warning`, `--accent-2`, each used as ink on a `color-mix` 14% tint with a 34%
  edge. `accent-2` is already defined in **all nine** production themes
  (`apps/web/src/theme/themes.ts`), so the third band needs no token work; the JSX
  still writes the defensive `var(--accent-2, var(--accent))` form.
- **Primitives** — `Panel`, `StatusBadge`, `MonoLabel`, `AdminButton`, `StatCard`
  from `admin-primitives.jsx`, unchanged. No new visual language: same card, same
  1px borders, same mono eyebrows, same 13px row titles as every sibling panel.
- **Icons** — `triage-icons.jsx` traces the seven lucide glyphs used (`Ban`,
  `OctagonAlert`, `TrendingDown`, `ArrowUpToLine`, `Link2Off`, `Flag`, `Tag`) so
  the mock is self-contained. Production imports them from `lucide-react`. No new
  dependencies.
- **Not designed** — the removals in §3.3 (`NotificationBell`, `/admin/inbox`,
  the read-state tables) need no mocks. Context chrome in the dashboard artboards
  (greeting, stat row, sibling panels) is reproduced only so the panel can be
  judged in place; it is out of scope per §6 and its strings belong to their own
  surfaces.

---

## File map

| File | Purpose |
|---|---|
| `Admin Triage.html` | The handoff canvas — open this first |
| `triage-copy.jsx` | **All copy.** Mirrors `components/admin/definitions/copy.ts` |
| `triage-data.jsx` | Severity model, condition config, ordering, fixtures, scenarios |
| `triage-panel.jsx` | `AttentionPanel`, `FaultRow`, `QueueRow`, `TierStrip`, `TriageEmpty` |
| `triage-icons.jsx` | Five fault glyphs + two queue glyphs + `EvidenceBars` |
| `triage-scenes.jsx` | Dashboard context (desktop) and 320px scene |
| `theme-context.jsx` | Nine themes, `accent-2` now defined in all of them |
| `admin-primitives.jsx` | Copied unchanged from `design_handoff_admin_ui/` |
| `design-canvas.jsx` · `tweaks-panel.jsx` | Canvas + Tweaks shells |

---

## Open for R2

- **Went-dark micro-chart** is 7 bars because the baseline window is 7 days. If
  detection ever runs a different window per venue, the chart should follow the
  venue's window rather than a fixed 7 — trivial change, worth confirming.
- **Coverage gap** is the one condition with no trend viz; `9 of 14` may want a
  small proportion bar. Left off in R1 because the fraction already reads.
- **Banding threshold** is 7 faults, set by eye. `denseAt` is a prop, and the
  Tweaks panel has a *Force banded* toggle so you can judge the banded treatment
  at five rows before we commit to the number.
