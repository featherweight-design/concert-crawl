# Design Property Table — Admin UI v2

> Source files: `design/design/design_handoff_admin_ui_v2/`
> Breakpoint: mobile ≤720px / desktop >720px
> Fonts: ADMIN_FONT = Inter, ADMIN_MONO = JetBrains Mono

---

## Component: AppSwitcher

### Container

| Property     | Mobile (≤720)           | Desktop (>720)          |
| ------------ | ----------------------- | ----------------------- |
| padding      | 2px                     | 2px                     |
| borderRadius | 8px                     | 8px                     |
| background   | var(--surface-1)        | var(--surface-1)        |
| border       | 1px solid var(--border) | 1px solid var(--border) |
| display      | inline-flex             | inline-flex             |

### Tab button (inactive)

| Property     | Mobile (≤720)   | Desktop (>720)  |
| ------------ | --------------- | --------------- |
| height       | 26px            | 30px            |
| padding      | 0 8px           | 0 10px          |
| gap          | 4px             | 5px             |
| fontSize     | 10px            | 11px            |
| fontWeight   | 700             | 700             |
| fontFamily   | ADMIN_FONT      | ADMIN_FONT      |
| color        | var(--fg-muted) | var(--fg-muted) |
| background   | transparent     | transparent     |
| borderRadius | 6px             | 6px             |

### Tab button (active)

| Property   | Mobile (≤720)                                       | Desktop (>720)                                      |
| ---------- | --------------------------------------------------- | --------------------------------------------------- |
| background | var(--bg-elevated)                                  | var(--bg-elevated)                                  |
| boxShadow  | 0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border) | 0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px var(--border) |
| color      | var(--fg)                                           | var(--fg)                                           |

---

## Component: AdminSidebar v2 (SidebarV2)

### Sidebar shell

| Property    | Collapsed               | Expanded                |
| ----------- | ----------------------- | ----------------------- |
| background  | var(--surface-1)        | var(--surface-1)        |
| width       | 64px                    | 240px                   |
| borderRight | 1px solid var(--border) | 1px solid var(--border) |

### NavItemV2 (expanded)

| Property     | Inactive          | Active            |
| ------------ | ----------------- | ----------------- |
| padding      | 8px 10px 8px 14px | 8px 10px 8px 14px |
| display      | flex              | flex              |
| alignItems   | center            | center            |
| gap          | 10px              | 10px              |
| borderRadius | 8px               | 8px               |
| color        | var(--fg-muted)   | var(--fg)         |
| fontFamily   | ADMIN_FONT        | ADMIN_FONT        |
| fontSize     | 13px              | 13px              |
| fontWeight   | 500               | 700               |
| background   | transparent       | var(--surface-2)  |
| position     | relative          | relative          |

### NavItemV2 active indicator (expanded)

| Property     | Value         |
| ------------ | ------------- |
| position     | absolute      |
| left         | 0             |
| top          | 8px           |
| bottom       | 8px           |
| width        | 2px           |
| background   | var(--signal) |
| borderRadius | 2px           |

### NavItemV2 (collapsed)

| Property       | Value    |
| -------------- | -------- |
| padding        | 10px 0   |
| display        | flex     |
| justifyContent | center   |
| alignItems     | center   |
| position       | relative |

### NavBadge (expanded) — warning kind

| Property     | Value          |
| ------------ | -------------- |
| background   | var(--warning) |
| color        | var(--bg)      |
| fontFamily   | ADMIN_MONO     |
| fontSize     | 9px            |
| fontWeight   | 700            |
| padding      | 2px 5px        |
| borderRadius | 8px            |
| minWidth     | 16px           |
| height       | 16px           |

### NavBadge (expanded) — other kinds

| Property | Value               |
| -------- | ------------------- |
| color    | var(--fg-on-accent) |

### NavBadge (collapsed) — dot mode

| Property     | Value                      |
| ------------ | -------------------------- |
| position     | absolute                   |
| top          | 6px                        |
| right        | 12px                       |
| width        | 8px                        |
| height       | 8px                        |
| borderRadius | 4px                        |
| boxShadow    | 0 0 0 2px var(--surface-1) |

---

## Component: AdminTopbar v2

### Topbar shell (desktop)

| Property     | Value                   |
| ------------ | ----------------------- |
| height       | 56px                    |
| padding      | 0 24px                  |
| gap          | 16px                    |
| display      | flex                    |
| alignItems   | center                  |
| borderBottom | 1px solid var(--border) |
| background   | var(--bg-elevated)      |

### Topbar layout order

| Slot | Element                                     |
| ---- | ------------------------------------------- |
| 1    | AppSwitcher                                 |
| 2    | Separator (w=1px, h=18px, bg=var(--border)) |
| 3    | Breadcrumb (flex-1)                         |
| 4    | Search (optional)                           |

### Desktop main content area

| Property  | Value     |
| --------- | --------- |
| padding   | 24px 28px |
| flex      | 1         |
| overflowY | auto      |

---

## Component: MobileShell

### Mobile topbar

| Property     | Value                   |
| ------------ | ----------------------- |
| height       | 52px                    |
| padding      | 0 14px                  |
| display      | flex                    |
| alignItems   | center                  |
| background   | var(--bg-elevated)      |
| borderBottom | 1px solid var(--border) |

### Bottom tab bar

| Property            | Value                   |
| ------------------- | ----------------------- |
| position            | fixed (bottom)          |
| height              | 64px                    |
| padding             | 6px 6px 10px            |
| display             | grid                    |
| gridTemplateColumns | repeat(5, 1fr)          |
| background          | var(--bg-elevated)      |
| borderTop           | 1px solid var(--border) |

### Bottom tab (inactive)

| Property       | Value           |
| -------------- | --------------- |
| display        | flex            |
| flexDirection  | column          |
| alignItems     | center          |
| justifyContent | center          |
| gap            | 3px             |
| color          | var(--fg-muted) |
| fontFamily     | ADMIN_FONT      |
| fontSize       | 10px            |
| fontWeight     | 600             |

### Bottom tab (active)

| Property   | Value         |
| ---------- | ------------- |
| color      | var(--signal) |
| fontWeight | 700           |

### Bottom tab badge

| Property     | Value                        |
| ------------ | ---------------------------- |
| position     | absolute                     |
| top          | -4px                         |
| right        | -8px                         |
| minWidth     | 16px                         |
| height       | 16px                         |
| fontSize     | 9px                          |
| fontWeight   | 700                          |
| fontFamily   | ADMIN_MONO                   |
| borderRadius | 8px                          |
| boxShadow    | 0 0 0 2px var(--bg-elevated) |

### Drawer (hamburger open)

| Property   | Value                       |
| ---------- | --------------------------- |
| width      | 78%                         |
| maxWidth   | 320px                       |
| boxShadow  | 8px 0 32px rgba(0,0,0,0.25) |
| zIndex     | 11                          |
| background | var(--bg-elevated)          |

### Scrim (behind drawer)

| Property   | Value           |
| ---------- | --------------- |
| background | rgba(0,0,0,0.4) |
| zIndex     | 10              |
| position   | fixed           |
| inset      | 0               |

---

## Component: AttentionFeed (Dashboard)

### Greeting section (desktop)

| Property   | Value                                         |
| ---------- | --------------------------------------------- |
| CTAs       | NONE — Run All and Add Venue removed          |
| Right side | SSE LIVE badge + "last sweep HH:MM" mono text |

### Severity tint tokens (SEV_TINT)

| Severity | bg                                                   | border                                               |
| -------- | ---------------------------------------------------- | ---------------------------------------------------- |
| danger   | color-mix(in oklab, var(--danger) 14%, transparent)  | color-mix(in oklab, var(--danger) 32%, transparent)  |
| warning  | color-mix(in oklab, var(--warning) 16%, transparent) | color-mix(in oklab, var(--warning) 36%, transparent) |
| signal   | color-mix(in oklab, var(--signal) 12%, transparent)  | color-mix(in oklab, var(--signal) 28%, transparent)  |
| neutral  | var(--surface-1)                                     | var(--border)                                        |

### AttentionItem row

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | 32px 1fr auto           |
| gap                 | 12px                    |
| padding             | 14px 18px               |
| borderBottom        | 1px solid var(--border) |
| alignItems          | flex-start              |

### AttentionItem icon chip

| Property       | Value                          |
| -------------- | ------------------------------ |
| width          | 28px                           |
| height         | 28px                           |
| borderRadius   | 8px                            |
| background     | SEV_TINT bg (severity-matched) |
| color          | var(--{severity})              |
| display        | flex                           |
| alignItems     | center                         |
| justifyContent | center                         |

### AttentionItem title

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 13px       |
| fontWeight    | 600        |
| letterSpacing | -0.005em   |
| lineHeight    | 1.4        |
| color         | var(--fg)  |

### AttentionItem meta

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_FONT      |
| fontSize   | 12px            |
| color      | var(--fg-muted) |
| marginTop  | 3px             |
| lineHeight | 1.4             |

### AttentionItem action link

| Property       | Value         |
| -------------- | ------------- |
| fontFamily     | ADMIN_FONT    |
| fontSize       | 11px          |
| fontWeight     | 700           |
| color          | var(--signal) |
| textDecoration | none          |
| marginTop      | 6px           |

### DigestRow (success roll-up)

| Property   | Value                   |
| ---------- | ----------------------- |
| padding    | 12px 18px               |
| background | var(--surface-1)        |
| borderTop  | 1px solid var(--border) |
| display    | flex                    |
| alignItems | center                  |
| gap        | 12px                    |

### DigestRow icon

| Property       | Value                                                |
| -------------- | ---------------------------------------------------- |
| width          | 22px                                                 |
| height         | 22px                                                 |
| borderRadius   | 11px                                                 |
| background     | color-mix(in oklab, var(--success) 14%, transparent) |
| color          | var(--success)                                       |
| display        | flex                                                 |
| alignItems     | center                                               |
| justifyContent | center                                               |

### EngagementPlaceholder

| Property       | Value                             |
| -------------- | --------------------------------- |
| minHeight      | 140px                             |
| border         | 1px dashed var(--border-strong)   |
| borderRadius   | 10px                              |
| background     | repeating-linear-gradient pattern |
| display        | flex                              |
| alignItems     | center                            |
| justifyContent | center                            |

### Mobile stat cards (dashboard)

| Property            | Value                 |
| ------------------- | --------------------- |
| display             | grid                  |
| gridTemplateColumns | repeat(2, 1fr)        |
| gap                 | 10px                  |
| padding             | 12px 14px (each card) |
| borderRadius        | 12px (each card)      |

### Mobile stat value

| Property   | Value      |
| ---------- | ---------- |
| fontSize   | 22px       |
| fontFamily | ADMIN_MONO |
| fontWeight | 700        |

---

## Component: CrawlInspector (Tabs)

### InspectorTabs bar

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 0 22px                  |
| borderBottom | 1px solid var(--border) |
| gap          | 4px                     |
| display      | flex                    |
| background   | var(--bg-elevated)      |

### Tab button (inactive)

| Property   | Value           |
| ---------- | --------------- |
| padding    | 12px 14px       |
| fontFamily | ADMIN_FONT      |
| fontSize   | 13px            |
| fontWeight | 600             |
| color      | var(--fg-muted) |
| background | transparent     |
| border     | none            |
| cursor     | pointer         |

### Tab button (active)

| Property     | Value                   |
| ------------ | ----------------------- |
| fontWeight   | 700                     |
| color        | var(--fg)               |
| borderBottom | 2px solid var(--signal) |
| marginBottom | -1px                    |

### Diagnostics tab dot (enabled when run failed/blocked)

| Property     | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| width        | 6px                                                            |
| height       | 6px                                                            |
| borderRadius | 3px                                                            |
| boxShadow    | 0 0 0 2px color-mix(in oklab, var(--warning) 22%, transparent) |
| background   | var(--warning)                                                 |

### Inspector header section

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 16px 22px               |
| background   | var(--surface-1)        |
| borderBottom | 1px solid var(--border) |

### Inspector run h2

| Property      | Value      |
| ------------- | ---------- |
| fontSize      | 20px       |
| fontWeight    | 700        |
| letterSpacing | -0.02em    |
| fontFamily    | ADMIN_FONT |
| color         | var(--fg)  |

### WhatHappenedSection (failure)

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| background   | color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--danger) 30%, transparent) |
| borderRadius | 8px                                                           |
| padding      | 14px 16px                                                     |

### WhatHappened inner stats grid

| Property            | Value           |
| ------------------- | --------------- |
| display             | grid            |
| gridTemplateColumns | repeat(4, auto) |
| gap                 | 14px            |
| paddingLeft         | 26px            |

### WhyHappenedSection

| Property           | Value            |
| ------------------ | ---------------- |
| background         | var(--surface-1) |
| borderRadius       | 8px              |
| padding            | 14px 16px        |
| paddingLeft (body) | 24px             |

### WhyHappened badge

| Property | Value        |
| -------- | ------------ |
| text     | "rule-based" |
| kind     | neutral      |
| variant  | mono         |

### OptionsSection cards grid

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| display             | grid                                 |
| gridTemplateColumns | repeat(auto-fit, minmax(260px, 1fr)) |
| gap                 | 10px                                 |

### Option card (normal)

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 14px 14px 12px          |
| borderRadius | 10px                    |
| border       | 1px solid var(--border) |
| background   | var(--bg-elevated)      |

### Option card (staged / signal)

| Property   | Value                                                         |
| ---------- | ------------------------------------------------------------- |
| background | color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))     |
| border     | 1px solid color-mix(in oklab, var(--signal) 40%, transparent) |

### Staged card shelf (Apply / Discard)

| Property   | Value  |
| ---------- | ------ |
| display    | flex   |
| gap        | 8px    |
| alignItems | center |
| marginTop  | 10px   |

### Note below options

| Property     | Value                           |
| ------------ | ------------------------------- |
| background   | var(--surface-1)                |
| border       | 1px dashed var(--border-strong) |
| borderRadius | 8px                             |
| fontSize     | 11px                            |
| fontFamily   | ADMIN_FONT                      |
| padding      | 10px 12px                       |

### StrategyHistory row

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | 140px 1fr auto auto     |
| gap                 | 14px                    |
| padding             | 10px 14px               |
| borderBottom        | 1px solid var(--border) |

### StrategyHistory newest row tint

| Property   | Value                                              |
| ---------- | -------------------------------------------------- |
| background | color-mix(in oklab, var(--danger) 5%, transparent) |

---

## Component: StagedApplyConfirm (Modal)

### Modal container

| Property     | Value                        |
| ------------ | ---------------------------- |
| width        | 640px                        |
| maxWidth     | calc(100vw - 48px)           |
| borderRadius | 14px                         |
| boxShadow    | 0 24px 64px rgba(0,0,0,0.35) |
| background   | var(--bg-elevated)           |
| border       | 1px solid var(--border)      |

### Config diff grid

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | 160px 1fr               |
| padding             | 10px 14px               |
| gap                 | 12px                    |
| borderBottom        | 1px solid var(--border) |

### Diff value — before (old)

| Property     | Value                                                     |
| ------------ | --------------------------------------------------------- |
| color        | var(--danger)                                             |
| background   | color-mix(in oklab, var(--danger) 6%, var(--bg-elevated)) |
| padding      | 4px 8px                                                   |
| borderRadius | 4px                                                       |
| fontFamily   | ADMIN_MONO                                                |
| fontSize     | 12px                                                      |

### Diff value — after (new)

| Property     | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| color        | var(--success)                                             |
| background   | color-mix(in oklab, var(--success) 6%, var(--bg-elevated)) |
| padding      | 4px 8px                                                    |
| borderRadius | 4px                                                        |
| fontFamily   | ADMIN_MONO                                                 |
| fontSize     | 12px                                                       |

### Modal action shelf

| Property   | Value                   |
| ---------- | ----------------------- |
| background | var(--surface-1)        |
| borderTop  | 1px solid var(--border) |
| padding    | 14px 22px               |
| display    | flex                    |
| alignItems | center                  |
| gap        | 12px                    |

### "Trigger re-crawl now" checkbox in modal

| Property    | Value         |
| ----------- | ------------- |
| type        | checkbox      |
| accentColor | var(--signal) |
| fontFamily  | ADMIN_FONT    |
| fontSize    | 13px          |
| marginRight | auto          |

---

## Component: DiagnosticsPanel

### Panel shell

| Property      | Value     |
| ------------- | --------- |
| padding       | 20px 22px |
| gap           | 22px      |
| display       | flex      |
| flexDirection | column    |

### Vitals overview grid (4-col)

| Property            | Value          |
| ------------------- | -------------- |
| display             | grid           |
| gridTemplateColumns | repeat(4, 1fr) |
| gap                 | 12px           |

### Vital card

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 14px 18px               |
| background   | var(--bg-elevated)      |
| border       | 1px solid var(--border) |
| borderRadius | 8px                     |

---

## Component: VenueQuickView (accordion)

### Quick-view container

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 18px 22px               |
| background   | var(--surface-1)        |
| borderBottom | 1px solid var(--border) |

### Info grid (inside quick-view)

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| display             | grid                                 |
| gridTemplateColumns | repeat(auto-fit, minmax(180px, 1fr)) |
| gap                 | 18px                                 |
| marginBottom        | 14px                                 |

### Ticket URL

| Property   | Value         |
| ---------- | ------------- |
| fontFamily | ADMIN_MONO    |
| fontSize   | 11px          |
| color      | var(--signal) |
| display    | inline-flex   |
| gap        | 4px           |
| alignItems | center        |

### Consecutive failures value

| Property   | Value      |
| ---------- | ---------- |
| fontFamily | ADMIN_MONO |
| fontSize   | 18px       |
| fontWeight | 700        |

### Consecutive failures color logic

| Condition   | color          |
| ----------- | -------------- |
| ≥3 failures | var(--danger)  |
| >0 failures | var(--warning) |
| 0 failures  | var(--fg)      |

### "of N" suffix on failures count

| Property | Value           |
| -------- | --------------- |
| fontSize | 11px            |
| color    | var(--fg-muted) |

### Last error strip

| Property                | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| padding                 | 10px 14px                                                     |
| background (failures>0) | color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))     |
| border (failures>0)     | 1px solid color-mix(in oklab, var(--danger) 28%, transparent) |
| borderRadius            | 6px                                                           |
| marginBottom            | 14px                                                          |
| fontFamily              | ADMIN_MONO                                                    |
| fontSize                | 11px                                                          |

### Action shelf (quick-view)

| Property   | Value  |
| ---------- | ------ |
| display    | flex   |
| gap        | 8px    |
| flexWrap   | wrap   |
| alignItems | center |

### Venues table chevron

| Property           | Value           |
| ------------------ | --------------- |
| transform (closed) | rotate(0deg)    |
| transform (open)   | rotate(90deg)   |
| transition         | transform 0.15s |

### Expanded row cell

| Property | Value |
| -------- | ----- |
| colSpan  | 11    |
| padding  | 0     |

---

## Component: GenerateField (5 states)

### GenerateButton (idle state)

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| padding      | 6px 10px                                                      |
| borderRadius | 6px                                                           |
| background   | color-mix(in oklab, var(--accent) 8%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--accent) 34%, transparent) |
| fontFamily   | ADMIN_FONT                                                    |
| fontSize     | 12px                                                          |
| fontWeight   | 700                                                           |
| color        | var(--accent)                                                 |
| display      | inline-flex                                                   |
| alignItems   | center                                                        |
| gap          | 6px                                                           |

### GenerateButton cost label

| Property   | Value      |
| ---------- | ---------- |
| fontFamily | ADMIN_MONO |
| fontSize   | 10px       |
| opacity    | 0.7        |

### Loading state

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| background   | color-mix(in oklab, var(--signal) 6%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--signal) 28%, transparent) |
| borderRadius | 8px                                                           |
| padding      | 14px 16px                                                     |
| Spinner size | 14px                                                          |
| text         | "Generating…"                                                 |
| sub-text     | "~3–5s"                                                       |

### Review state

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| background   | color-mix(in oklab, var(--accent) 6%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--accent) 32%, transparent) |
| borderRadius | 8px                                                           |
| padding      | 14px 16px                                                     |

### Review state header row

| Property       | Value                   |
| -------------- | ----------------------- |
| MonoLabel text | "suggested"             |
| LLM badge kind | accent                  |
| LLM badge text | "llm"                   |
| cost + tokens  | ADMIN_MONO, fontSize=11 |

### Review state body (suggested text)

| Property   | Value      |
| ---------- | ---------- |
| fontSize   | 13px       |
| lineHeight | 1.55       |
| fontFamily | ADMIN_FONT |
| color      | var(--fg)  |

### Review state sources

| Property      | Value            |
| ------------- | ---------------- |
| fontFamily    | ADMIN_MONO       |
| fontSize      | 10px             |
| letterSpacing | 0.04em           |
| color         | var(--fg-subtle) |
| marginTop     | 8px              |

### Accepted state

| Property   | Value                                                          |
| ---------- | -------------------------------------------------------------- |
| border     | 1px solid color-mix(in oklab, var(--success) 38%, transparent) |
| background | color-mix(in oklab, var(--success) 5%, var(--bg-elevated))     |

### Accepted pill label

| Property | Value                  |
| -------- | ---------------------- |
| text     | "generated · accepted" |
| kind     | success                |
| dot      | true                   |

### Error state

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| background   | color-mix(in oklab, var(--danger) 8%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--danger) 32%, transparent) |
| borderRadius | 8px                                                           |
| padding      | 14px 16px                                                     |

---

## Component: VenueDetailPage

### Page layout

| Property      | Value  |
| ------------- | ------ |
| maxWidth      | 1080px |
| display       | flex   |
| flexDirection | column |
| gap           | 18px   |

### VenueHeaderSummary

| Property     | Value                   |
| ------------ | ----------------------- |
| display      | flex                    |
| alignItems   | center                  |
| gap          | 12px                    |
| flexWrap     | wrap                    |
| padding      | 12px 16px               |
| marginBottom | 18px                    |
| background   | var(--bg-elevated)      |
| border       | 1px solid var(--border) |
| borderRadius | 12px                    |

### IdentityArtTile

| Property     | Value                          |
| ------------ | ------------------------------ |
| width        | 96px                           |
| height       | 96px                           |
| borderRadius | 12px                           |
| flexShrink   | 0                              |
| border       | 1px solid var(--border-strong) |
| overflow     | hidden                         |

### Venue name (in header)

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 22px       |
| fontWeight    | 700        |
| letterSpacing | -0.02em    |
| color         | var(--fg)  |

### Venue meta (in header)

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_MONO      |
| fontSize   | 11px            |
| color      | var(--fg-muted) |
| gap        | 14px            |
| display    | flex            |
| marginTop  | 4px             |

### VDSection card

| Property     | Value                   |
| ------------ | ----------------------- |
| background   | var(--bg-elevated)      |
| border       | 1px solid var(--border) |
| borderRadius | 12px                    |

### VDSection card (danger/danger-zone)

| Property | Value                                                           |
| -------- | --------------------------------------------------------------- |
| border   | 1px solid color-mix(in oklab, var(--danger) 28%, var(--border)) |

### VDSection header

| Property       | Value                   |
| -------------- | ----------------------- |
| padding        | 16px 22px               |
| borderBottom   | 1px solid var(--border) |
| display        | flex                    |
| alignItems     | flex-end                |
| justifyContent | space-between           |
| gap            | 16px                    |

### VDSection eyebrow

| Property       | Value            |
| -------------- | ---------------- |
| component      | MonoLabel        |
| color (normal) | var(--fg-subtle) |
| color (danger) | var(--danger)    |

### VDSection title

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 17px       |
| fontWeight    | 700        |
| letterSpacing | -0.015em   |
| color         | var(--fg)  |
| marginTop     | 4px        |

### VDSection hint

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_FONT      |
| fontSize   | 12px            |
| color      | var(--fg-muted) |
| lineHeight | 1.5             |
| marginTop  | 4px             |

### VDSection body

| Property | Value |
| -------- | ----- |
| padding  | 22px  |

### VDField label

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 12px       |
| fontWeight    | 700        |
| letterSpacing | -0.005em   |
| color         | var(--fg)  |

### VDField hint badge (auto-generated, optional)

| Property      | Value            |
| ------------- | ---------------- |
| fontFamily    | ADMIN_MONO       |
| fontSize      | 10px             |
| letterSpacing | 0.06em           |
| textTransform | uppercase        |
| fontWeight    | 700              |
| color         | var(--fg-subtle) |

### VDField helper text

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_FONT      |
| fontSize   | 11px            |
| color      | var(--fg-muted) |
| lineHeight | 1.5             |
| marginTop  | 6px             |

### VDInput

| Property         | Value                                   |
| ---------------- | --------------------------------------- |
| display          | flex                                    |
| alignItems       | center                                  |
| height           | 36px                                    |
| padding          | 0 4px 0 12px                            |
| border           | 1px solid var(--border-strong)          |
| borderRadius     | 8px                                     |
| background       | var(--bg-elevated)                      |
| input fontSize   | 13px                                    |
| input fontWeight | 500                                     |
| input fontFamily | ADMIN_FONT (or ADMIN_MONO if mono=true) |
| input color      | var(--fg)                               |

### VDSelect

| Property          | Value                          |
| ----------------- | ------------------------------ |
| height            | 36px                           |
| padding           | 0 12px                         |
| border            | 1px solid var(--border-strong) |
| borderRadius      | 8px                            |
| background        | var(--bg-elevated)             |
| fontSize          | 13px                           |
| fontWeight        | 500                            |
| fontFamily        | ADMIN_FONT                     |
| chevron icon size | 12px                           |
| chevron position  | absolute right=10              |
| chevron transform | rotate(90deg)                  |
| chevron color     | var(--fg-subtle)               |

### VDSegToggle container

| Property     | Value                   |
| ------------ | ----------------------- |
| display      | inline-flex             |
| padding      | 2px                     |
| borderRadius | 8px                     |
| background   | var(--surface-1)        |
| border       | 1px solid var(--border) |

### VDSegToggle option (inactive)

| Property     | Value           |
| ------------ | --------------- |
| padding      | 6px 14px        |
| borderRadius | 6px             |
| fontSize     | 12px            |
| fontWeight   | 700             |
| fontFamily   | ADMIN_FONT      |
| color        | var(--fg-muted) |
| background   | transparent     |

### VDSegToggle option (active)

| Property   | Value               |
| ---------- | ------------------- |
| background | var(--signal)       |
| color      | var(--fg-on-accent) |

### Section 01 Identity — grid

| Property            | Value   |
| ------------------- | ------- |
| display             | grid    |
| gridTemplateColumns | 1fr 1fr |
| gap                 | 16px    |

### Section 02 Ticketing — grid

| Property            | Value     |
| ------------------- | --------- |
| display             | grid      |
| gridTemplateColumns | 200px 1fr |
| gap                 | 16px      |

### Section 03 Crawl — grid

| Property            | Value   |
| ------------------- | ------- |
| display             | grid    |
| gridTemplateColumns | 1fr 1fr |
| gap                 | 16px    |

### Section 04 Editorial — layout

| Property      | Value  |
| ------------- | ------ |
| display       | flex   |
| flexDirection | column |
| gap           | 26px   |

### Section 05 Identity Art — layout

| Property   | Value      |
| ---------- | ---------- |
| display    | flex       |
| alignItems | flex-start |
| gap        | 20px       |

### Section 05 namespace/seed grid

| Property            | Value   |
| ------------------- | ------- |
| display             | grid    |
| gridTemplateColumns | 1fr 1fr |
| gap                 | 14px    |

### Danger zone divider

| Property   | Value         |
| ---------- | ------------- |
| height     | 1px           |
| background | var(--border) |
| margin     | 16px 0        |

### Sticky save bar

| Property     | Value                        |
| ------------ | ---------------------------- |
| position     | sticky                       |
| bottom       | 0                            |
| marginTop    | 4px                          |
| padding      | 12px 18px                    |
| background   | var(--bg-elevated)           |
| border       | 1px solid var(--border)      |
| borderRadius | 12px                         |
| boxShadow    | 0 -6px 18px rgba(0,0,0,0.06) |
| display      | flex                         |
| alignItems   | center                       |
| gap          | 12px                         |

---

## Component: DeleteVenueConfirm (Modal)

### Modal scrim

| Property   | Value           |
| ---------- | --------------- |
| background | rgba(0,0,0,0.5) |
| zIndex     | 100             |
| position   | absolute        |
| inset      | 0               |

### Modal container

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| width        | 520px                                                         |
| maxWidth     | 100%                                                          |
| background   | var(--bg-elevated)                                            |
| border       | 1px solid color-mix(in oklab, var(--danger) 32%, transparent) |
| borderTop    | 3px solid var(--danger)                                       |
| borderRadius | 14px                                                          |
| boxShadow    | 0 24px 64px rgba(0,0,0,0.4)                                   |
| overflow     | hidden                                                        |

### Modal header

| Property | Value          |
| -------- | -------------- |
| padding  | 22px 24px 16px |

### Modal h3

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 22px       |
| fontWeight    | 800        |
| letterSpacing | -0.02em    |
| lineHeight    | 1.15       |
| color         | var(--fg)  |
| margin        | 8px 0 0    |

### DELETE input gate

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_MONO |
| fontSize      | 16px       |
| fontWeight    | 700        |
| letterSpacing | 0.08em     |
| color         | var(--fg)  |
| padding       | 12px 0     |
| width         | 100%       |

### DELETE input container (unarmed)

| Property     | Value                          |
| ------------ | ------------------------------ |
| background   | var(--surface-1)               |
| border       | 1px solid var(--border-strong) |
| borderRadius | 10px                           |
| padding      | 0 14px                         |

### DELETE input container (armed)

| Property   | Value                     |
| ---------- | ------------------------- |
| border     | 1.5px solid var(--danger) |
| transition | border-color 0.12s        |

### Delete confirm button (armed)

| Property   | Value                   |
| ---------- | ----------------------- |
| background | var(--danger)           |
| border     | 1px solid var(--danger) |
| color      | var(--fg-on-accent)     |
| cursor     | pointer                 |

### Delete confirm button (unarmed/disabled)

| Property   | Value                          |
| ---------- | ------------------------------ |
| background | var(--surface-2)               |
| border     | 1px solid var(--border-strong) |
| color      | var(--fg-subtle)               |
| cursor     | not-allowed                    |

### Button shared (height/padding)

| Property      | Value      |
| ------------- | ---------- |
| height        | 34px       |
| padding       | 0 16px     |
| borderRadius  | 8px        |
| fontFamily    | ADMIN_FONT |
| fontSize      | 13px       |
| fontWeight    | 700        |
| letterSpacing | -0.005em   |

### Modal action shelf

| Property       | Value                   |
| -------------- | ----------------------- |
| padding        | 14px 24px               |
| borderTop      | 1px solid var(--border) |
| display        | flex                    |
| gap            | 8px                     |
| justifyContent | flex-end                |
| background     | var(--surface-1)        |

---

## Component: AdminReviewPage

### Page layout (stacked, default)

| Property      | Value    |
| ------------- | -------- |
| display       | flex     |
| flexDirection | column   |
| gap           | 22px     |
| position      | relative |

### EventFlagsSection — header when items exist

| Property | Value                                         |
| -------- | --------------------------------------------- |
| title    | "Event flags" (ADMIN_FONT, 14px, 700)         |
| badge    | StatusBadge kind=warning mono — "{N} pending" |

### EventFlagsSection — header when empty

| Property | Value                                         |
| -------- | --------------------------------------------- |
| badge    | StatusBadge kind=success mono — "queue clear" |

### EventFlagsSection empty state layout

| Property       | Value         |
| -------------- | ------------- |
| padding        | 18px 22px     |
| display        | flex          |
| alignItems     | center        |
| justifyContent | space-between |
| gap            | 16px          |

### Empty state icon chip

| Property     | Value                                                |
| ------------ | ---------------------------------------------------- |
| width        | 36px                                                 |
| height       | 36px                                                 |
| borderRadius | 18px                                                 |
| background   | color-mix(in oklab, var(--success) 14%, transparent) |
| color        | var(--success)                                       |
| icon size    | 18px                                                 |

### EventFlagRow (list item)

| Property              | Value                                              |
| --------------------- | -------------------------------------------------- |
| display               | grid                                               |
| gridTemplateColumns   | auto 1fr auto auto                                 |
| gap                   | 14px                                               |
| alignItems            | center                                             |
| padding               | 14px 18px                                          |
| borderBottom          | 1px solid var(--border)                            |
| cursor                | pointer                                            |
| background (inactive) | transparent                                        |
| background (active)   | var(--surface-2)                                   |
| background (selected) | color-mix(in oklab, var(--signal) 6%, transparent) |
| borderLeft (inactive) | 2px solid transparent                              |
| borderLeft (active)   | 2px solid var(--signal)                            |
| transition            | background 0.12s                                   |

### EventFlagRow checkbox

| Property    | Value         |
| ----------- | ------------- |
| accentColor | var(--signal) |
| width       | 15px          |
| height      | 15px          |
| cursor      | pointer       |

### EventFlagRow title

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 13px       |
| fontWeight    | 600        |
| letterSpacing | -0.005em   |
| lineHeight    | 1.4        |
| color         | var(--fg)  |
| marginBottom  | 4px        |
| whiteSpace    | nowrap     |
| overflow      | hidden     |
| textOverflow  | ellipsis   |

### EventFlagRow venue text

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_FONT      |
| fontSize   | 12px            |
| color      | var(--fg-muted) |

### EventFlagRow date/time

| Property   | Value           |
| ---------- | --------------- |
| fontFamily | ADMIN_MONO      |
| fontSize   | 11px            |
| color      | var(--fg-muted) |

### EventFlagsSection split layout (list + inspector)

| Property            | Value                           |
| ------------------- | ------------------------------- |
| display             | grid                            |
| gridTemplateColumns | minmax(0, 1.1fr) minmax(0, 1fr) |
| minHeight           | 420px                           |

### EventFlagInspector header

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 14px 18px               |
| borderBottom | 1px solid var(--border) |
| background   | var(--surface-1)        |

### EventFlagInspector h3

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 18px       |
| fontWeight    | 700        |
| letterSpacing | -0.02em    |
| lineHeight    | 1.3        |
| color         | var(--fg)  |
| margin        | 0          |

### EventFlagInspector body area

| Property      | Value     |
| ------------- | --------- |
| padding       | 16px 18px |
| display       | flex      |
| flexDirection | column    |
| gap           | 16px      |
| flex          | 1         |
| overflowY     | auto      |

### LLM reasoning block

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| padding      | 12px 14px                                                     |
| background   | color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--accent) 30%, transparent) |
| borderRadius | 8px                                                           |
| fontFamily   | ADMIN_FONT                                                    |
| fontSize     | 12px                                                          |
| lineHeight   | 1.55                                                          |
| color        | var(--fg)                                                     |
| marginTop    | 8px                                                           |

### Raw source pre

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 12px 14px               |
| background   | var(--surface-1)        |
| border       | 1px solid var(--border) |
| borderRadius | 8px                     |
| fontFamily   | ADMIN_MONO              |
| fontSize     | 11px                    |
| lineHeight   | 1.5                     |
| color        | var(--fg-muted)         |
| whiteSpace   | pre-wrap                |
| overflowX    | auto                    |
| margin       | 8px 0 0                 |

### Run/cost strip

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 10px 12px               |
| background   | var(--surface-1)        |
| borderRadius | 8px                     |
| border       | 1px solid var(--border) |
| display      | flex                    |
| gap          | 12px                    |
| alignItems   | center                  |
| fontFamily   | ADMIN_MONO              |
| fontSize     | 11px                    |
| color        | var(--fg-muted)         |

### Inspector action shelf

| Property   | Value                   |
| ---------- | ----------------------- |
| display    | flex                    |
| gap        | 8px                     |
| padding    | 12px 18px               |
| borderTop  | 1px solid var(--border) |
| background | var(--bg-elevated)      |

### ConfidenceBarV2

| Property           | Value            |
| ------------------ | ---------------- |
| display            | flex             |
| alignItems         | center           |
| gap                | 8px              |
| minWidth           | 96px             |
| track height       | 4px              |
| track borderRadius | 4px              |
| track background   | var(--surface-2) |
| track overflow     | hidden           |
| fill borderRadius  | 4px              |
| fill color (≥0.80) | var(--success)   |
| fill color (≥0.70) | var(--signal)    |
| fill color (≥0.60) | var(--warning)   |
| fill color (<0.60) | var(--danger)    |
| label fontFamily   | ADMIN_MONO       |
| label fontSize     | 11px             |
| label fontWeight   | 700              |
| label minWidth     | 32px             |
| label textAlign    | right            |

---

## Component: PriceCoverageTable

### PendingSubmissionRow

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | 1fr auto auto auto      |
| gap                 | 14px                    |
| alignItems          | center                  |
| padding             | 12px 18px               |
| borderBottom        | 1px solid var(--border) |

### Submitter handle

| Property   | Value         |
| ---------- | ------------- |
| fontFamily | ADMIN_MONO    |
| fontWeight | 700           |
| color      | var(--accent) |

### Price value in submission

| Property           | Value        |
| ------------------ | ------------ |
| fontFamily         | ADMIN_MONO   |
| fontSize           | 13px         |
| fontWeight         | 700          |
| fontVariantNumeric | tabular-nums |

### AddPriceInlineForm

| Property            | Value                                                         |
| ------------------- | ------------------------------------------------------------- |
| padding             | 14px 18px                                                     |
| background          | color-mix(in oklab, var(--signal) 5%, var(--bg-elevated))     |
| border              | 1px solid color-mix(in oklab, var(--signal) 30%, transparent) |
| borderRadius        | 8px                                                           |
| display             | grid                                                          |
| gridTemplateColumns | 1fr auto auto auto auto                                       |
| gap                 | 12px                                                          |
| alignItems          | end                                                           |

### Price input fields (low/high)

| Property            | Value                          |
| ------------------- | ------------------------------ |
| display             | inline-flex                    |
| alignItems          | center                         |
| height              | 32px                           |
| padding             | 0 10px                         |
| borderRadius        | 6px                            |
| border              | 1px solid var(--border-strong) |
| background          | var(--bg-elevated)             |
| gap                 | 4px                            |
| $ prefix fontFamily | ADMIN_MONO                     |
| $ prefix fontSize   | 12px                           |
| $ prefix color      | var(--fg-subtle)               |
| input fontFamily    | ADMIN_MONO                     |
| input fontSize      | 13px                           |
| input fontWeight    | 600                            |
| input width         | 56px                           |

### PriceRowMenu (overflow popover)

| Property     | Value                                                    |
| ------------ | -------------------------------------------------------- |
| position     | absolute                                                 |
| right        | 28px                                                     |
| top          | 100%                                                     |
| marginTop    | 4px                                                      |
| minWidth     | 180px                                                    |
| padding      | 4px                                                      |
| background   | var(--bg-elevated)                                       |
| border       | 1px solid var(--border)                                  |
| borderRadius | 10px                                                     |
| boxShadow    | 0 14px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08) |
| zIndex       | 20                                                       |

### PriceMenuItem

| Property            | Value            |
| ------------------- | ---------------- |
| display             | flex             |
| alignItems          | center           |
| gap                 | 10px             |
| width               | 100%             |
| padding             | 8px 10px         |
| borderRadius        | 6px              |
| fontFamily          | ADMIN_FONT       |
| fontSize            | 13px             |
| fontWeight          | 500              |
| color (normal)      | var(--fg)        |
| color (destructive) | var(--danger)    |
| opacity (disabled)  | 0.45             |
| hover background    | var(--surface-1) |

### Stale price indicator

| Property      | Value          |
| ------------- | -------------- |
| text          | "STALE"        |
| fontSize      | 10px           |
| fontWeight    | 700            |
| color         | var(--warning) |
| letterSpacing | 0.04em         |
| marginLeft    | 8px            |

---

## Component: BulkActionDock

### Dock container

| Property     | Value                                                    |
| ------------ | -------------------------------------------------------- |
| position     | sticky                                                   |
| bottom       | 18px                                                     |
| alignSelf    | center                                                   |
| marginLeft   | auto                                                     |
| marginRight  | auto                                                     |
| display      | flex                                                     |
| alignItems   | center                                                   |
| gap          | 12px                                                     |
| padding      | 10px 12px 10px 18px                                      |
| background   | var(--ink)                                               |
| borderRadius | 14px                                                     |
| boxShadow    | 0 12px 36px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18) |
| color        | var(--paper)                                             |
| zIndex       | 50                                                       |

### Count chip in dock

| Property           | Value               |
| ------------------ | ------------------- |
| minWidth           | 22px                |
| height             | 22px                |
| padding            | 0 7px               |
| borderRadius       | 11px                |
| background         | var(--signal)       |
| color              | var(--fg-on-accent) |
| fontFamily         | ADMIN_MONO          |
| fontSize           | 11px                |
| fontWeight         | 700                 |
| fontVariantNumeric | tabular-nums        |

### Dock separator

| Property   | Value                  |
| ---------- | ---------------------- |
| width      | 1px                    |
| height     | 18px                   |
| background | rgba(255,255,255,0.16) |

### "Re-tag" / "Reject all" buttons

| Property           | Value                                        |
| ------------------ | -------------------------------------------- |
| padding            | 6px 10px                                     |
| borderRadius       | 7px                                          |
| fontFamily         | ADMIN_FONT                                   |
| fontSize           | 12px                                         |
| fontWeight         | 600                                          |
| color (Re-tag)     | var(--paper)                                 |
| color (Reject all) | color-mix(in oklab, var(--danger) 60%, #fff) |

### "Approve N" button

| Property     | Value               |
| ------------ | ------------------- |
| padding      | 8px 14px            |
| borderRadius | 8px                 |
| background   | var(--success)      |
| color        | var(--fg-on-accent) |
| fontFamily   | ADMIN_FONT          |
| fontSize     | 13px                |
| fontWeight   | 700                 |

### Clear selection button

| Property     | Value                 |
| ------------ | --------------------- |
| padding      | 6px                   |
| borderRadius | 6px                   |
| color        | rgba(255,255,255,0.6) |

---

## Component: BulkApproveConfirm (Modal)

### Modal scrim

| Property   | Value            |
| ---------- | ---------------- |
| background | rgba(0,0,0,0.45) |
| zIndex     | 100              |

### Modal container

| Property     | Value                        |
| ------------ | ---------------------------- |
| width        | 520px                        |
| background   | var(--bg-elevated)           |
| border       | 1px solid var(--border)      |
| borderRadius | 14px                         |
| boxShadow    | 0 24px 64px rgba(0,0,0,0.35) |

### Modal header

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 18px 22px               |
| borderBottom | 1px solid var(--border) |

### Modal h3

| Property      | Value      |
| ------------- | ---------- |
| fontFamily    | ADMIN_FONT |
| fontSize      | 18px       |
| fontWeight    | 700        |
| letterSpacing | -0.02em    |
| margin        | 6px 0 0    |

### Event preview list

| Property     | Value                   |
| ------------ | ----------------------- |
| border       | 1px solid var(--border) |
| borderRadius | 8px                     |
| overflow     | hidden                  |
| background   | var(--surface-1)        |
| marginTop    | 8px                     |

### Event preview row

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | 1fr auto                |
| gap                 | 12px                    |
| alignItems          | center                  |
| padding             | 8px 12px                |
| borderBottom        | 1px solid var(--border) |

### Warning strip in modal

| Property     | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| padding      | 10px 12px                                                      |
| background   | color-mix(in oklab, var(--warning) 8%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--warning) 28%, transparent) |
| borderRadius | 8px                                                            |
| marginTop    | 12px                                                           |

### Modal action shelf

| Property       | Value                   |
| -------------- | ----------------------- |
| padding        | 14px 22px               |
| borderTop      | 1px solid var(--border) |
| display        | flex                    |
| gap            | 8px                     |
| justifyContent | flex-end                |
| background     | var(--surface-1)        |

---

## Component: AdminFeedbackPage

### Page layout

| Property      | Value  |
| ------------- | ------ |
| display       | flex   |
| flexDirection | column |
| gap           | 20px   |

### Stats row

| Property            | Value                                |
| ------------------- | ------------------------------------ |
| display             | grid                                 |
| gridTemplateColumns | repeat(auto-fit, minmax(180px, 1fr)) |
| gap                 | 16px                                 |

### Main content layout

| Property            | Value                |
| ------------------- | -------------------- |
| display             | grid                 |
| gridTemplateColumns | 200px minmax(0, 1fr) |
| gap                 | 20px                 |
| alignItems          | flex-start           |

---

## Component: FeedbackFilterRail

### Rail container

| Property      | Value                   |
| ------------- | ----------------------- |
| width         | 200px                   |
| flexShrink    | 0                       |
| background    | var(--bg-elevated)      |
| border        | 1px solid var(--border) |
| borderRadius  | 12px                    |
| padding       | 8px                     |
| display       | flex                    |
| flexDirection | column                  |
| gap           | 2px                     |
| alignSelf     | flex-start              |

### Rail section header (MonoLabel)

| Property | Value    |
| -------- | -------- |
| padding  | 8px 10px |

### Rail filter item (inactive)

| Property     | Value           |
| ------------ | --------------- |
| display      | flex            |
| alignItems   | center          |
| gap          | 10px            |
| padding      | 8px 10px        |
| borderRadius | 8px             |
| background   | transparent     |
| color        | var(--fg-muted) |
| fontFamily   | ADMIN_FONT      |
| fontSize     | 13px            |
| fontWeight   | 500             |

### Rail filter item (active)

| Property   | Value            |
| ---------- | ---------------- |
| background | var(--surface-2) |
| color      | var(--fg)        |
| fontWeight | 700              |
| position   | relative         |

### Rail active indicator

| Property     | Value         |
| ------------ | ------------- |
| position     | absolute      |
| left         | 0             |
| top          | 8px           |
| bottom       | 8px           |
| width        | 2px           |
| background   | var(--signal) |
| borderRadius | 2px           |

### Rail count badge

| Property              | Value            |
| --------------------- | ---------------- |
| fontFamily            | ADMIN_MONO       |
| fontSize              | 10px             |
| fontWeight            | 700              |
| padding               | 2px 6px          |
| borderRadius          | 8px              |
| background (active)   | var(--bg)        |
| background (inactive) | var(--surface-1) |
| color                 | var(--fg-muted)  |
| fontVariantNumeric    | tabular-nums     |

### Rail section separator

| Property   | Value         |
| ---------- | ------------- |
| height     | 1px           |
| background | var(--border) |
| margin     | 6px 8px       |

### Source filter checkbox

| Property    | Value           |
| ----------- | --------------- |
| display     | flex            |
| alignItems  | center          |
| gap         | 8px             |
| padding     | 6px 10px        |
| fontFamily  | ADMIN_FONT      |
| fontSize    | 12px            |
| color       | var(--fg-muted) |
| accentColor | var(--signal)   |

---

## Component: FeedbackRow (collapsed)

### Row container

| Property            | Value                   |
| ------------------- | ----------------------- |
| borderBottom        | 1px solid var(--border) |
| background (unread) | var(--surface-2)        |
| background (read)   | transparent             |
| position            | relative                |

### Unread indicator dot

| Property     | Value         |
| ------------ | ------------- |
| position     | absolute      |
| left         | 6px           |
| top          | 22px          |
| width        | 6px           |
| height       | 6px           |
| borderRadius | 3px           |
| background   | var(--signal) |

### Row button (clickable area)

| Property            | Value                   |
| ------------------- | ----------------------- |
| display             | grid                    |
| gridTemplateColumns | auto 1fr auto auto auto |
| gap                 | 14px                    |
| alignItems          | center                  |
| padding             | 12px 16px 12px 22px     |
| width               | 100%                    |

### Handle text

| Property      | Value         |
| ------------- | ------------- |
| fontFamily    | ADMIN_MONO    |
| fontSize      | 11px          |
| fontWeight    | 700           |
| color         | var(--accent) |
| letterSpacing | 0.02em        |

### Body first line (unread)

| Property     | Value      |
| ------------ | ---------- |
| fontFamily   | ADMIN_FONT |
| fontSize     | 13px       |
| fontWeight   | 600        |
| color        | var(--fg)  |
| lineHeight   | 1.4        |
| whiteSpace   | nowrap     |
| overflow     | hidden     |
| textOverflow | ellipsis   |
| maxWidth     | 540px      |

### Body first line (read)

| Property   | Value           |
| ---------- | --------------- |
| fontWeight | 500             |
| color      | var(--fg-muted) |

---

## Component: FeedbackExpanded

### Expanded container

| Property   | Value                   |
| ---------- | ----------------------- |
| padding    | 4px 22px 18px 22px      |
| background | var(--bg-elevated)      |
| borderTop  | 1px solid var(--border) |

### Expanded grid layout

| Property            | Value                           |
| ------------------- | ------------------------------- |
| display             | grid                            |
| gridTemplateColumns | minmax(0, 1.4fr) minmax(0, 1fr) |
| gap                 | 20px                            |
| marginTop           | 12px                            |

### Full body block

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 14px 16px               |
| background   | var(--surface-1)        |
| border       | 1px solid var(--border) |
| borderRadius | 8px                     |
| fontFamily   | ADMIN_FONT              |
| fontSize     | 13px                    |
| lineHeight   | 1.6                     |
| color        | var(--fg)               |
| marginTop    | 8px                     |

### Screenshot slot

| Property     | Value                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| height       | 200px                                                                                    |
| borderRadius | 8px                                                                                      |
| border       | 1px solid var(--border)                                                                  |
| background   | repeating-linear-gradient(135deg, var(--surface-1) 0 10px, var(--bg-elevated) 10px 20px) |
| marginTop    | 8px                                                                                      |

### Admin notes textarea

| Property     | Value                          |
| ------------ | ------------------------------ |
| width        | 100%                           |
| padding      | 10px 12px                      |
| borderRadius | 8px                            |
| border       | 1px solid var(--border-strong) |
| background   | var(--bg-elevated)             |
| fontFamily   | ADMIN_FONT                     |
| fontSize     | 12px                           |
| lineHeight   | 1.5                            |
| resize       | vertical                       |
| marginTop    | 8px                            |

### Context metadata block

| Property      | Value                   |
| ------------- | ----------------------- |
| padding       | 10px 14px               |
| background    | var(--surface-1)        |
| border        | 1px solid var(--border) |
| borderRadius  | 8px                     |
| display       | flex                    |
| flexDirection | column                  |
| gap           | 8px                     |
| fontFamily    | ADMIN_MONO              |
| fontSize      | 11px                    |
| marginTop     | 8px                     |

### Context key label

| Property      | Value            |
| ------------- | ---------------- |
| width         | 70px             |
| color         | var(--fg-subtle) |
| letterSpacing | 0.06em           |
| textTransform | uppercase        |
| fontSize      | 10px             |
| fontWeight    | 700              |

### Context value

| Property   | Value     |
| ---------- | --------- |
| flex       | 1         |
| color      | var(--fg) |
| fontWeight | 600       |

### Linked issue block

| Property     | Value                                                         |
| ------------ | ------------------------------------------------------------- |
| padding      | 12px 14px                                                     |
| background   | color-mix(in oklab, var(--accent) 7%, var(--bg-elevated))     |
| border       | 1px solid color-mix(in oklab, var(--accent) 32%, transparent) |
| borderRadius | 8px                                                           |
| display      | flex                                                          |
| alignItems   | center                                                        |
| gap          | 10px                                                          |
| marginTop    | 8px                                                           |

### Linked issue URL

| Property       | Value         |
| -------------- | ------------- |
| fontFamily     | ADMIN_MONO    |
| fontSize       | 12px          |
| color          | var(--accent) |
| textDecoration | none          |
| fontWeight     | 700           |
| flex           | 1             |

### Create issue placeholder

| Property     | Value                           |
| ------------ | ------------------------------- |
| padding      | 12px 14px                       |
| background   | var(--surface-1)                |
| border       | 1px dashed var(--border-strong) |
| borderRadius | 8px                             |
| marginTop    | 8px                             |

### Create issue description text

| Property     | Value           |
| ------------ | --------------- |
| fontFamily   | ADMIN_FONT      |
| fontSize     | 12px            |
| color        | var(--fg-muted) |
| lineHeight   | 1.55            |
| marginBottom | 10px            |

### Action shelf (expanded footer)

| Property   | Value                   |
| ---------- | ----------------------- |
| display    | flex                    |
| alignItems | center                  |
| gap        | 8px                     |
| flexWrap   | wrap                    |
| padding    | 12px 0 0                |
| marginTop  | 14px                    |
| borderTop  | 1px solid var(--border) |

---

## NAV_V2 structure (navigation items)

| Item                  | Badge kind | Condition                                 |
| --------------------- | ---------- | ----------------------------------------- |
| Dashboard             | —          | always                                    |
| Venues                | —          | always                                    |
| Crawl                 | warning    | consecutiveFailures > 0 OR blocked venues |
| Review                | warning    | flags + pending submissions count         |
| Feedback              | signal     | unread feedback count                     |
| — separator —         |            |                                           |
| Invite codes          | —          | account section                           |
| Settings              | —          | account section                           |
| (back-to-app removed) |            |                                           |

### Badge kind distinction

| Kind    | Use case                    | fg color            |
| ------- | --------------------------- | ------------------- |
| warning | crawl failures, event flags | var(--bg)           |
| signal  | unread feedback             | var(--fg-on-accent) |

---

## Mobile Review tabs (AdminReviewMobile)

### Tab switcher (flags/prices)

| Property     | Value                   |
| ------------ | ----------------------- |
| display      | flex                    |
| gap          | 6px                     |
| padding      | 4px                     |
| background   | var(--surface-1)        |
| borderRadius | 10px                    |
| border       | 1px solid var(--border) |

### Tab button (inactive)

| Property     | Value           |
| ------------ | --------------- |
| flex         | 1               |
| padding      | 8px 0           |
| textAlign    | center          |
| borderRadius | 7px             |
| fontFamily   | ADMIN_FONT      |
| fontSize     | 12px            |
| fontWeight   | 700             |
| color        | var(--fg-muted) |
| background   | transparent     |

### Tab button (active)

| Property   | Value                      |
| ---------- | -------------------------- |
| color      | var(--fg)                  |
| background | var(--bg-elevated)         |
| boxShadow  | 0 1px 2px rgba(0,0,0,0.06) |

### Tab count badge (active)

| Property     | Value               |
| ------------ | ------------------- |
| background   | var(--signal)       |
| color        | var(--fg-on-accent) |
| fontFamily   | ADMIN_MONO          |
| fontSize     | 10px                |
| fontWeight   | 700                 |
| minWidth     | 16px                |
| height       | 16px                |
| padding      | 0 4px               |
| borderRadius | 8px                 |

### Tab count badge (inactive)

| Property   | Value            |
| ---------- | ---------------- |
| background | var(--surface-2) |
| color      | var(--fg-muted)  |

---

## Mobile Feedback (AdminFeedbackMobile)

### Filter scroll pills

| Property  | Value |
| --------- | ----- |
| display   | flex  |
| gap       | 6px   |
| overflowX | auto  |
| padding   | 2px 0 |

### Filter pill (active)

| Property     | Value                   |
| ------------ | ----------------------- |
| padding      | 6px 12px                |
| borderRadius | 999px                   |
| fontFamily   | ADMIN_FONT              |
| fontSize     | 12px                    |
| fontWeight   | 700                     |
| background   | var(--signal)           |
| color        | var(--fg-on-accent)     |
| border       | 1px solid var(--signal) |

### Filter pill (inactive)

| Property   | Value                   |
| ---------- | ----------------------- |
| background | var(--surface-1)        |
| color      | var(--fg-muted)         |
| border     | 1px solid var(--border) |

### Mobile feedback card (unread)

| Property     | Value                          |
| ------------ | ------------------------------ |
| padding      | 12px 14px                      |
| background   | var(--bg-elevated)             |
| border       | 1px solid var(--border-strong) |
| borderRadius | 12px                           |
| position     | relative                       |

### Mobile feedback card (read)

| Property | Value                   |
| -------- | ----------------------- |
| border   | 1px solid var(--border) |

### Mobile unread dot

| Property     | Value         |
| ------------ | ------------- |
| position     | absolute      |
| left         | 8px           |
| top          | 16px          |
| width        | 5px           |
| height       | 5px           |
| borderRadius | 3px           |
| background   | var(--signal) |

---

## DB schema additions needed (Feedback page)

| Column     | Table    | Type                                                                 | Notes            |
| ---------- | -------- | -------------------------------------------------------------------- | ---------------- |
| status     | feedback | enum('unread','read','flagged','issue_opened','resolved','archived') | default 'unread' |
| adminNotes | feedback | text nullable                                                        |                  |
| issueUrl   | feedback | text nullable                                                        | GitHub issue URL |
