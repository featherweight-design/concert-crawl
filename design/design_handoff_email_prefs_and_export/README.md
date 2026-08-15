# Email preferences + Data export — Concert Crawl

Two controls added to `/me`. Nothing else on the surface changes: section order,
push toggles, and digest scheduling are all untouched.

Canvas: **`Email Prefs + Data Export.html`** — 7 sections, mobile (393 + 320) +
desktop (1280), all three themes on the two new components.

## Files

| File | What's in it |
|---|---|
| `email-export.jsx` | `EX_COPY` · `<EmailFromUsGroup>` · `<DataExportRow>` · `<ExportStatusLine>` · `<NotificationsSection>` · `<AccountSection>` · `<DangerZoneSection>` |
| `me-primitives.jsx` | `<ToggleSwitch>` (40×24) · `<MeToggleRow>` · `<MeStaticRow>` · `<MeNavRow>` · `<SettingsRowGroup>` · `<SectionRail>` · `<GroupFootnote>` · `<MeShellMobile>` · `<MeShellDesktop>` · `MeIcon` · `CCMark` (verbatim copy — source of truth is `browse-home.jsx`) |
| `me-screens.jsx` | `<MeHubMobile>` · `<MeNotifDesktop>` · `<MeAccountDesktop>` · `<MeDangerDesktop>` |
| `theme-context.jsx` / `ios-frame.jsx` / `design-canvas.jsx` | local copies of project primitives |

Every primitive here is the shipped settings vocabulary re-expressed so this
handoff renders standalone. **Nothing new was invented at the row level** — if a
primitive in this folder disagrees with the live one, the live one wins.

---

## Decisions log

### 1. Product email is its own group — not a row in an existing one

The obvious move is a sibling row next to the weekly digest. It's wrong, because
the digest lives inside **Artists you follow**, and that group collapses to a
single upgrade card for free users. Winback email targets exactly the people who
would then have no opt-out at all. So the product-email control gets its own
group, **outside the push master and outside entitlement** — the same structural
argument that keeps crew activity out of push.

**We did not use a disabled toggle for free users.** There is no tier in which
this preference is unavailable; a greyed switch would be a lie about the
entitlement, not a description of it.

### 2. The group sits ABOVE the gated group, not below it

Order inside Notifications is now:

```
Push            master + New show alerts · Watch updates · Price drops
Email from us   ← new. product-email switch + billing footnote
Artists you follow   entitlement-gated · holds the weekly digest
```

Above, because a control placed under an upgrade card inherits its framing even
when it isn't gated. Below the push group, because push is still the section's
headline concept.

**Weekly digest does not move.** It stays where it ships, in the Artists group,
under its own entitlement. Two email switches in two places is a real cost, and
we're paying it knowingly — the alternative moves a Premium feature out from
behind its own paywall to satisfy a grouping instinct.

### 3. Billing email is a footnote, not a row

Prose at the foot of the group: `<GroupFootnote>` — 11.5px, `--fg-subtle`, an
outline info glyph, **no card, no row anatomy, no switch slot.** Anything with a
row's shape invites the question "where's my toggle?"; a mono `ALWAYS ON` tag in
the switch position answers a question the user shouldn't have been prompted to
ask. It explains *why* instead of asserting a rule:

> Billing email always sends: receipts, a failed charge, a card about to
> expire. Those aren't news, they're your subscription talking, and missing one
> is how people lose a plan without knowing why.

### 4. The product switch is a plain two-way toggle

Default ON, so at rest the row reads on. Its detail line carries the state:

- ON — *"Rare. A discount, or a heads-up when a gift is running out."*
- OFF — *"Off. Nothing from us but billing."*

The OFF copy is doing the reversibility work the old unsubscribe page promised
and couldn't deliver: a user who landed here from the one-click link sees the
switch already off, sees exactly what still sends, and can flip it back.

### 5. Data export lives at the bottom of Account

Order: `Email address · Password · Member since` → **Your data**. Danger zone is
the next section along — its own page on the desktop sidebar, its own section in
the mobile scroll. `Delete account` is never inside Account.

- **Account, not a new section.** A new "Your data" section for one row inflates
  the sidebar from 8 to 9 items for a single control, and the control is an
  account operation — same family as your email address.
- **Last in Account,** so it's a neighbour of Danger zone without sharing a
  container with it. Export is export-then-continue; Danger zone is
  irreversible. Neighbours, not roommates.
- **Not in Danger zone.** Nothing is destroyed and nothing is lost. Putting a
  download under a red header teaches people to fear a safe action.

### 6. Pending inline, refusals beneath

The whole row is the button — the **Save-to-calendar** precedent, verbatim
anatomy: 36px `--surface-2` icon tile, 14.5/700 label, mono meta line, mono chip
at the trailing edge.

| State | Row | Beneath |
|---|---|---|
| `rest` | chip `JSON`, `--signal` · pressable | — |
| `pending` | spinner in the tile, chip `WORKING`, meta → *"Putting your file together…"*, `aria-busy`, un-pressable | — |
| `limited` | dimmed to 0.62, un-pressable | `--warning` status line, mono rail `HOLD ON` |
| `failed` | back to rest, pressable | `--danger` status line, mono rail `DIDN'T WORK` |

Refusals sit **outside** the row so the row's own copy never has to double as an
error message — the label stays "Download your data" in every state, which is
what makes the retry obvious.

Rate-limit copy carries the server's exact wait: *"One export an hour. Try again
in 43 minutes."* Failure stays generic and says nothing about cause: *"Signal
lost. The export didn't come through. Give it another go."*

### 7. No filename anywhere

The server names the file. Design specifies the chip as the format tag (`JSON`),
never a filename, and no state mentions one.

---

## Component handoff

### `<EmailFromUsGroup on onToggle showRail />`

```
SectionRail   "Email from us" (no meta tag)
SettingsRowGroup (--surface-1, 1px --border, r12)
  MeToggleRow  leading MeIcon.mail (--fg-muted)
               label   14.5 / 600 --fg
               detail  12.5 / 500 --fg-muted, textWrap pretty
               switch  ToggleSwitch 40×24
GroupFootnote  11.5 / --fg-subtle, info glyph, no container
```

Row padding `14px 14px`; group gap `10px`. The switch is `role="switch"`,
`aria-checked`, `aria-label` = the row label; the row itself is a `<div>` so the
switch is never nested in a button.

### `<DataExportRow state wait onPress showRail railTitle />`

`state`: `rest | pending | limited | failed`. `wait` is a formatted duration
string (`"43 minutes"`, `"40 seconds"`) — design does not format durations, and
the component takes it ready to render.

> **Corrected at readiness review.** Design assumed the server sends this
> pre-formatted. It does not: `users-export.ts` returns a `Retry-After` header in
> seconds plus a generic sentence, and it is not changing. **The client formats
> `wait` and counts down locally.** Only the seam moves; the component contract
> above is unchanged. See `READINESS.md` § B.

```
SectionRail  "Your data" · meta "1 / HOUR"
button (whole row) --surface-1 / 1px --border / r12 / 14px 16px
  tile 36×36 r8 --surface-2, glyph --signal (--fg-muted while pending)
  label 14.5 / 700 --fg
  meta  mono 11 --fg-muted
  chip  mono 9 / 0.14em, --signal + 50% border (--fg-subtle while pending)
hover  --surface-2 (suppressed while disabled)
ExportStatusLine  color-mix(tone 8%, --surface-1) / border tone 34% / r10
                  role="status", mono rail + 12.5 Inter sentence
```

### Tokens used

`--bg` `--bg-elevated` `--surface-1` `--surface-2` `--surface-3` `--fg`
`--fg-muted` `--fg-subtle` `--fg-on-accent` `--border` `--border-strong`
`--signal` `--accent` `--warning` `--danger`. No raw hex, no oklch literals —
all mixes go through `color-mix(in oklch, var(--token) N%, …)`. Validated in
electric / jade / light.

### Accessibility

- Switch: real `<button role="switch">` — focus and Space/Enter for free.
- Export row: real `<button>`, `aria-busy` while pending, `disabled` while
  pending or rate-limited.
- Status lines are `role="status"` so the refusal is announced when it appears
  without stealing focus from the button.
- All rows clear 44px minimum height at 320px.

---

## For eng

1. **One boolean, two writers.** The switch and the one-click email link write
   the same field. The switch is the read of record — a user who unsubscribed by
   link must open `/me` and find it already off.
2. **The unsubscribe confirmation page's copy needs updating** — it currently
   points at "Settings → Notifications". The destination is `/me` ▸
   **Notifications** ▸ *Email from us*.
3. **Rate-limit countdown.** The refusal carries the wait; render it into
   `wait` and re-enable the row when it reaches zero, without a reload. If the
   remaining time is under a minute, say seconds (`"40 seconds"`) — the canvas
   has that board.
4. **Pending is not optimistic.** Keep the row in `pending` until the response
   lands; a fast success just means the state is brief.

## Open for product

- **Two email switches, two places.** Decision 2 accepts the split. If the
  digest ever leaves the Premium gate, the two collapse into this group and the
  Artists group keeps only push rows — one move, no new components.
- **Billing footnote placement on desktop.** It reads at 620px, but the desktop
  panel is the one place a two-column email group would fit. Not proposed here.
