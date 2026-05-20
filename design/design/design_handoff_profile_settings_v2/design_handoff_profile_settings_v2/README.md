# Profile & Settings — Claude Code handoff · v2

**Phase 8.x · Concert Crawl · 2026-05** · `/settings` route

> The files in this bundle are **design references** — HTML/JSX prototypes that show intended look and behavior. The task is to **recreate these designs in your target codebase** (the live Concert Crawl React app + Clerk + Stripe stack), using its existing patterns, primitives, and tokens. The HTML is not meant to be copied wholesale.

**Fidelity:** **Hi-fi.** Final colors, typography, spacing, copy, error states, and theme behavior are all production-intent. Reproduce pixel-for-pixel against the live design tokens.

Open `Profile & Settings.html` in the canvas viewer to see every artboard. The bottom-right Tweaks panel cycles theme, handle state, plan, submission count, and **cred level**.

## What's new in v2

- **Cred score system.** New `<CredChip>` primitive surfaces a fan's lifetime verified-submission count in the profile hero (mobile + desktop). Three-state design (`0` / `247` / `2,480`) verified across all themes. Inline `+1 cred` micro-label on every confirmed row in `<MySubmissionsList>`. Honest tooltip copy: _"Cred is what you earn for every verified price. We're working on what you can spend it on."_
- New canvas section **8 · Cred score** demonstrates zero / typical / power-user states.
- New tweak: **Cred** (zero / normal / power) in the live artboard panel.

---

## What's in scope · what's out

| In                                                              | Out                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Profile (handle, avatar, avatar color, city)                    | Notification prefs (no notification system yet)                                    |
| **Cred score (lifetime verified-submission count)**             | **Tiers / badges / leaderboards on cred — number only for beta**                   |
| My submissions (history + status pills + `+1 cred` micro-label) | Public profile pages (no follow graph yet)                                         |
| Subscription card — Founder / Paid / Trial / Past-due           | Saved / Watching list (entry-point only — promote when Phase 9 ships)              |
| Theme picker (Electric / Jade / Light, live previews)           | Photo upload — handle-letter avatar is final, no upload promised                   |
| Account → Email / Password (link-out to Clerk hosted UI)        | Anything that depends on a notification stream (unread dot)                        |
| Sign out + Delete account                                       | Cred rewards / spend (intentionally unspecified — copy says "we're working on it") |

---

## Architectural decisions

- **Identity model — anonymous-by-default.** New users land as `anonymous fan`. Picking a handle is opt-in and applies retroactively to every prior submission. Clearing the handle reverts to anonymous. This matches Submit-a-Price's existing attribution toggle. Edit profile route handles both first-time-pick and later edit, gated by whether `user.handle` is null.
- **Cred model — simple lifetime counter.**
  - **Earning rule:** `+1` per submission whose status reaches `confirmed`. No weighting (no first-to-submit bonus, no upheld-dispute bonus) for beta.
  - **No decay.** Lifetime cumulative. We never show a delta arrow.
  - **No penalty.** A `disputed → rejected` submission _fails to award_ cred but does not subtract. There is no "negative cred event" treatment.
  - **Anonymous fans accrue silently.** Cred follows the user record (Clerk user id), not the handle. When an anonymous fan picks a handle, prior cred surfaces immediately alongside their retroactively-attributed submissions.
  - **Format:** raw integer (`247`), comma-formatted past 1,000 (`2,480`). No tier glyph yet — leave room for one in `<CredChip>` for when rewards land.
  - **Surfaces (beta):** Profile hero (mobile + desktop), inline `+1 cred` micro-label on confirmed rows in `<MySubmissionsList>`. **Not yet:** beside the handle on submission rows for _other_ fans, public profile page, leaderboard.
  - **Zero state:** `<CredChip>` renders the `0` with reduced opacity and a one-line nudge ("Submit a price to start earning.") next to it.
- **Plan model — Founder · Free for Life.** Beta users keep the product free forever (`plan: 'founder'`). The card is celebratory: accent border, radial wash, italic foot copy. Trial / paid / past-due variants are wired for post-beta — `<PlanCard state="trial" />` etc.
- **Page shape — dedicated route.** Mobile is hub-and-detail; tapping a row pushes to a detail page (Edit profile, Delete account confirm). Desktop is sidebar-and-panel — left rail nav, right pane content. A single-scroll variant ships as `<SettingsScrollVariant>` for future A/B.
- **Destructive actions.** Sign out is snarky-but-clear: _"Burn your tokens. We'll remember you."_ Delete account is plain-and-clear with a `DELETE`-typed gate — irreversibility wins over cleverness. The delete sheet keeps a "what survives" copy block: other fans' confirmations belong to them, not the deleted user.
- **Theme picker — top-level row** with live mini-previews using real tokens. Three swatches today (Electric / Jade / Light); the row wraps to make room for future themes without redesign.
- **Avatar — letter on tinted disc.** No photo upload, ever. First letter of handle on a circle tinted by a user-chosen color (`signal / accent / success / warning`). Color stored as a token _key_, not a hex — survives theme switches as "the same color in this theme's palette." Anonymous fans get a dashed-border `?` disc.

---

## Screens / artboards

The canvas has nine sections; each maps to a developer-facing surface:

### 1. State matrix · mobile (393×852)

Four states, all `<SettingsRoute>`:

- Anonymous · 0 submissions
- Anonymous · 3 submissions
- @hugh · 3 submissions
- @hugh · 8 submissions (overflow → "See all 8 →" link)

### 2. Plan states (393×852)

Four `<PlanCard state="…" />` variants in the same hub: `founder` (default for beta), `paid`, `trial` (with days remaining), `past-due` (warning tone, "Update billing" CTA).

### 3. Edit profile + handle errors (393×852)

- `<EditProfileRoute>` — handle + city + avatar color picker. Header is "← Cancel · Edit profile · Save". Save disables when there's a validation error.
- Four error artboards: `taken`, `reserved word`, `invalid characters`, `too short`. The component validates client-side; reserved/taken would also be enforced by the API.
- "Going anonymous" callout appears only when editing an existing handle. Clearing it triggers retroactive reattribution.

### 4. Delete account (393×852)

`<DeleteAccountConfirm>` bottom sheet. Two states:

- Empty input → primary button reads "Type DELETE to enable", disabled.
- Typed `DELETE` → button arms to red "Delete my account permanently".

### 5. All three themes (393×852 × 3)

Same hub × Electric / Jade / Light, side-by-side, to verify theme tokens. **Verifies `<CredChip>` retints correctly across all three.**

### 6. Desktop · sidebar + panel (1280×900 × 6)

One artboard per nav section: Profile, Plan, Submissions, Appearance, Account, Danger zone. Sidebar is left rail (240px); panel is the rest. Profile panel hero hosts the desktop `<CredChip>`.

### 7. Edit profile (393×852)

Full-page edit route with avatar color swatch row + retroactive-anonymous callout.

### 8. Cred score (393×852 × 3) — **NEW in v2**

Three artboards demonstrating the cred system:

- `0 · brand-new fan` — zero state with nudge copy ("Submit a price to start earning.")
- `247 · typical` — three-digit number, default surface
- `2,480 · power user` — four-digit number, comma-formatted, room for future tier glyph

### 9. Entry points

- Top-bar variant — anonymous (mobile, 393×100)
- Top-bar variant — @hugh (mobile, 393×100)
- Bottom-nav "Me" tab — replaces nothing, becomes the 5th slot (393×90)
- Desktop — top-right avatar in the page header (1280×100)

---

## Components to build (matches `profile-settings-screens.jsx` exports)

| Component                              | Purpose                                               | Notes                                                                                         |
| -------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `<SettingsRoute>`                      | Mobile hub                                            | Composes hero / plan / appearance / submissions / account / danger                            |
| `<SettingsRouteDesktop>`               | Desktop sidebar+panel                                 | Same data, different shell                                                                    |
| `<SettingsScrollVariant>`              | Single-scroll mobile alt                              | Registered for future A/B                                                                     |
| `<EditProfileRoute>`                   | Edit handle / city / avatar color                     | Validation + error states + "going anonymous" callout                                         |
| `<DeleteAccountConfirm>`               | Bottom-sheet modal                                    | DELETE-typed gate                                                                             |
| `<ProfileHero>`                        | Avatar + handle + role chip + city + **`<CredChip>`** | Tap to edit                                                                                   |
| **`<CredChip cred size showTooltip>`** | **Lifetime cred surface**                             | \*\*`size="sm"                                                                                | "md"`. `cred=0` renders with reduced opacity + nudge.\*\* |
| `<PlanCard state>`                     | Subscription card                                     | `founder` / `paid` / `trial` / `past-due`                                                     |
| `<ThemePickerInline>`                  | Three-swatch row with live mini-previews              | Wraps for future themes                                                                       |
| `<MySubmissionsList>`                  | History list w/ status pills                          | Reuses Submit-a-Price status taxonomy. Confirmed rows render an inline `+1 cred` micro-label. |
| `<SubmissionItem>`                     | Single row                                            | Tap → event detail w/ user's submission highlighted                                           |
| `<StatusPill>`                         | Status chip                                           | `confirmed` / `pending` / `disputed`                                                          |
| `<DangerZone>`                         | Sign-out + delete pair                                | Sign-out: snarky; delete: plain                                                               |
| `<RoleBadge>` / `<RoleCard>`           | Future role surfacing                                 | `fan` is default; `crew` / `artist` / `staff` are stubbed                                     |
| `<Avatar>` (= `<MonogramPoster>`)      | First-letter-on-tinted-disc                           | `colorKey` prop or `user.avatarColor` field                                                   |
| `<ProfileEntryAvatar>`                 | 36px button to drop into top-bar / nav                | Wraps `<Avatar>`                                                                              |

---

## Interactions & behavior

### Cred

- `<CredChip>` is read-only — no click handler in v2. Hover (desktop) / long-press (mobile) shows the tooltip _"Cred is what you earn for every verified price. We're working on what you can spend it on."_
- `+1 cred` micro-label on a confirmed row uses the `--accent` token in JetBrains Mono 700 / 10px / 0.12em letter-spacing / uppercase.
- Cred is recalculated server-side on every submission status transition; the client should treat it as an authoritative number returned with the user record (do not derive on the client).
- When a submission flips `pending → confirmed`, the API should atomically update the user's `cred` field. Surface the new value on the next user-record refresh; no need for an animated counter increment in v2.

### Edit profile

- Real-time client-side validation: regex `^[a-z0-9_]+$`, length ≥ 3, not in reserved word list.
- Server-side check for `taken` happens on save (debounce 300ms while typing for live availability hint is a nice-to-have, not required).
- Save button disabled while error is present or while in `saving` phase.
- "Cancel" is a hard cancel — discards changes, no confirm.
- Clearing the handle (going anonymous) doesn't show an error; the hint copy switches to explain retroactive reattribution.
- Avatar color picker: 4 swatches, selected one shows a 3px tinted ring. Selection persists immediately (optimistic) — no separate "save color" action.

### Delete account

- Input is case-sensitive — must be uppercase `DELETE`.
- Sheet is dismissible by tapping outside or the close affordance.
- On confirm: post to delete endpoint, sign out, redirect to landing.
- Other fans' confirmations of this user's submissions are preserved (they belong to them) — verify against data model before ship.

### Theme switching

- Tapping a swatch in `<ThemePickerInline>` updates the active theme immediately.
- Persist to user record (`user.theme = 'jade'`) so it survives reload across devices.
- The avatar color, plan card, **`<CredChip>`**, and every theme-token-using surface retint on switch.

### Submissions list

- Default cap: `max={3}` on mobile hub; full list at `/settings/submissions` (route to add — not in this design pass).
- Tapping a row pushes to event detail with the user's price highlighted.
- Confirmed rows show inline `+1 cred` — this is the implicit ledger; no separate cred-history page in v2.

---

## State management

Required user record fields:

```ts
type User = {
  handle: string | null // null = anonymous
  email: string // from Clerk
  joined: string // "Apr 2026" — formatted server-side
  city: string | null // optional, never shown publicly
  plan: 'founder' | 'paid' | 'trial' | 'past-due'
  role: 'fan' | 'crew' | 'artist' | 'staff'
  avatarColor: 'signal' | 'accent' | 'success' | 'warning' | null
  theme: 'electric' | 'jade' | 'light'
  cred: number // lifetime cumulative confirmed-submission count; server-authoritative
}
```

Submissions:

```ts
type Submission = {
  id: string
  eventId: string
  artist: string
  venue: string
  date: string // ISO
  amount: number // cents
  status: 'confirmed' | 'pending' | 'disputed'
}
```

Form state inside `<EditProfileRoute>` is local (handle / city / avatarColor) — no global store needed.

---

## Design tokens

All four avatar colors and the page chrome rely on theme-defined tokens. **Each of the three current themes (Electric / Jade / Light) defines all of these.** A future theme dropping any of them would break the avatar swatch row — defend by either filtering the swatches against tokens the active theme exposes, or treating these as guaranteed by design system contract.

| Token                                | Role                                                                                      |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `--bg`, `--surface-1`, `--surface-2` | Page chrome layers                                                                        |
| `--fg`, `--fg-muted`, `--fg-subtle`  | Text scale                                                                                |
| `--border`, `--border-strong`        | Hairlines / dashed avatar fallback                                                        |
| `--signal`                           | Primary action / "save" / blue avatar                                                     |
| `--accent`                           | Plan-card highlight / orange avatar / **`+1 cred` micro-label** / **`<CredChip>` border** |
| `--success`                          | Confirmed status / green avatar                                                           |
| `--warning`                          | Past-due plan / disputed status / yellow avatar                                           |
| `--danger`                           | Delete confirmation, armed state                                                          |

Typography:

- **Inter** — UI sans; weights 400/500/700/800/900
- **JetBrains Mono** — labels, status pills, timestamps, `+1 cred` micro-label, `CRED` label inside `<CredChip>`; weights 700

Border radius:

- 8px — small chips, inputs, `<CredChip>`
- 12px — cards, sheet handles
- 16px — modals
- 50% — avatars

---

## Assets

No bitmap assets. All UI is theme-token-driven; the avatar is a CSS-rendered letter on a tinted disc. The `CCWordmark` and `CCClusterMark` referenced for the desktop header are in `landing-screens.jsx` from the earlier landing pass — promote them to a shared `BrandMarks` module in your codebase.

---

## Files

| File                                    | Role                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Profile & Settings.html`               | Canvas — all artboards + tweaks panel                                                          |
| `profile-settings-screens.jsx`          | Components, sample users, sample submissions, **`<CredChip>`**                                 |
| `theme-context.jsx`                     | Consumer theme tokens (Electric / Jade / Light) — copied from the design system, do not modify |
| `landing-screens.jsx`                   | Source of `<CCWordmark>` / `<CCClusterMark>` for the desktop header                            |
| `ios-frame.jsx`                         | iOS status bar reference for mobile artboards                                                  |
| `design-canvas.jsx`, `tweaks-panel.jsx` | Canvas + panel scaffolding (presentation only — do not port)                                   |

---

## Engineering notes

- **Email / Password rows are link-outs to Clerk's hosted UserProfile.** The canvas shows the read-only treatment with a "Clerk →" external-link affordance. Do not build inline edit for these.
- **Watch list row is a stub** (`coming with notifications`). Promote when Phase 9's notification system is wired.
- **`My submissions` reuses Submit-a-Price's status taxonomy** (`confirmed / pending / disputed`). Don't introduce a new vocabulary.
- **`Delete account` preserves other fans' confirmations** — they belong to them, not the deleted user. Verify against the data model before ship.
- **Theme persistence** — store the chosen theme on the user record server-side so it follows them across devices, not just localStorage.
- **No notification dot on the avatar entry point.** Removed deliberately — there's no real notification stream yet. Re-add only when there's something concrete to notify about (price-now-final, tonight's show with no price, "we couldn't verify X").
- **Cred is server-authoritative.** Do not derive it on the client by counting confirmed submissions in the response — return it as a `cred: number` field on the user record, recalculated atomically on status transitions. This keeps the source of truth single and lets you change earning rules later without a client-side refactor.

---

## Open questions for the dev pass

1. **Live handle availability check** — debounce while typing? Or only on save? (Design supports either; prefer debounce 300ms.)
2. **Going anonymous → retroactive reattribution** — atomic on save, or background job? Affects the loading state the user sees.
3. **Stripe checkout entry** — Plan card has space for a "Manage subscription →" link in `paid` / `past-due` states. Confirm that links to a Stripe-hosted portal vs. an in-app surface.
4. **Saved / Watching surface** — Phase 7's `<WatchAffordance>` needs a real list before it can ship as a settings sub-route. Out of scope here; flagging for Phase 9 planning.
5. **Cred earning rule extensibility** — beta is `+1 confirmed`. When we add weighting (first-to-submit bonus, upheld-dispute bonus), where does the rule live? Suggest: server-side rule object versioned per-event so historical events keep their original earning logic.
6. **Cred on other fans' rows** — currently shown only on the user's own submission history. Confirm whether a confirmed-by-someone-else row on an event detail page should display _that_ fan's cred next to their handle, or just the count of confirms. (Design: out of scope for v2, surface in event-detail v2.)
