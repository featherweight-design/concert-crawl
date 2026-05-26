# Phase 8.5 — Corroboration & Reporting

**Issue #556 · Concert Crawl event detail page · Beta**

The input side of community price submission, plus fan event reporting. Built on the existing Phase 7 / 7.2 / 8 visual system — no new tokens, no new typefaces, no new tier colors.

> **TL;DR — four surfaces.** Pending price card (one chosen direction, three trust-tier variants), corroboration sheet with friction, dispute indicator + counter-submit sheet (Phase 8 form shape, "update" framing), admin dispute resolution panel, and fan event reporting (sold-out / cancelled / postponed + a conditional retract path). All sit inside one design canvas in `Corroboration & Reporting.html`.

---

## v2 changes (May 25 — Hugh's review)

Specific revisions from the initial pass:

1. **No more "face value" lead.** Pending and corroborated cards no longer carry "face value" as the headline framing. Only **box-office** submissions wear it — face-value-no-fees is what makes box-office structurally distinct from everything else.
2. **Full Phase 8 submission shape.** Every card now renders `floor` + `ceiling` (range), `tier` (GA / Reserved / VIP / Pit / Lawn), and `vendor` — the same payload the Phase 8 SubmitForm produces. The vendor surfaces as "seen on {vendor}" matching the Phase 8 verify-card microcopy.
3. **Trust tiers wired through.** Pending cards now route through `pendingTokens(kind)`. Box-office pending gets the gold tint + star pill + "face value · no fees" framing; community pending stays azure. Vendor and resale aren't supported here because they aren't reachable through the fan submit flow.
4. **Direction B is the primary direction.** Direction A is kept in the canvas as a single comparison section at the bottom for future reference.
5. **`ReportSheet` is now conditional.** "Tickets available" only renders when there's a status report to counter. Three configurations: default (sold-out / postponed / cancelled), already-sold-out (tickets available / postponed / cancelled), already-cancelled (tickets available only).
6. **Counter-submit sheet mirrors Phase 8 SubmitForm.** Same fields — floor + ceiling + tier chips + vendor chips — same anti-abuse posture. Copy + color reframed: the Phase 8 dispute form's `--danger` "File dispute" became `--signal` "Submit update". Same mechanic, friendlier framing.

## v3 changes (May 25 — engineering's design review)

After engineering's design review of v2, four follow-up changes:

7. **`submission_confirms.method` added.** Phase 7/8's `submission_confirms` table doesn't have a method column today. The corroboration sheet collects this implicitly. Schema now adds it (see section 8 schema delta) — values: `"same-vendor" | "other-vendor" | "box-office"`. Aligns with `eventReportConfirms.method` so price-side and status-side corroboration share the same shape.
8. **Box-office corroboration path is split into two options.** v2 said "If you BOUGHT a ticket, you'll be promoted to a separate box-office submission" but left the sequencing ambiguous. v3 makes it explicit by surfacing TWO box-office options:
   - **"Saw the price at the box office"** → posts a `method=box-office` confirm on the existing submission. Done.
   - **"Bought a ticket at the box office"** → posts a `method=box-office` confirm on the existing submission AND opens a follow-up `SubmitPriceModal` pre-filled as a fresh gold-tier (`kind=boxoffice`) submission for the purchase.

   Both options map to the same schema value (`method=box-office`) — the difference is purely the routing afterward. Sequencing locked: confirm posts first; the SubmitPriceModal opens only after the confirm succeeds, so a failure there doesn't lose the corroboration.
9. **Note field on price submissions — deferred.** Phase 8's SubmitForm doesn't currently collect a note. The pending card design includes a note display because notes are high-value for corroborators (context shortens the verification loop). Recommendation: add an optional `note` textarea to the SubmitForm in a small Phase 8 enhancement. Until then, the pending card handles `note=null` gracefully — nothing to gate on. Flagged in section 9.
10. **Corroboration sheet accent follows the submission's tier.** Box-office corroboration sheets use gold (radio selection + Confirm CTA); community stays azure. Reinforces the trust tier visually so the fan knows what they're vouching for.

## v4 changes (May 25 — engineering review round 2)

Three blocking + two confirmed items from the second review pass:

11. **[BLOCKING] Price disputes admin queue.** Added `<PriceDisputesQueue/>` — a table of pending price disputes across all events. Sits inside the existing Review page as an auto-hiding section under "Price coverage" (same pattern as `PendingSubmissionsPanel`). Row shape: event name + venue + date + original price (with tier kind chip) + counter price + filed-at + Resolve → button. Resolve opens `<AdminDisputePanel/>`. Without this, a counter-submission that doesn't reach 2 fan confirms sits in limbo forever.
12. **[BLOCKING] Event status reports admin queue + per-event resolution panel.** Added `<EventReportsQueue/>` (cross-event table with filter chips for kind) and `<EventReportResolutionPanel/>` (per-event two-up resolution, mirrors `AdminDisputePanel` chrome). The queue auto-hides when empty and surfaces ER_POLICY-imminent rows with an `imminent · <7 days` tell. The resolution panel renders three modes: pending + counter, no counter filed, and winner-highlighted. Six artboards across both surfaces.
13. **[NEW] Multi-tier prices — tier is display metadata, not a competing claim.** Added `<TwoPendingStack/>`, `<MultiTierLiveCard/>`, `<MixedTierCard/>`, `<TierAlternateRow/>`. Two pending PendingCardBs stack in the price-card slot; resolved state shows the cheapest tier as the headline with "from $40 · GA" framing and higher tiers in tier-alternate rows (same rhythm as PriceBlockB's cross-vendor alternates). Three resolved examples: two tiers, three tiers, and a mixed-trust state (box-office GA + community Reserved).
14. **[COPY] Corroboration sheet escape hatch.** Changed the bottom link from *"I saw a different number → submit an update"* to *"Saw a different tier or a different price? Submit an update instead."* Picks up the cross-tier case explicitly.
15. **[NOTED] Note field is shipping** — 280 chars, server-moderated. No design change needed; pending card design already renders it.

---

## Alignment with existing Phase 7 / 7.2 / 8 work

| Existing surface | Where it shows up here |
|---|---|
| **Phase 8 `SubmitForm`** (`floor`, `ceiling`, `tier`, `vendor`, plus the post-May-13 `action` / `method` for box-office) | The pending card renders the result of a `SubmitForm` submission. Field names + values match exactly. |
| **Phase 8 `DisputeForm`** (floor + ceiling + vendor required) | `<CounterSubmitSheet/>` IS the Phase 8 DisputeForm with reframed copy + signal color instead of danger. Same form, different frame. |
| **Phase 8 `VerifySheet`** (list of submissions with inline confirm / dispute buttons) | Unchanged. `<CorroborationSheet/>` is what opens when a fan taps Confirm from any of those buttons — it adds the "How did you check?" friction layer on top. |
| **Phase 7 v2 `PriceBlockB`** (live card) | The pending card B uses the same chrome (`var(--surface-1)`, `var(--border)`, `12px` radius, mono eyebrow, 28/800 number, mono tier label). Pending → live should not break visual rhythm. |
| **Phase 7.2 trust marks** (`boxoffice` gold, `community` azure, `resale` coral, `primary` vendor-neutral) | Pending uses `PendingTrustPill` which mirrors the live `TrustMark`. Same colors, same shape. |
| **`price.soldOutBy` / `price.soldOutConfirms`** on the price object | Unchanged for the read path. The new `eventReports` table is the write side; rendering still reads the denormalized fields on the price. |

**Things that haven't changed** (intentionally):
- Phase 8's `SubmitForm` doesn't need to change for Phase 8.5. The submit flow as it exists produces a payload that this design renders correctly. No new fields on the submit side.
- The `SubmitForm.alreadySubmitted` state Phase 8 specified (showing the user's existing pending submission inside a `--surface-1` card with PendingPill + price line + "you" pill) is the inline version of `<PendingCardB view="submitter"/>`. The fuller card from this handoff is what surfaces on the **event detail page** itself; Phase 8's compact version stays inside the SubmitForm sheet.

---

## Surfaces · file map

```
design_handoff_phase8_5_corroboration/
├── Corroboration & Reporting.html      ← entry point
├── README.md                           ← this file
│
├── pending-card.jsx                    ← <PendingCardB/> (primary), <PendingCardA/> (alt)
│                                          <PendingTrustPill/>, pendingTokens(kind)
├── dispute-surfaces.jsx                ← <CorroborationSheet/>, <DisputedPriceCard/>,
│                                          <CounterSubmitSheet/>, <AdminDisputePanel/>,
│                                          <SheetFrame/>, <SubmissionDetailCard/>,
│                                          <VerifyOption/>, <ChipGroup/>, <NumField/>
├── report-flow.jsx                     ← <ReportFooterLink/>, <ReportSheet liveStatus/>,
│                                          <EvidenceForm/>, <PendingReportBanner/>,
│                                          <PendingSoldOutCard/>, <ConfirmReportSheet/>,
│                                          <LiveReportBanner/>, <ReportTypeMark/>
├── multi-tier.jsx                      ← <TwoPendingStack/>, <MultiTierLiveCard/>,
│                                          <MixedTierCard/>, <TierAlternateRow/>
├── admin-queues.jsx                    ← <PriceDisputesQueue/>, <EventReportsQueue/>,
│                                          <EventReportResolutionPanel/>
│                                          (inline AdminPanel/AdminBtn/AdminStatusBadge —
│                                          engineering implements against the real
│                                          admin-primitives.jsx primitives)
├── corroboration-canvas.jsx            ← canvas wiring · 13+ sections
│
├── theme-context.jsx                   ← shared
├── primitives.jsx                      ← shared
├── design-canvas.jsx                   ← shared
├── price-block.jsx                     ← shared (referenced for live-card chrome)
└── price-data.jsx                      ← shared
```

---

## 1. Pending price card (Direction B · chosen)

`<PendingCardB/>` mirrors a live `PriceBlockB` card with a single addition: a pending strip at the top carrying mono pending tell + dot progress.

**Props mirror a Phase 8 submission payload exactly:**

```js
<PendingCardB
  floor={48} ceiling={58}    // range when present
  tier="GA"                  // GA / Reserved / VIP / Pit / Lawn
  vendor="AXS"               // any VENDOR_OPTIONS value
  kind="community"           // "community" | "boxoffice"
  action="bought" method="in-person"  // only when kind === "boxoffice"
  submitter={{ handle: "@hugh", url: "/u/hugh" }}  // or null for anonymous
  submittedAt="2h ago"
  confirms={1} needed={2}
  view="other"               // "other" | "submitter" | "self-locked"
  note="GA standing — checked the cart on AXS."  // optional
/>
```

**What the card renders, top to bottom:**

1. Pending strip — mono "PENDING · ●○ 1 of 2 confirmed · 1 to go". Color is azure for community, gold for box-office.
2. Eyebrow — "TICKETS" (community) or "BOX OFFICE" (box-office, gold).
3. Headline row — `$48–58` (Inter 28/800) + `GA` mono tier label + optional "face value · no fees" (box-office only) + trust pill.
4. Vendor line — "seen on AXS" (mono 10, `--fg-muted`).
5. Box-office subtier line (box-office only) — "Bought in person at the venue" / "Bought by phone from the venue" in gold mono.
6. Attribution — "Submitted by @hugh · 2h ago" or "an anonymous fan".
7. Optional fan note in a quoted block.
8. Footer — Confirm CTA (other fan view), Waiting on one more fan dashed badge (self-locked), or Edit/Withdraw row (submitter view).

**The "face value" rule** (locked May 25). The phrase "face value" is only emitted when the submission is `kind === "boxoffice"`. For community submissions the card shows the price + tier + vendor and leaves it at that — the fan may have submitted a face number or an all-in number, and we don't claim either way until the price is corroborated and we know the answer from the vendor data.

**Direction A** is preserved in `pending-card.jsx` as `<PendingCardA/>` and shown in the bottom section of the canvas for comparison. Same prop interface as B.

---

## 2. Corroboration sheet · friction by design

`<CorroborationSheet/>` is full-screen. Two main states:

| State | Trigger | Body |
|---|---|---|
| `fresh` | other fan tapped Confirm on a pending card | `<SubmissionDetailCard/>` showing the full Phase 8 submission shape (range + tier + vendor + trust pill + note), then "How did you check the price?" radio: Same vendor (X) / Different vendor / At the box office. Confirm CTA disabled until a method is picked. |
| `self-locked` | the submitter tapped Confirm on their own submission | Shows the submission with a dashed "Waiting on one more fan" panel + Edit / Withdraw buttons. |

The bottom of the fresh sheet always carries a soft `I saw a different number → submit an update` link. Catching the dispute case here keeps the fan in the corroboration loop instead of bouncing them back to the price card.

**Why the friction.** Per Hugh's May 25 note: "entice people to actually verify prices versus just hitting a confirm button out of laziness/convenience." The radio is three options — small enough not to be tedious, big enough to make a tap-through feel wrong. Picking "At the box office" hints that the fan may be eligible to file a fresh box-office submission (Phase 7.2 tier-derivation rules apply).

---

## 3. Dispute indicator · "price update", not callout

`<DisputedPriceCard/>` is the live priced card with a soft strip above the headline:

```
[update pending]  @kel saw $65–80 · 1h ago
$48–58  GA  [community]
seen on AXS
Submitted by @hugh · yesterday · 2 fans confirmed
─────────────────────────────────────────
Got a different number?    [ Submit an update → ]
```

The strip uses `--fg-muted` neutral chrome with a dashed bottom border — intentionally not warning, not danger. The Phase 8 README had a `--danger` "File dispute" treatment for the same flow; **we shifted this to neutral + "Submit an update" copy per Hugh's May 25 reframe.** Same mechanic, different frame.

**Visibility:** everyone (logged-in fans + anonymous browsers). Per Hugh's earlier call — transparency over polish.

---

## 4. Counter-submit sheet · Phase 8 form, update copy

`<CounterSubmitSheet/>` mirrors the Phase 8 `SubmitForm` shape exactly:

- **Floor** (required) — `$` prefix, Inter 16/700
- **Ceiling** (optional) — same shape
- **Tier chip group** — GA / Reserved / VIP / Pit / Lawn
- **Vendor chip group** — AXS / Ticketmaster / SeatGeek / DICE / Eventbrite / Venue box office
- **Submit update** CTA — `--signal` colored, NOT `--danger`

Microcopy reframed end-to-end. Phase 8's dispute form said:
> "What did *you* see instead?" / "Disputes have to come with a price and a vendor. Keeps it honest." / **File dispute** (`--danger`)

Phase 8.5 says:
> "Update the price." / "Currently listed: $48–58 on AXS. Your update goes pending until another fan confirms." / **Submit update** (`--signal`)

Same fields. Same validation rules. Same anti-abuse posture (rate limit, outlier warning, two-confirm gate). Different vibe.

Server-side, a counter-submit creates a fresh community submission row that runs through the normal 2-confirm gate. If it lands first, the original is auto-archived with a "superseded by counter" reason. If admin intervention is needed, the dispute resolution panel (next section) is the surface.

---

## 5. Admin dispute resolution

`<AdminDisputePanel/>` is unchanged in shape from v1, but now renders the full submission shape (range + tier + vendor + trust pill) for both the original and the counter. 760px wide, two-up comparison, accept/reject with a reason field that's shown to both submitters.

Loser is archived (not deleted) with the reason attached. No penalty.

---

## 6. Fan event reporting

### Entry point — `<ReportFooterLink/>`

A single CTA at the bottom of the event detail page, beneath related shows. Inline link, not a hidden overflow menu. Label: **Report a status change**. Subtext: *Sold out, cancelled, postponed — or back on.*

### Bottom sheet — `<ReportSheet liveStatus/>` · conditional

The sheet's options depend on what's currently live for this show. Per Hugh's May 25 call: only show "Tickets available" when there's a live status report to counter.

| `liveStatus` | Options rendered |
|---|---|
| `null` (default upcoming show) | Sold out · Postponed · Cancelled. **No counter option.** |
| `"soldout"` | Tickets available · Postponed · Cancelled (in case escalation is correct). Hides "Sold out" — already live. |
| `"postponed"` | Tickets available (back on original date) · Cancelled (escalation). |
| `"cancelled"` | Tickets available only. Cancelled is terminal — escalation paths past it don't make sense. |

### Evidence form — `<EvidenceForm/>`

After picking a report type, the fan answers:

- **How do you know?** — radio: Got an email from the venue / Saw it on the artist's social / Venue posted an announcement / I was at / called the venue / Something else
- **Link** (optional but loved) — paste an Instagram, Twitter, email, or venue page URL
- **Notes** (optional) — free text

The submit button is colored by the report type (cancelled → `--danger`, postponed → `--warning`) — the fan sees the weight of what they're filing. Per Hugh's May 25 note: *"Did they get an email about the show cancelling? Did the artists announce something on their social?"*

### Pending states · in context

- **`<PendingSoldOutCard/>`** — sits in the price-card slot. Strikethrough price + a pending strip at the top + the reporter's evidence as a clickable row.
- **`<PendingReportBanner kind="cancelled"/>`** — sits **above the title** as a banner. Cancelled reshapes the entire page; users need to know before scrolling. Price card hidden while pending.
- **`<PendingReportBanner kind="postponed"/>`** — same banner shape, `--warning` color, the price card stays visible.

Each renders three views: other fan (Confirm CTA), reporter (Add evidence / Withdraw), self-locked.

### Confirm-report sheet — `<ConfirmReportSheet/>`

Same friction model as the price corroboration sheet, status-shaped:

- I saw the same source
- I have my own evidence
- I heard from someone at the venue

Same "I think this is wrong → counter-report" escape at the bottom, routes through the conditional `ReportSheet` with `liveStatus` set.

---

## 7. Color & token discipline

No new colors invented. Every surface uses existing theme tokens or the three tier-color tokens already in play (gold, azure, coral, vendor-neutral).

| Surface | Token / color |
|---|---|
| Pending price · community | `oklch(0.62 0.12 240)` — community azure |
| Pending price · box office | `oklch(0.66 0.14 78)` — gold + tinted card + star pill |
| Dispute indicator | `--fg-muted` (neutral) — disputes are updates, not alarms |
| Counter-submit CTA | `--signal` — same as a normal price submission |
| Sold-out report | `--warning` — reuses the existing PriceBlockB pill |
| Postponed report | `--warning` + outlined chrome + clock glyph |
| Cancelled report | `--danger` — the only terminal state |
| Tickets available (counter) | `--success` |
| Admin "winner" highlight | community azure |

---

## 8. Engineering decisions · `eventReports` table

**Status: resolved with engineering, May 25.** Everything below is the agreed shape. Where the design needs to react (microcopy, thresholds, surfaces), it's called out inline.

### Schema (final)

```js
eventReports {
  id                   uuid
  eventId              uuid
  kind                 enum  "soldout" | "cancelled" | "postponed" | "ticketsAvailable"
  reporterId           uuid
  reportedAt           timestamp
  evidenceType         enum  "email" | "social" | "venue-announcement" |
                             "venue-visit" | "other" | "admin-override"
                             // renamed from evidenceKind for consistency with
                             // submission howFound naming
  evidenceLink         string  optional
  evidenceNote         string  optional
  status               enum  "pending" | "live" | "archived"
  corroborationCount   int     // denormalized for read perf, mirrors
                               // submissions.corroborationCount
  archivedAt           timestamp  optional
  archivedReason       string  optional
  supersededBy         fk eventReports.id  optional
}

eventReportConfirms {
  id                uuid
  eventReportId     fk eventReports.id
  confirmerId       uuid
  confirmedAt       timestamp
  method            enum  "saw-source" | "own-evidence" | "word-of-mouth"
  // UNIQUE (eventReportId, confirmerId) — one-confirm-per-user enforced at DB
}
```

### Schema delta · price side

The corroboration sheet for price submissions collects a `method` value the same way the event-report confirm sheet does. This wasn't in the existing `submission_confirms` table; engineering's review identified the gap. Add:

```js
submission_confirms {
  // existing columns…
  method  enum  "same-vendor" | "other-vendor" | "box-office"
                // surfaced from the corroboration sheet's "How did you check?"
                // radio. Used for admin review signal quality; doesn't affect
                // promotion logic.
}
```

The corroboration sheet has **four** UI options that map to **three** schema values:

| UI option | `method` value | Side effects |
|---|---|---|
| Same vendor (X) | `same-vendor` | None — confirm posts and that's it |
| A different vendor / site | `other-vendor` | None |
| Saw the price at the box office | `box-office` | None |
| Bought a ticket at the box office | `box-office` | Confirm posts FIRST. On success, client opens `SubmitPriceModal` pre-filled with `kind=boxoffice` for the gold-tier submission. A failure in the box-office submit modal doesn't lose the corroboration. |

The split between "saw" and "bought" at the box office is purely a UI clarity move — the fan needs to know that one path opens a follow-up flow and the other doesn't. The schema doesn't need to distinguish them because Phase 7.2's box-office submissions already carry their own `action`+`method` columns when filed via SubmitPriceModal.

### Rules baked into the design

| Rule | Source | Where the design reflects it |
|---|---|---|
| **Reporter can't confirm own report** | Same pattern as price submissions | `<ConfirmReportSheet/>` server-side check; self-locked banner state |
| **One confirm per user per report** | Unique constraint `(eventReportId, confirmerId)` | Self-locked banner state; idempotent client |
| **One report per event per user per 24h** | Mirrors `SP_POLICY.rateLimitHours` | Footer link copy + sheet entry; engineering enforces |
| **Default threshold: 2 fan confirms OR admin promotion** | `ER_POLICY.confirmsRequired = 2` | All pending banners; evidence-form footer microcopy |
| **Cancelled on show < 7 days out: 3 confirms** | `ER_POLICY.confirmsRequiredImminentCancelled = 3`; `events.date - now() < 7 days` checked in confirm promotion logic | See section **8b** below — banner reads "1 of 3 confirmed", evidence form shows a warning panel explaining the higher bar |
| **Auto-archive on counter-promotion** | One transaction: new report goes live + conflicting live report flips to `archived`, `supersededBy` set | `<ReportSheet liveStatus/>` only surfaces "Tickets available" when there's something to counter |
| **events.status propagation** | `cancelled` / `postponed` flip `events.status`; counter `ticketsAvailable` flips back to `upcoming`; **soldout only updates `price.soldOutBy` + `price.soldOutConfirms`** — does NOT change `events.status` | Pending banner for sold-out lives in the price-card slot (price-adjacent only); pending banner for cancelled/postponed lives above the title (whole-page-state) |
| **Denormalized read path** | `events.status`, `price.soldOutBy`, `price.soldOutConfirms` are projections; `eventReports` is write-side truth | Renderer reads existing fields, no JOIN added; promotion job updates projections in same transaction |
| **Admin override creates synthetic eventReport row** | `reporterId = adminUserId`, `evidenceType = "admin-override"`, `evidenceNote = adminNote` | Future admin UI should render these with an "Admin override" pill — flagged for the admin-UI track |
| **Withdrawal** | `status = archived`, `archivedReason = "withdrawn by reporter"`, confirms stay on archived row | Reporter view of pending banner has a Withdraw link |
| **Edit `evidenceLink` / `evidenceNote` within 24h** | Same window as price-submission edits | Reporter view of pending banner has an "Add evidence" link |
| **Edit `kind` resets confirms** | Deletes all `eventReportConfirms` rows in the same transaction | Out-of-flow today (the report sheet doesn't offer edit-kind on a pending row) — flagged below |

### 8b. ER_POLICY · cancelled on imminent shows

The 3-confirm rule for cancelled reports on shows < 7 days out surfaces in two places:

1. **`<EvidenceForm confirmsRequired={3} showDate="in 4 days"/>`** — warning panel above the radio explaining the higher bar. Tone: explain, don't lecture. Copy: *"This show is in 4 days — we need 3 confirms instead of 2. A wrong cancellation on an imminent show hides the event from upcoming. Higher bar, same process — strong evidence is the fastest path."*
2. **`<PendingReportBanner needed={3}/>`** — the dot progress strip renders three dots instead of two, and the count reads "1 of 3 confirmed". No new chrome needed — the `needed` prop already drives the count.

The 7-day threshold is `ER_POLICY` configurable, mirroring `SP_POLICY`. If usage data suggests tightening (e.g. shows < 14 days), it's a constant change.

### Surfaces still owed to admin UI

When the admin-UI track picks this up:

1. **Cross-event queue** — paginated table of pending reports across all events. Filter by `kind`. Sort by `reportedAt` desc. Quick-promote / quick-demote buttons inline.
2. **Per-event resolution panel** — same two-up shape as `<AdminDisputePanel/>` but for status reports. Original report + any counter on the right. Accept/reject + reason field.
3. **Admin-override surface** — when admin sets `events.status` directly (creates synthetic eventReport), render that row with an "Admin override" pill + the admin's note. Distinguishes from fan-corroborated reports for audit clarity.
4. **Reporter trust view** — per-user history of reports filed, promoted, archived. Hooks into the existing `priceCredScore` pattern; a negative-equivalent (`reportDemotedCount`) is the right field to surface here. Phase 9 anti-abuse work.

Ping me when admin UI is unblocked — the chrome and patterns are already in `design_handoff_admin_ui_v2/`, and I can pull these surfaces through.

### Notifications · flagged for the next track

Not part of this handoff. Engineering confirmed `eventReports` has everything needed to generate these when the notifications track lands:

- Reporter pinged when their report goes live
- Reporter pinged when their report is countered
- Watching users on the event pinged when cancelled or postponed goes live

---

## 9. Out of scope · deferred enhancements

- **Note field on Phase 8 SubmitForm.** The pending card displays a note (italic quoted block) when one's attached to the submission — high-value for corroborators (context shortens the verification loop, and the note often *is* the evidence: "checked the cart at 9pm Friday"). Phase 8's SubmitForm doesn't collect this today. Recommended next step: add an optional `note` textarea (200 char max, soft anti-abuse) to the SubmitForm + add a `note` column to `price_submissions`. Until then, the pending card design handles `note=null` gracefully — nothing in this handoff blocks on it.
- The notification surface that fires when a watched show's price / status changes. Pure consumer side; lives in a different track.
- Email templates for "your submission was confirmed" / "your submission was countered". Copy direction is locked in by the voice work — engineering can lift from the empty-state and feedback-modal handoffs.
- Phase 8's `SubmitForm` itself, beyond the note-field enhancement above. Its existing output IS the input to this design.
- Desktop layout for the new surfaces. Mobile-first per the brief; desktop can use the same vertical layout in a centered column at wider widths, matching Phase 7 v2's desktop pattern.
