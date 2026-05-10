# Admin · Venue forms (Add + Edit)

Handoff package for the **Add Venue** and **Venue Details / Edit** screens in the Concert Crawl admin. Includes the chosen design plus engineering state references.

> **Status:** ready for handoff — May 2026.
> **Chosen layout (Hugh):** *Form + meta column* (the recommended default, `editLayout: "meta"`).

---

## What's in here

| File | What it is |
|---|---|
| `Venue Forms.html` | The deliverable. Design canvas with 6 artboards + tweak panel. Open this. |
| `venue-forms.jsx` | `AddVenueModal` and `VenueDetailsPage` — the actual screens. |
| `venue-states.jsx` | State reference: field states, submission states, button states, delete dialog. |
| `tweaks-panel.jsx` | Tweak panel primitives (copied from starter). |
| `design-canvas.jsx` | Canvas layout primitives. |

The HTML loads existing admin primitives from `../design_handoff_admin_ui/` and the consumer themes from `../theme-context.jsx` at the project root. **Nothing in those upstream files was edited** for this work — both surfaces stay in sync.

---

## The two screens

### 1 · Add Venue (modal)
- Overlay on the Venues table — fast inline creation.
- Fields: **Name**, **Slug** (auto from name, regenerate icon, editable, `concertcrawl.app/v/` prefix), **Source URL** (live robots.txt chip + favicon chip), **City**, **Initial status** toggle.
- Footer: `Esc` cancel left · `Cancel` / `Save venue` / `Save & crawl now` right. The `⌘ ↵` chip lives inside the primary button so the binding is unambiguous — pressing `⌘ ↵` is *always* the primary "Save & crawl now" action.
- Removed `Contact email` and `Crawl notes` per your "never used" call. `Website URL` consolidated into `Source URL`.

### 2 · Venue Details / Edit (full page)
- Header: venue name + **Verified** pill inline · city · source host link · last-crawled · `View public page` · `Trigger crawl`.
- Left form column (Details): same fields as Add, edit-in-place.
- Right meta column (360px):
  - **Health · 7 days** — % + sparkline + 4 stat tiles (last crawl, avg duration, events tracked, consecutive fails).
  - **Verification** — verified badge, attribution, *Unverify* action.
  - **Recent runs** — last 3 runs (compact); *View all →* links to `/admin/crawls?venue=…`. Crawl detail lives on the Crawls page; we only surface the latest signal here.
  - **Danger zone** — *Pause* + *Delete…* (delete opens the double-confirmation dialog — see artboard 06).
- Sticky **save bar** at the bottom of the viewport when the form is dirty. Inverse-color pill with *Discard* / *Save changes*.

---

## State reference artboards (for engineering)

These are not new design surfaces — they're a key for implementing the screens above unambiguously.

### 03 · Field states
Every text input has 8 states: **default**, **hover**, **focused** (signal border + 3px ring + blinking caret), **filled**, **success**, **error**, **disabled** (66% opacity, surface-1 bg), **read-only**.

Validation patterns:
- **Name** — required, 2–80 chars, trimmed on save.
- **Slug** — required, `/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/`, 2–60 chars, unique.
- **Source URL** — required, must parse as `https?://`. robots.txt check is non-blocking — *never* prevents save; it's an advisory chip only.
- **City** — required, 2–60 chars, free text.

### 04 · Submission states
1. **Validating** — async checks in flight (robots, slug uniqueness). Inputs editable; only the affected field shows a checking chip.
2. **Submitting** — POST in flight. All fields disabled, Cancel disabled (no mid-write abort), primary button shows spinner + "Saving…".
3. **Failure** — server returned 4xx/5xx. Banner at top names the failure; affected field gets error state; buttons re-enable.
4. **Success** — 201 Created. Button flips to ✓ Saved for ~400ms, modal dismisses, success toast appears on the Venues table.

Keyboard:
- `Esc` cancels (discards unsaved input).
- `↵` advances to next required field; from last field, focuses *Save venue*.
- `⌘ ↵` triggers the **primary** action (*Save & crawl now*). Hint sits inside the primary button.

### 05 · Button states
Six states per button: **default**, **hover**, **focus** (3px signal-tinted ring, use `:focus-visible`), **pressed**, **loading** (icon→spinner, pointer-events disabled), **disabled**.

Variants documented: Trigger crawl (primary), View public page (outline), Save changes (inverse, save-bar), Discard (ghost), Pause (outline-sm), Unverify (ghost-sm), Delete… (danger-sm), Confirm delete (danger).

Transitions: 120ms on background, border, box-shadow. Optional ~400ms success-checkmark flash on save actions.

### 06 · Delete venue — double confirmation
- Lists exactly what will change (1 venue deleted, 247 events have `venue_id` nulled but remain published, crawls stop, public URL 404s).
- **Type the venue name verbatim** to arm the delete button. Case-sensitive, whitespace-trimmed, compares against display name (not slug).
- Three stages shown: empty (disabled) → mismatch (error helper, still disabled) → exact match (success state, primary armed).
- `Esc` and scrim click cancel safely — no submit on backdrop.
- On submit: `DELETE /admin/venues/:id` → loading state → success toast on Venues page ("Venue deleted. 247 events detached."). Action recorded to audit log with pre-delete row snapshot.

---

## Theming

Three themes — **Electric** (default, dark), **Jade** (dark), **Light**. Toggle from the Tweaks panel; everything reskins from the consumer `theme-context.jsx` token set.

Admin primitives expect a few extra tokens (`--ink`, `--paper`, `--shadow-sm/md/lg`) that the consumer themes don't define. A small CSS shim in the page head aliases them to consumer tokens (`--ink` → `--fg`, `--paper` → `--bg`, shadows hardcoded per mode). The shim is the only piece of theme glue — both upstream theme files are unchanged.

---

## Tweaks (in-design)

- **Brand theme** — Electric / Jade / Light.
- **Edit screen layout** — Single column / Two columns / Form + meta column (**chosen**).

---

## Accessibility notes

- All button focus rings: 3px, signal-tinted, `:focus-visible` only.
- Field focus ring contrast verified against all 3 theme backgrounds.
- Delete dialog reserves the destructive action behind type-to-confirm — no single-click delete path exists.
- Disabled fields drop to 66% opacity but keep readable foreground tokens.

### Color contrast sweep (May 9)

Swept every place a foreground token meets a background token across all three themes. Two fixes shipped this pass:

| Element | Before | After |
|---|---|---|
| Toast "View" button | `var(--signal)` link on `var(--ink)` bar — ~2.3:1 in Electric (light-on-light) | Paper-on-ink pill (inverts to page surface; ≥7:1 all themes) |
| Toast success swatch · check icon | `var(--ink)` glyph on `var(--success)` swatch — light-on-light-green in Electric/Jade | `var(--fg-on-accent)` glyph (flips per theme mode); strokeWidth 3 for crispness |

Verified OK (no change needed):
- **Primary buttons** — `var(--fg-on-accent)` on `var(--signal)` / `var(--success)` / `var(--danger)` passes 4.5:1 in all themes (the `fg-on-accent` token is defined per-theme specifically for this).
- **Sparkline + status dots** — graphical, no WCAG text requirement; still ≥3:1 (non-text contrast) against `--bg-elevated`.
- **Helper text** in error/success states — `var(--danger)` / `var(--success)` on `var(--bg-elevated)` passes 4.5:1 in all themes.
- **Mono eyebrow labels** — `var(--fg-subtle)` is borderline (~4.3–4.7:1) but used only on bold uppercase 10–11px captions, where the heavier weight + tracking buys back contrast. Kept as designed.
- **Sticky save bar** — `var(--paper)` on `var(--ink)` is the maximal-contrast pair by construction.
- **Source URL link** in venue header — `var(--signal)` on `var(--bg)` passes 4.5:1 in Electric (cyan on near-black), Jade (jade on dark teal), and Light (teal on near-white).
- **Disabled field text** — 66% opacity on `var(--fg-subtle)` on `var(--surface-1)` falls below 4.5:1 by design; disabled controls are explicitly exempt from WCAG 1.4.3.

---

## Open questions / out of scope

- **Bulk import** of venues (CSV) — not in this pass.
- **Venue merge** when a duplicate is detected — flagged for a future pass; today the modal surfaces a 409 error banner with the conflicting slug.
- **Verification flow** itself (how a venue *becomes* verified) — assumes the existing Admin process; this screen only surfaces and reverses the state.
