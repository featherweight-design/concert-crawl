# Profile & Settings — Claude Code handoff

**Phase 8.x · Concert Crawl · 2026-05** · `/settings` route

> The files in this bundle are **design references** — HTML/JSX prototypes that show intended look and behavior. The task is to **recreate these designs in your target codebase** (the live Concert Crawl React app + Clerk + Stripe stack), using its existing patterns, primitives, and tokens. The HTML is not meant to be copied wholesale.

**Fidelity:** **Hi-fi.** Final colors, typography, spacing, copy, error states, and theme behavior are all production-intent. Reproduce pixel-for-pixel against the live design tokens.

Open `Profile & Settings.html` in the canvas viewer to see every artboard. The bottom-right Tweaks panel cycles theme, handle state, plan, and submission count.

---

## What's in scope · what's out

| In                                                       | Out                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| Profile (handle, avatar, avatar color, city)             | Notification prefs (no notification system yet)                       |
| My submissions (history + status pills)                  | Public profile pages (no follow graph yet)                            |
| Subscription card — Founder / Paid / Trial / Past-due    | Saved / Watching list (entry-point only — promote when Phase 9 ships) |
| Theme picker (Electric / Jade / Light, live previews)    | Photo upload — handle-letter avatar is final, no upload promised      |
| Account → Email / Password (link-out to Clerk hosted UI) | Anything that depends on a notification stream (unread dot)           |
| Sign out + Delete account                                |                                                                       |

---

## Architectural decisions

- **Identity model — anonymous-by-default.** New users land as `anonymous fan`. Picking a handle is opt-in and applies retroactively to every prior submission. Clearing the handle reverts to anonymous. This matches Submit-a-Price's existing attribution toggle. Edit profile route handles both first-time-pick and later edit, gated by whether `user.handle` is null.
- **Plan model — Founder · Free for Life.** Beta users keep the product free forever (`plan: 'founder'`). The card is celebratory: accent border, radial wash, italic foot copy. Trial / paid / past-due variants are wired for post-beta — `<PlanCard state="trial" />` etc.
- **Page shape — dedicated route.** Mobile is hub-and-detail; tapping a row pushes to a detail page (Edit profile, Delete account confirm). Desktop is sidebar-and-panel — left rail nav, right pane content. A single-scroll variant ships as `<SettingsScrollVariant>` for future A/B.
- **Destructive actions.** Sign out is snarky-but-clear: _"Burn your tokens. We'll remember you."_ Delete account is plain-and-clear with a `DELETE`-typed gate — irreversibility wins over cleverness. The delete sheet keeps a "what survives" copy block: other fans' confirmations belong to them, not the deleted user.
- **Theme picker — top-level row** with live mini-previews using real tokens. Three swatches today (Electric / Jade / Light); the row wraps to make room for future themes without redesign.
- **Avatar — letter on tinted disc.** No photo upload, ever. First letter of handle on a circle tinted by a user-chosen color (`signal / accent / success / warning`). Color stored as a token _key_, not a hex — survives theme switches as "the same color in this theme's palette." Anonymous fans get a dashed-border `?` disc.

---

## Screens / artboards

The canvas has eight sections; each maps to a developer-facing surface:

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

Same hub × Electric / Jade / Light, side-by-side, to verify theme tokens.

### 6. Desktop · sidebar + panel (1280×900 × 6)

One artboard per nav section: Profile, Plan, Submissions, Appearance, Account, Danger zone. Sidebar is left rail (240px); panel is the rest.

### 7. Entry points

- Top-bar variant — anonymous (mobile, 393×100)
- Top-bar variant — @hugh (mobile, 393×100)
- Bottom-nav "Me" tab — replaces nothing, becomes the 5th slot (393×90)
- Desktop — top-right avatar in the page header (1280×100)

### 8. Anonymous explanation (callout, 393×auto)

A standalone copy block clarifying what "anonymous fan" means — surfaces in onboarding and on first hub view.

---

## Components to build (matches `profile-settings-screens.jsx` exports)

| Component                         | Purpose                                  | Notes                                                              |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| `<SettingsRoute>`                 | Mobile hub                               | Composes hero / plan / appearance / submissions / account / danger |
| `<SettingsRouteDesktop>`          | Desktop sidebar+panel                    | Same data, different shell                                         |
| `<SettingsScrollVariant>`         | Single-scroll mobile alt                 | Registered for future A/B                                          |
| `<EditProfileRoute>`              | Edit handle / city / avatar color        | Validation + error states + "going anonymous" callout              |
| `<DeleteAccountConfirm>`          | Bottom-sheet modal                       | DELETE-typed gate                                                  |
| `<ProfileHero>`                   | Avatar + handle + role chip + city       | Tap to edit                                                        |
| `<PlanCard state>`                | Subscription card                        | `founder` / `paid` / `trial` / `past-due`                          |
| `<ThemePickerInline>`             | Three-swatch row with live mini-previews | Wraps for future themes                                            |
| `<MySubmissionsList>`             | History list w/ status pills             | Reuses Submit-a-Price status taxonomy                              |
| `<SubmissionItem>`                | Single row                               | Tap → event detail w/ user's submission highlighted                |
| `<StatusPill>`                    | Status chip                              | `confirmed` / `pending` / `disputed`                               |
| `<DangerZone>`                    | Sign-out + delete pair                   | Sign-out: snarky; delete: plain                                    |
| `<RoleBadge>` / `<RoleCard>`      | Future role surfacing                    | `fan` is default; `crew` / `artist` / `staff` are stubbed          |
| `<Avatar>` (= `<MonogramPoster>`) | First-letter-on-tinted-disc              | `colorKey` prop or `user.avatarColor` field                        |
| `<ProfileEntryAvatar>`            | 36px button to drop into top-bar / nav   | Wraps `<Avatar>`                                                   |

---

## Interactions & behavior

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
- The avatar color, plan card, and every theme-token-using surface retint on switch.

### Submissions list

- Default cap: `max={3}` on mobile hub; full list at `/settings/submissions` (route to add — not in this design pass).
- Tapping a row pushes to event detail with the user's price highlighted.

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

| Token                                | Role                                            |
| ------------------------------------ | ----------------------------------------------- |
| `--bg`, `--surface-1`, `--surface-2` | Page chrome layers                              |
| `--fg`, `--fg-muted`, `--fg-subtle`  | Text scale                                      |
| `--border`, `--border-strong`        | Hairlines / dashed avatar fallback              |
| `--signal`                           | Primary action / "save" / blue avatar           |
| `--accent`                           | Plan-card highlight / orange avatar             |
| `--success`                          | Confirmed status / green avatar                 |
| `--warning`                          | Past-due plan / disputed status / yellow avatar |
| `--danger`                           | Delete confirmation, armed state                |

Typography:

- **Inter** — UI sans; weights 400/500/700/800/900
- **JetBrains Mono** — labels, status pills, timestamps; weights 700

Border radius:

- 8px — small chips, inputs
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
| `profile-settings-screens.jsx`          | Components, sample users, sample submissions                                                   |
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

---

## Open questions for the dev pass

1. **Live handle availability check** — debounce while typing? Or only on save? (Design supports either; prefer debounce 300ms.)
2. **Going anonymous → retroactive reattribution** — atomic on save, or background job? Affects the loading state the user sees.
3. **Stripe checkout entry** — Plan card has space for a "Manage subscription →" link in `paid` / `past-due` states. Confirm that links to a Stripe-hosted portal vs. an in-app surface.
4. **Saved / Watching surface** — Phase 7's `<WatchAffordance>` needs a real list before it can ship as a settings sub-route. Out of scope here; flagging for Phase 9 planning.
