# #737 In-App Notifications — design enumeration (panel body)

Source of truth: `design/design_handoff_in_app_notifications/` (R2, 2026-07-25).
Scope: **panel body only** — `notifications-panel.jsx` + `notifications-data.jsx`.
Chrome (pip, avatar, app bar, tab bar, user menu, inbox strip) is a later PR and is
listed separately in §7.

Enumerated from the mock as written. Where a value is not stated, §8 says so
rather than inventing one.

---

## 1. Component inventory

| Component                                                                  | Job                                                             | Props as the mock uses them                                                                                                      | Renders                                                                                                                                    |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `NMono` (helper, not in the named list but used by nearly every component) | The mono metadata typeface used for all small caps labels       | `children`, `color = "var(--fg-muted)"`, `size = 9.5`, `ls = "0.14em"`, `style`                                                  | a `<span>` in JetBrains Mono, weight 700, uppercase                                                                                        |
| `NotifTile`                                                                | Category glyph chip on the left of a row                        | `category`, `read`, `size = 28`                                                                                                  | `aria-hidden` square with rounded corners, `--surface-2` fill, `--border` hairline, `NGlyph` in the category ink                           |
| `NotifItem`                                                                | One notification row; the whole row is the click target         | `n` (the notification object), `onOpen`, `compact = false`                                                                       | `role="button"` flex row: tile, title, optional body, metadata row (category label, unread dot, spacer, timestamp, hover chevron)          |
| `NotifDayDivider`                                                          | Sticky date header between day groups                           | `label`                                                                                                                          | `role="presentation"` sticky bar with an `NMono` label                                                                                     |
| `NotifSkeletonRow`                                                         | One loading placeholder, box-identical to a real row            | none                                                                                                                             | `aria-hidden` row with a 28px shimmer tile and 4 shimmer bars                                                                              |
| `NotifLoading`                                                             | The loading state wrapper + SR announcement                     | `rows = 3`                                                                                                                       | `role="status"` `aria-busy` container, visually-hidden loading string, N `NotifSkeletonRow`                                                |
| `NotifEmpty`                                                               | Zero-notifications state                                        | `onAction`                                                                                                                       | centred bell chip, title, body, CTA button                                                                                                 |
| `NotifError`                                                               | Poll-failure state                                              | `onRetry`                                                                                                                        | `role="alert"` centred title, body, Retry button                                                                                           |
| `NotifHeader`                                                              | Panel title + unread count + mark-all + close                   | `count`, `onMarkAll`, `onClose`, `showClose`                                                                                     | header bar: title, count/all-caught-up mono line, conditional "Mark all read", conditional 44px close button                               |
| `NotifBody`                                                                | The one shared body — header, state switch, grouping, load-more | `items = []`, `state = "ready"`, `grouped = true`, `hasMore = false`, `onOpen`, `onMarkAll`, `onClose`, `showClose`, `maxHeight` | `NotifHeader` + a scroll region containing exactly one of loading / error / empty / grouped list, plus the load-more or end-of-list footer |
| `NotifDropdown`                                                            | Desktop shell (anchored card)                                   | `width = 380`, `maxHeight = 520`, `...rest` → `NotifBody`                                                                        | `role="dialog"` rounded card with border + shadow, wraps `NotifBody` with `showClose`                                                      |
| `NotifSheet`                                                               | Mobile shell (bottom sheet)                                     | `height = "88%"`, `...rest` → `NotifBody`                                                                                        | `role="dialog"` top-rounded sheet with drag handle, wraps `NotifBody` with `showClose`                                                     |

---

## 2. Per-component requirement table

Source column refers to `notifications-panel.jsx` (panel) / `notifications-data.jsx` (data) / `README.md` unless noted.

### NMono (shared metadata type)

| ID      | Component | Requirement                                                                                                   | Source                                              |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| MONO-01 | NMono     | Font family `'JetBrains Mono', monospace`                                                                     | panel `NMono`                                       |
| MONO-02 | NMono     | Default font-size **9.5px**; weight **700**; `text-transform: uppercase`                                      | panel `NMono`                                       |
| MONO-03 | NMono     | Default letter-spacing **0.14em**; timestamp and several call sites override to **0.1em**                     | panel `NMono`, `NotifItem`, `NotifBody` end-of-list |
| MONO-04 | NMono     | Default colour `var(--fg-muted)`; overridable, but **never** to a category ink or `var(--fg-subtle)` for text | panel contrast-rule comment, README A11y            |

### NotifTile

| ID      | Component | Requirement                                                                               | Source                  |
| ------- | --------- | ----------------------------------------------------------------------------------------- | ----------------------- |
| TILE-01 | NotifTile | Default size **28×28px**, `border-radius: 8px`, `flex-shrink: 0`                          | panel `NotifTile`       |
| TILE-02 | NotifTile | Background `var(--surface-2)`; border `1px solid var(--border)`                           | panel `NotifTile`       |
| TILE-03 | NotifTile | `color` = the category's `ink` from `CATEGORY_MAP` (glyph inherits via `currentColor`)    | panel `NotifTile`       |
| TILE-04 | NotifTile | `opacity: 0.55` when `read` is true, `1` when unread                                      | panel `NotifTile`       |
| TILE-05 | NotifTile | Inner glyph size = `size * 0.57` (**15.96px** at the 28px default)                        | panel `NotifTile`       |
| TILE-06 | NotifTile | `aria-hidden="true"` — the tile is never announced                                        | panel `NotifTile`       |
| TILE-07 | NotifTile | Centred via inline-flex, `align-items: center`, `justify-content: center`                 | panel `NotifTile`       |
| TILE-08 | NotifTile | Glyph is a 16-viewBox stroke mark, `fill="none"`, stroke `currentColor` — no filled icons | data `NGlyph` / `GLYPH` |

### NotifItem — geometry

| ID      | Component | Requirement                                                                                                            | Source                                                      |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| ITEM-01 | NotifItem | Row is `display: flex`, `gap: 10px`, `align-items: flex-start`                                                         | panel `NotifItem`                                           |
| ITEM-02 | NotifItem | Padding **13px 14px 13px 12px** in default mode                                                                        | panel `NotifItem`                                           |
| ITEM-03 | NotifItem | Padding **11px 14px 11px 12px** when `compact`                                                                         | panel `NotifItem`                                           |
| ITEM-04 | NotifItem | `min-height: 64px` — a **floor**, not a target; real rows run ~92–116px                                                | panel `NotifItem`, README "Row layout at real title length" |
| ITEM-05 | NotifItem | `border-bottom: 1px solid var(--border)` on every row                                                                  | panel `NotifItem`                                           |
| ITEM-06 | NotifItem | Left rail is **always a 2px left border**, transparent when read — so read and unread rows have identical width/indent | panel `NotifItem`                                           |
| ITEM-07 | NotifItem | Text column: `flex: 1`, `min-width: 0`, column flex, `gap: 4px`                                                        | panel `NotifItem`                                           |
| ITEM-08 | NotifItem | `cursor: pointer` on the whole row                                                                                     | panel `NotifItem`                                           |
| ITEM-09 | NotifItem | Metadata row: flex, `align-items: center`, `gap: 8px`, `margin-top: 1px`                                               | panel `NotifItem`                                           |
| ITEM-10 | NotifItem | Metadata row order: category label → unread dot (if unread) → flexible spacer → timestamp → chevron                    | panel `NotifItem`                                           |
| ITEM-11 | NotifItem | Timestamp is on the **metadata row, not the title baseline** — the title owns the full column width                    | panel R2 header comment, README                             |
| ITEM-12 | NotifItem | Body block is omitted entirely when `n.body` is falsy                                                                  | panel `NotifItem` (`{n.body && …}`)                         |

### NotifItem — typography

| ID      | Component | Requirement                                                                                                           | Source                                     |
| ------- | --------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| ITEM-13 | NotifItem | Title: Inter, **13.5px**, `line-height: 1.36`, `letter-spacing: -0.01em`, `text-wrap: pretty`                         | panel `NotifItem`                          |
| ITEM-14 | NotifItem | Title clamps to **2 lines** (`-webkit-box` + `WebkitLineClamp: 2` + `WebkitBoxOrient: vertical` + `overflow: hidden`) | panel `NotifItem`                          |
| ITEM-15 | NotifItem | Body: Inter, **12.5px**, `line-height: 1.42`, colour `var(--fg-muted)`, `text-wrap: pretty`                           | panel `NotifItem`                          |
| ITEM-16 | NotifItem | Body clamps to **2 lines**, same mechanism                                                                            | panel `NotifItem`                          |
| ITEM-17 | NotifItem | Body colour is `var(--fg-muted)` **in both read and unread states** — read rows do not dim the body                   | panel `NotifItem`, README "Unread vs read" |
| ITEM-18 | NotifItem | Category eyebrow renders through `NMono` at default 9.5/0.14em in `var(--fg-muted)` — **never** in the category ink   | panel `NotifItem`, README A11y 1.4.1       |
| ITEM-19 | NotifItem | Timestamp renders through `NMono` with `ls="0.1em"` and `flex-shrink: 0`                                              | panel `NotifItem`                          |

### NotifItem — the four unread signals (README says four simultaneous, all four are enumerated)

| ID      | Component | Requirement                                                                                                                                                                                       | Source                              |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| UNRD-01 | NotifItem | **Signal 1 — rail.** `border-left: 2px solid <category ink>` when unread; `2px solid transparent` when read                                                                                       | panel `NotifItem`                   |
| UNRD-02 | NotifItem | **Signal 2 — fill.** `background: var(--surface-1)` when unread; `transparent` when read                                                                                                          | panel `NotifItem`                   |
| UNRD-03 | NotifItem | **Signal 3 — title weight + colour.** Unread: weight **700**, colour `var(--fg)`. Read: weight **600**, colour `var(--fg-muted)`                                                                  | panel `NotifItem`                   |
| UNRD-04 | NotifItem | **Signal 4 — trailing dot.** Unread only: a **5×5px** `border-radius: 5px` dot filled with the category ink, `flex-shrink: 0`, `aria-hidden="true"`, sitting immediately after the category label | panel `NotifItem`                   |
| UNRD-05 | NotifItem | Read rows additionally drop tile opacity to 0.55 (see TILE-04) — this is a fifth reinforcement, not one of the four                                                                               | panel `NotifTile`                   |
| UNRD-06 | NotifItem | Row _text_ is never tinted with a category ink in either state                                                                                                                                    | panel contrast-rule comment, README |
| UNRD-07 | NotifItem | Unread state is additionally spoken: `itemLabel` appends `". Unread"` when `n.read` is falsy                                                                                                      | data `itemLabel`                    |

### NotifItem — interaction

| ID      | Component | Requirement                                                                                                                                                    | Source                                           |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| ITEM-20 | NotifItem | `role="button"`, `tabIndex={0}` on the row container                                                                                                           | panel `NotifItem`                                |
| ITEM-21 | NotifItem | **No nested interactives** inside a row — the chevron is a decorative `<span>`, not a button                                                                   | panel `NotifItem`, README                        |
| ITEM-22 | NotifItem | `onClick` calls `onOpen(n)`                                                                                                                                    | panel `NotifItem`                                |
| ITEM-23 | NotifItem | `onKeyDown`: **Enter** and **Space** both `preventDefault()` and call `onOpen(n)`                                                                              | panel `NotifItem`                                |
| ITEM-24 | NotifItem | `aria-label` = `itemLabel(n)` (the single source; display and speech must not drift)                                                                           | panel `NotifItem`, data `itemLabel`              |
| ITEM-25 | NotifItem | Row carries `data-action-url={n.actionUrl}`                                                                                                                    | panel `NotifItem`                                |
| ITEM-26 | NotifItem | Hover: `background: var(--overlay-hover)` with `!important`, transition `background .12s ease`                                                                 | panel keyframe block `.notif-row`                |
| ITEM-27 | NotifItem | Focus-visible: `outline: 2px solid var(--focus)` with `outline-offset: -2px` (ring **inset** 2px)                                                              | panel keyframe block, README Keyboard            |
| ITEM-28 | NotifItem | Chevron is hidden by default: `opacity: 0`, `transform: translateX(-3px)`, transition `all .14s ease`                                                          | panel `NotifItem`                                |
| ITEM-29 | NotifItem | Chevron reveals on **hover** (`.notif-row:hover .notif-chev` → `opacity: 1; transform: translateX(0)`)                                                         | panel keyframe block                             |
| ITEM-30 | NotifItem | README states the chevron appears on **hover/focus**; the mock CSS only implements the hover selector — focus-visible chevron reveal is required by the README | README "Action affordance", panel keyframe block |
| ITEM-31 | NotifItem | Chevron: 11×11 SVG, `stroke-width: 1.5`, round caps/joins, colour `var(--fg-muted)`, `aria-hidden="true"`                                                      | panel `NotifItem`                                |

### NotifDayDivider

| ID     | Component       | Requirement                                                                          | Source                  |
| ------ | --------------- | ------------------------------------------------------------------------------------ | ----------------------- |
| DIV-01 | NotifDayDivider | `position: sticky`, `top: 0`, `z-index: 2`                                           | panel `NotifDayDivider` |
| DIV-02 | NotifDayDivider | Padding **7px 14px 6px**                                                             | panel `NotifDayDivider` |
| DIV-03 | NotifDayDivider | Background `var(--bg-elevated)`; `border-bottom: 1px solid var(--border)`            | panel `NotifDayDivider` |
| DIV-04 | NotifDayDivider | `role="presentation"` on the container                                               | panel `NotifDayDivider` |
| DIV-05 | NotifDayDivider | Label renders through `NMono` at default settings (9.5px, 700, 0.14em, `--fg-muted`) | panel `NotifDayDivider` |

### NotifSkeletonRow / NotifLoading

| ID      | Component        | Requirement                                                                                                                                                                                             | Source                               |
| ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| LOAD-01 | NotifLoading     | Default **3** skeleton rows                                                                                                                                                                             | panel `NotifLoading`, README Loading |
| LOAD-02 | NotifSkeletonRow | Box-identical to a real row: `padding: 13px 14px 13px 12px`, `min-height: 64px`, `gap: 10px`, `align-items: flex-start`, `border-left: 2px solid transparent`, `border-bottom: 1px solid var(--border)` | panel `NotifSkeletonRow`             |
| LOAD-03 | NotifSkeletonRow | Skeleton tile is 28×28, `border-radius: 8px`, `flex-shrink: 0`, shimmering                                                                                                                              | panel `NotifSkeletonRow`             |
| LOAD-04 | NotifSkeletonRow | Text column gap is **7px** (differs from the live row's 4px)                                                                                                                                            | panel `NotifSkeletonRow`             |
| LOAD-05 | NotifSkeletonRow | Bars in order: `100%`×10px, `64%`×10px (the two title lines), `92%`×9px (body), then a meta row of `46px`×8px + spacer + `20px`×8px                                                                     | panel `NotifSkeletonRow`             |
| LOAD-06 | NotifSkeletonRow | Bars have `border-radius: 3px`, `display: block`                                                                                                                                                        | panel `NotifSkeletonRow`             |
| LOAD-07 | NotifSkeletonRow | Shimmer: `linear-gradient(90deg, var(--surface-1) 0%, var(--surface-2) 45%, var(--surface-1) 90%)`, `background-size: 220% 100%`, `animation: notifSweep 1.5s linear infinite`                          | panel `NotifSkeletonRow`             |
| LOAD-08 | —                | Keyframes `notifSweep`: `0% { background-position: -220% 0 }` → `100% { background-position: 320% 0 }` (horizontal sweep, the `discovery_loading` language)                                             | panel keyframe block, README DNA     |
| LOAD-09 | —                | `@media (prefers-reduced-motion: reduce)` → `.notif-shimmer { animation: none !important; background: var(--surface-2) !important }` (static fill)                                                      | panel keyframe block, README Loading |
| LOAD-10 | NotifLoading     | Container is `role="status"` + `aria-busy="true"` + `aria-live="polite"`                                                                                                                                | panel `NotifLoading`                 |
| LOAD-11 | NotifLoading     | A visually-hidden span announces `NOTIF_COPY.loading`, hidden via `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0)`                                                  | panel `NotifLoading`                 |
| LOAD-12 | NotifSkeletonRow | Each skeleton row is `aria-hidden="true"`                                                                                                                                                               | panel `NotifSkeletonRow`             |

### NotifEmpty

| ID      | Component  | Requirement                                                                                                                                                                                                                             | Source                                     |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| EMPT-01 | NotifEmpty | Container padding **42px 26px 38px**, `text-align: center`, column flex, centred, `gap: 10px`                                                                                                                                           | panel `NotifEmpty`                         |
| EMPT-02 | NotifEmpty | Bell chip **46×46px**, `border-radius: 14px`, `background: var(--surface-1)`, `border: 1px solid var(--border)`, `margin-bottom: 2px`, `aria-hidden="true"`                                                                             | panel `NotifEmpty`                         |
| EMPT-03 | NotifEmpty | Chip glyph is the **bell** at **22px**, colour `var(--fg-subtle)` (permitted — it is a graphic, not text)                                                                                                                               | panel `NotifEmpty`                         |
| EMPT-04 | NotifEmpty | Title: Inter **17px**, weight **800**, `var(--fg)`, `letter-spacing: -0.02em`, text = `NOTIF_COPY.emptyTitle`                                                                                                                           | panel `NotifEmpty`                         |
| EMPT-05 | NotifEmpty | Body: Inter **13px**, `line-height: 1.5`, `var(--fg-muted)`, `max-width: 268px`, `text-wrap: pretty`, text = `NOTIF_COPY.emptyBody`                                                                                                     | panel `NotifEmpty`                         |
| EMPT-06 | NotifEmpty | CTA button: `margin-top: 8px`, padding **9px 18px**, `border-radius: 8px`, `background: var(--surface-2)`, `border: 1px solid var(--border-strong)`, Inter **12.5px** weight **700**, colour `var(--signal)`, `letter-spacing: -0.01em` | panel `NotifEmpty`                         |
| EMPT-07 | NotifEmpty | CTA label = `NOTIF_COPY.emptyAction`; fires `onAction`                                                                                                                                                                                  | panel `NotifEmpty`                         |
| EMPT-08 | NotifEmpty | CTA height ≈36px — deliberately **not** raised to 44px                                                                                                                                                                                  | README A11y Targets, READINESS open item 1 |
| EMPT-09 | NotifEmpty | `NOTIF_COPY.emptyHint` exists in copy but is **not rendered** by `NotifEmpty` in the mock                                                                                                                                               | data `NOTIF_COPY`, panel `NotifEmpty`      |

### NotifError

| ID     | Component  | Requirement                                                                                                                                                                                             | Source                                     |
| ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| ERR-01 | NotifError | Container `role="alert"`, padding **34px 26px**, centred column flex, `gap: 10px`, `text-align: center`                                                                                                 | panel `NotifError`                         |
| ERR-02 | NotifError | Title: Inter **14px**, weight **700**, `var(--fg)`, text = `NOTIF_COPY.error`                                                                                                                           | panel `NotifError`                         |
| ERR-03 | NotifError | Body: Inter **12.5px**, `var(--fg-muted)`, text = `NOTIF_COPY.errorBody`                                                                                                                                | panel `NotifError`                         |
| ERR-04 | NotifError | Retry button: `margin-top: 4px`, padding **8px 16px**, `border-radius: 8px`, `background: var(--surface-2)`, `border: 1px solid var(--border-strong)`, Inter **12.5px** weight **700**, `var(--signal)` | panel `NotifError`                         |
| ERR-05 | NotifError | Retry label = `NOTIF_COPY.errorAction`; fires `onRetry`                                                                                                                                                 | panel `NotifError`                         |
| ERR-06 | NotifError | No icon or illustration in the error state                                                                                                                                                              | panel `NotifError`                         |
| ERR-07 | NotifError | Retry height ≈31–34px — deliberately not raised to 44px                                                                                                                                                 | README A11y Targets, READINESS open item 1 |

### NotifHeader

| ID      | Component   | Requirement                                                                                                                                                                | Source              |
| ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| HEAD-01 | NotifHeader | Flex row, `align-items: center`, `gap: 10px`, padding **12px 12px 11px 14px**                                                                                              | panel `NotifHeader` |
| HEAD-02 | NotifHeader | `border-bottom: 1px solid var(--border)`, `background: var(--bg-elevated)`, `flex-shrink: 0`                                                                               | panel `NotifHeader` |
| HEAD-03 | NotifHeader | Title block is a column, `gap: 3px`, `flex: 1`, `min-width: 0`                                                                                                             | panel `NotifHeader` |
| HEAD-04 | NotifHeader | Title: Inter **14.5px**, weight **800**, `var(--fg)`, `letter-spacing: -0.02em`, text = `NOTIF_COPY.panelTitle`                                                            | panel `NotifHeader` |
| HEAD-05 | NotifHeader | Sub-line is `NMono`; colour `var(--signal)` when `count` is truthy, `var(--fg-muted)` when zero                                                                            | panel `NotifHeader` |
| HEAD-06 | NotifHeader | Sub-line text = `NOTIF_COPY.panelSub(count)` when count > 0, else `NOTIF_COPY.markedAll`                                                                                   | panel `NotifHeader` |
| HEAD-07 | NotifHeader | "Mark all read" button renders **only when `count > 0`**                                                                                                                   | panel `NotifHeader` |
| HEAD-08 | NotifHeader | Mark-all button: padding **7px 10px**, `border-radius: 7px`, Inter **12px**, weight **700**, colour `var(--signal)`, `border: 1px solid var(--border)`, no background fill | panel `NotifHeader` |
| HEAD-09 | NotifHeader | Mark-all height ≈31px — deliberately not raised to 44px                                                                                                                    | README A11y Targets |
| HEAD-10 | NotifHeader | Close button renders only when `showClose`; **44×44px**, `border-radius: 10px`, centred, colour `var(--fg-muted)`, `flex-shrink: 0`                                        | panel `NotifHeader` |
| HEAD-11 | NotifHeader | Close button `aria-label` = `NOTIF_COPY.closeLabel`; glyph is an 11×11 X, `stroke-width: 1.6`, round caps                                                                  | panel `NotifHeader` |

### NotifBody

| ID      | Component | Requirement                                                                                                                                                                                                                                                  | Source                                     |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| BODY-01 | NotifBody | Renders `NotifHeader` first, then a scroll region — header is outside the scroll                                                                                                                                                                             | panel `NotifBody`                          |
| BODY-02 | NotifBody | Header `count` is `unreadCount(items)` **only when `state === "ready"`**, otherwise `0` (so loading/error show "All caught up." and no mark-all)                                                                                                             | panel `NotifBody`                          |
| BODY-03 | NotifBody | Scroll region: `class="notif-scroll"`, `flex: 1`, `min-height: 0`, `maxHeight` from prop, `background: var(--bg-elevated)`                                                                                                                                   | panel `NotifBody`                          |
| BODY-04 | NotifBody | `.notif-scroll` → `overflow-y: auto`, `scrollbar-width: thin`                                                                                                                                                                                                | panel keyframe block                       |
| BODY-05 | NotifBody | Exactly one of: `state==="loading"` → `NotifLoading`; `state==="error"` → `NotifError`; `state==="ready" && items.length===0` → `NotifEmpty`; `state==="ready" && items.length>0` → the list                                                                 | panel `NotifBody`                          |
| BODY-06 | NotifBody | Default `state` is `"ready"`; default `grouped` is `true`; default `hasMore` is `false`                                                                                                                                                                      | panel `NotifBody` signature                |
| BODY-07 | NotifBody | List container is `role="list"` with `aria-label={NOTIF_COPY.panelTitle}`                                                                                                                                                                                    | panel `NotifBody`                          |
| BODY-08 | NotifBody | Each day group wraps in `role="presentation"`; each row wraps in a `role="listitem"` div containing `NotifItem`                                                                                                                                              | panel `NotifBody`                          |
| BODY-09 | NotifBody | Day divider renders only when the group has a key (i.e. `grouped` is true)                                                                                                                                                                                   | panel `NotifBody`                          |
| BODY-10 | NotifBody | When `grouped` is false, the whole list is a single group with `key: null` and no dividers                                                                                                                                                                   | panel `NotifBody`                          |
| BODY-11 | NotifBody | Footer block: padding **12px 14px 16px**, flex, `justify-content: center` — rendered only inside the non-empty ready branch                                                                                                                                  | panel `NotifBody`                          |
| BODY-12 | NotifBody | `hasMore` true → full-width button, padding **9px 0**, `border-radius: 8px`, `background: var(--surface-1)`, `border: 1px solid var(--border-strong)`, Inter **12.5px** weight **700**, `var(--signal)`, `text-align: center`, label = `NOTIF_COPY.loadMore` | panel `NotifBody`                          |
| BODY-13 | NotifBody | `hasMore` false → `NMono` with `ls="0.1em"` reading `NOTIF_COPY.endOfList`                                                                                                                                                                                   | panel `NotifBody`                          |
| BODY-14 | NotifBody | Load-more button height ≈36px — deliberately not raised to 44px                                                                                                                                                                                              | README A11y Targets                        |
| BODY-15 | NotifBody | `NotifError` in `NotifBody` is rendered **without** an `onRetry` prop in the mock; a real build must wire retry                                                                                                                                              | panel `NotifBody`                          |
| BODY-16 | NotifBody | `NotifEmpty` in `NotifBody` is rendered **without** an `onAction` prop in the mock; a real build must wire the CTA                                                                                                                                           | panel `NotifBody`                          |
| BODY-17 | NotifBody | Page size for the paginated fetch is **20** (confirmed as staying 20 by Hugh)                                                                                                                                                                                | README Backfill, READINESS Path to build 1 |
| BODY-18 | NotifBody | No virtualization — plain rendering plus a load-more button                                                                                                                                                                                                  | README Backfill                            |

### NotifDropdown (desktop shell)

| ID      | Component     | Requirement                                                                                                                         | Source                |
| ------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| DROP-01 | NotifDropdown | Default `width: 380px`, default `maxHeight: 520px`                                                                                  | panel `NotifDropdown` |
| DROP-02 | NotifDropdown | `role="dialog"` with `aria-label={NOTIF_COPY.panelTitle}`                                                                           | panel `NotifDropdown` |
| DROP-03 | NotifDropdown | `background: var(--bg-elevated)`, `border: 1px solid var(--border-strong)`, `border-radius: 14px`                                   | panel `NotifDropdown` |
| DROP-04 | NotifDropdown | Shadow: `0 24px 64px var(--shadow, rgba(0,0,0,0.45)), 0 4px 12px var(--shadow-soft, rgba(0,0,0,0.2))` — token with an rgba fallback | panel `NotifDropdown` |
| DROP-05 | NotifDropdown | `overflow: hidden`, column flex, `font-family: Inter, system-ui`                                                                    | panel `NotifDropdown` |
| DROP-06 | NotifDropdown | Passes `showClose` to `NotifBody`                                                                                                   | panel `NotifDropdown` |
| DROP-07 | NotifDropdown | `--shadow` / `--shadow-soft` do not exist in production themes; fallbacks apply unless eng adds them                                | READINESS open item 2 |

### NotifSheet (mobile shell)

| ID       | Component  | Requirement                                                                                   | Source                                   |
| -------- | ---------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| SHEET-01 | NotifSheet | Default `height: "88%"`, `width: 100%`                                                        | panel `NotifSheet`, README Panel anatomy |
| SHEET-02 | NotifSheet | `role="dialog"` with `aria-label={NOTIF_COPY.panelTitle}`                                     | panel `NotifSheet`                       |
| SHEET-03 | NotifSheet | `border-top-left-radius: 22px`, `border-top-right-radius: 22px`                               | panel `NotifSheet`                       |
| SHEET-04 | NotifSheet | `border: 1px solid var(--border)` with `border-bottom: none`                                  | panel `NotifSheet`                       |
| SHEET-05 | NotifSheet | Shadow `0 -16px 48px var(--shadow, rgba(0,0,0,0.45))`                                         | panel `NotifSheet`                       |
| SHEET-06 | NotifSheet | Drag-handle strip: **18px** tall, `flex-shrink: 0`, `background: var(--bg-elevated)`, centred | panel `NotifSheet`                       |
| SHEET-07 | NotifSheet | Handle bar itself: **36×4px**, `border-radius: 2px`, `background: var(--border-strong)`       | panel `NotifSheet`                       |
| SHEET-08 | NotifSheet | `overflow: hidden`, column flex, `font-family: Inter, system-ui`                              | panel `NotifSheet`                       |
| SHEET-09 | NotifSheet | Passes `showClose` to `NotifBody`                                                             | panel `NotifSheet`                       |
| SHEET-10 | NotifSheet | **`aria-modal` is intentionally NOT set** — see A11Y-09                                       | panel comment above `NotifSheet`, README |

---

## 3. CATEGORY_MAP — the exact eight plus fallback

Keys are dot-namespaced and must match `packages/push/src/notification-categories.ts` character for character.

| Key                                | `label`       | `ink`             | `glyph`      | `verb` (used in the accessible name) |
| ---------------------------------- | ------------- | ----------------- | ------------ | ------------------------------------ |
| `watch.cancelled`                  | `Cancelled`   | `var(--danger)`   | `cancelled`  | `Show cancelled`                     |
| `watch.postponed`                  | `Moved`       | `var(--warning)`  | `postponed`  | `Show moved`                         |
| `watch.soldout`                    | `Sold out`    | `var(--warning)`  | `soldout`    | `Show sold out`                      |
| `watch.backonsale`                 | `Back on`     | `var(--success)`  | `backonsale` | `Tickets back on sale`               |
| `watch.pricedrop`                  | `Price drop`  | `var(--success)`  | `pricedrop`  | `Price drop`                         |
| `contest.resolved`                 | `Price check` | `var(--fg-muted)` | `resolved`   | `Price check result`                 |
| `contest.needs_info`               | `Needs you`   | `var(--signal)`   | `needsinfo`  | `Price check needs you`              |
| `spotify.new_show`                 | `Spotify`     | `var(--accent)`   | `spotify`    | `New Denver date`                    |
| **fallback** (`CATEGORY_FALLBACK`) | `Update`      | `var(--fg-muted)` | `bell`       | `Update`                             |

Rules attached to this table:

| ID     | Requirement                                                                                                                                                                                 | Source                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| CAT-01 | `catOf(category)` returns `CATEGORY_MAP[category]                                                                                                                                           |                             | CATEGORY_FALLBACK` — an unknown category renders a neutral bell row, never a blank tile | data `catOf` |
| CAT-02 | Ink encodes **valence**, glyph encodes **event**. Do not re-assign one ink per category                                                                                                     | data comment, README        |
| CAT-03 | `watch.*` stays split into five entries across three inks — do not collapse to one "Watching" class                                                                                         | data comment, README        |
| CAT-04 | `contest.resolved` stays neutral (`--fg-muted`) per the Phase 8.5 neutrality lock; `contest.needs_info` deliberately diverges to `--signal`                                                 | data comment, README        |
| CAT-05 | Glyph set (`GLYPH`) keys: `pricedrop`, `cancelled`, `postponed`, `soldout`, `backonsale`, `resolved`, `needsinfo`, `spotify`, `bell` — 16×16 viewBox, `fill="none"`, `currentColor` strokes | data `GLYPH`, `NGlyph`      |
| CAT-06 | `spotify.new_show`'s glyph is a signal-arc mark, **not** the Spotify logo — no brand mark                                                                                                   | data comment, README gap 11 |
| CAT-07 | `contest.resolved`'s glyph is a balance scale, deliberately not a ticket                                                                                                                    | data comment                |
| CAT-08 | `CATEGORY_KEYS = Object.keys(CATEGORY_MAP)` — order is the table order above                                                                                                                | data                        |

---

## 4. Copy keys — `NOTIF_COPY`, exact strings

| Key              | Value                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| `bellLabel`      | function of `n`: `n > 0` → `` `Notifications, ${n} unread` `` ; else `"Notifications"` |
| `pipLabel`       | `"You've got unread notifications"`                                                    |
| `panelTitle`     | `"What you missed"`                                                                    |
| `panelSub`       | function of `n`: `n === 1` → `"1 new"` ; else `` `${n} new` ``                         |
| `markAll`        | `"Mark all read"`                                                                      |
| `markedAll`      | `"All caught up."`                                                                     |
| `seeAll`         | function of `n`: `n > 1` → `` `See all ${n}` `` ; else `"See it"`                      |
| `menuRow`        | `"Notifications"`                                                                      |
| `menuBack`       | `"Menu"`                                                                               |
| `closeLabel`     | `"Close notifications"`                                                                |
| `loadMore`       | `"Older notifications"`                                                                |
| `loading`        | `"Checking what you missed…"` (ellipsis is U+2026, one character)                      |
| `loadingVisible` | `"Catching up…"`                                                                       |
| `slowRetry`      | `"Still loading. Try again?"`                                                          |
| `error`          | `"Couldn't reach the crawl."`                                                          |
| `errorBody`      | `"Poll failed. Nothing's lost — it's all still on the server."` (em dash)              |
| `errorAction`    | `"Retry"`                                                                              |
| `emptyTitle`     | `"All quiet."`                                                                         |
| `emptyBody`      | `"Nothing's dropped, moved, or sold out on you yet. We'll make noise when it does."`   |
| `emptyHint`      | `"Watch a show and this fills up fast."`                                               |
| `emptyAction`    | `"Find something to watch"`                                                            |
| `endOfList`      | `"That's everything. Denver's been calm."`                                             |
| `today`          | `"Today"`                                                                              |
| `yesterday`      | `"Yesterday"`                                                                          |
| `unreadTag`      | `"New"`                                                                                |
| `segments`       | object: `{ shows: "Shows", alerts: "Alerts", prices: "Prices" }`                       |

| ID      | Requirement                                                                                                                                                                                                                                                          | Source                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| COPY-01 | All of the above lift into `apps/web/src/components/consumer/definitions/copy.ts`; no customer-facing string is inlined in a component                                                                                                                               | data comment, README Voice                               |
| COPY-02 | `NOTIF_COPY` owns **panel chrome only**. Per-row `title` / `body` come from the backend writers (`packages/push/src/definitions/copy.ts`, `apps/api/src/lib/contest-notifications.ts`) — never from the mock fixtures                                                | data ⚠ header, README gap 3/4, READINESS Path to build 4 |
| COPY-03 | `loadingVisible`, `slowRetry`, `unreadTag`, `segments`, `pipLabel`, `bellLabel`, `seeAll`, `menuRow`, `menuBack` exist in the key set but are **not consumed by the panel body** — `loadingVisible`, `slowRetry` and `unreadTag` are consumed nowhere in either file | data + panel + chrome                                    |
| COPY-04 | Grep-clean of "last chance", "we miss you", "fraud", "users", "event"                                                                                                                                                                                                | README Voice                                             |

---

## 5. Accessibility requirements (panel body)

| ID      | Requirement                                                                                                                                                                      | Source                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A11Y-01 | Every row exposes a single accessible name via `itemLabel(n)`; display and speech come from one function so they cannot drift                                                    | data `itemLabel`, panel `NotifItem`                             |
| A11Y-02 | Rows are `role="button"` + `tabIndex={0}` and activate on **Enter and Space**                                                                                                    | panel `NotifItem`, README Keyboard                              |
| A11Y-03 | Focus ring is `2px solid var(--focus)` with `outline-offset: -2px` (inset)                                                                                                       | panel keyframes, README Keyboard                                |
| A11Y-04 | **No nested interactive elements inside a row** — the chevron is decorative                                                                                                      | panel `NotifItem`, README                                       |
| A11Y-05 | Rows have a **64px min height**; every interactive element clears WCAG 2.5.8 (24×24) with margin                                                                                 | panel, README Targets                                           |
| A11Y-06 | Row targets and the panel close button are raised to the **44px AAA** target                                                                                                     | panel `NotifHeader` close (44×44), README Targets               |
| A11Y-07 | Deliberately **not** raised to 44px: "Mark all read" (~31px), "Older notifications" (~36px), "Retry" (~34px), empty-state CTA (~36px). Do not "fix" these without a product call | README Targets, READINESS open item 1                           |
| A11Y-08 | **No text renders in `var(--fg-subtle)` or in a category ink.** Both are 3:1-class tokens. Category colour lives only on the tile glyph, the 2px rail, and the unread dot        | panel contrast comment, README Level AA                         |
| A11Y-09 | **`aria-modal` was REMOVED in R2 and must not be re-added** unless a real focus trap ships with it — asserting a trap that doesn't exist is worse than omitting the attribute    | panel comment above `NotifSheet`, README Keyboard, R2 changelog |
| A11Y-10 | Panel shells are `role="dialog"` with `aria-label={NOTIF_COPY.panelTitle}`                                                                                                       | panel `NotifDropdown` / `NotifSheet`                            |
| A11Y-11 | Loading is `role="status"` + `aria-busy="true"` + `aria-live="polite"` with a visually-hidden `NOTIF_COPY.loading` announcement                                                  | panel `NotifLoading`, README Live regions                       |
| A11Y-12 | Skeleton rows and the skeleton container's visual content are `aria-hidden="true"`                                                                                               | panel `NotifSkeletonRow`                                        |
| A11Y-13 | Poll failure is `role="alert"`                                                                                                                                                   | panel `NotifError`, README Live regions                         |
| A11Y-14 | List semantics: `role="list"` with `aria-label`, `role="listitem"` per row, `role="presentation"` on group wrappers and the day divider                                          | panel `NotifBody`, `NotifDayDivider`                            |
| A11Y-15 | Tile, unread dot, chevron, empty-state bell chip, close-button SVG and all glyphs are `aria-hidden="true"`                                                                       | panel throughout                                                |
| A11Y-16 | 1.4.1 not-colour-alone: unread carries rail + fill + weight + dot; category carries glyph + a spelled-out mono label                                                             | README A11y                                                     |
| A11Y-17 | `prefers-reduced-motion: reduce` disables the shimmer animation and substitutes a flat `var(--surface-2)` fill                                                                   | panel keyframes, README Loading                                 |
| A11Y-18 | Escape handling, focus-in-on-open, focus-restore-on-close, and the mobile sheet focus trap are **eng-owned and in scope for the build** — the design does not implement them     | README eng-plan notes, READINESS eng-owned                      |
| A11Y-19 | READINESS flags as still open, not designed: no `aria-live` on unread-count change (loading and error are announced, the resulting count is not)                                 | READINESS open item 4                                           |

---

## 6. Time / grouping helper behaviour

Reference "now" in the mock is the frozen constant `NOW = new Date("2026-07-24T20:10:00-06:00")`; production passes the real clock. `MIN = 60000`, `HOUR = 60*MIN`, `DAY = 24*HOUR`.

| ID      | Requirement                                                                                                                                                                                                                                            | Source                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| TIME-01 | `relTime(iso, now)` — `diff < 55 * MIN` → `` `${Math.max(1, Math.round(diff / MIN))}m` `` (never "0m")                                                                                                                                                 | data `relTime`                     |
| TIME-02 | `relTime` — `diff < 22 * HOUR` → `` `${Math.round(diff / HOUR)}h` ``                                                                                                                                                                                   | data `relTime`                     |
| TIME-03 | `relTime` — `diff < 7 * DAY` → `` `${Math.round(diff / DAY)}d` ``                                                                                                                                                                                      | data `relTime`                     |
| TIME-04 | `relTime` — at or beyond **7 days** it switches to absolute: `toLocaleDateString("en-US", { month: "short", day: "numeric" })` → e.g. `Jul 18`                                                                                                         | data `relTime`, README gap 8       |
| TIME-05 | The 7-day relative→absolute cutover is the stated rule but is flagged for confirmation against the retention policy                                                                                                                                    | README gap 8, READINESS question 8 |
| TIME-06 | `relTimeLong(iso, now)` is the **screen-reader form** with the same three thresholds: `"N minutes ago"`, `"N hours ago"`, `"N days ago"`, then `toLocaleDateString("en-US", { month: "long", day: "numeric" })` → e.g. `July 18`                       | data `relTimeLong`                 |
| TIME-07 | `relTimeLong` uses plural wording unconditionally — `"1 minutes ago"` is what the mock produces at 1 minute                                                                                                                                            | data `relTimeLong`                 |
| TIME-08 | `itemLabel(n)` = `` `${verb}. ${title} ${body                                                                                                                                                                                                          |                                    | ""} ${relTimeLong(at)}${read ? "" : ". Unread"}` `` then `.replace(/\s+/g, " ").trim()` | data `itemLabel` |
| TIME-09 | `dayKey` compares **calendar-day starts**, not elapsed ms: `startOf(now) - startOf(d)` divided by `DAY`, rounded                                                                                                                                       | data `dayKey`                      |
| TIME-10 | `dayKey` — `delta <= 0` → `NOTIF_COPY.today`; `delta === 1` → `NOTIF_COPY.yesterday`; otherwise `toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })` → e.g. `Sat, Jul 19`                                               | data `dayKey`                      |
| TIME-11 | Future-dated rows (`delta < 0`) fall into "Today" because the guard is `<= 0`                                                                                                                                                                          | data `dayKey`                      |
| TIME-12 | `groupByDay` walks items **in the order given** and starts a new group only when the key differs from the previous group's key. It does **not** sort, and it does not merge non-adjacent same-day runs — unsorted input produces duplicate day headers | data `groupByDay`                  |
| TIME-13 | **Stated edge case:** grouping starts at "Today" only when there _is_ a today row — a stale panel opens on e.g. `Thu, Jul 20` rather than an empty Today header                                                                                        | README "Also worth knowing"        |
| TIME-14 | Dividers are sticky, so at production row heights (~92–116px) the divider rhythm is looser than R1 assumed; page size 20 is ~1.6 screens at 390px                                                                                                      | panel R2 comment, README gap 7     |
| TIME-15 | Backfill is chronological — unread floats to the top naturally because it is newest. Do **not** add a separate "Unread" section                                                                                                                        | README Backfill                    |
| TIME-16 | `unreadCount(items)` = count of items where `!n.read`                                                                                                                                                                                                  | data                               |

---

## 7. Deferred to the chrome PR (out of scope now)

Recorded so nothing is lost; **do not build these in the panel-body PR.**

- `NotifPip` — 8px dot, `var(--signal)`, `border-radius` = size, 2px ring via `box-shadow` in the host bar's own background, `aria-hidden="true"`, `notifPip 2.4s ease-in-out infinite` pulse (scale 1 → 1.18, opacity 1 → .72), disabled under `prefers-reduced-motion`.
- `NotifAvatarButton` — `flat` (36px, `--surface-2`/`--border`, initials 700/13) and `halo` (`--border-strong`, radial `--accent` glow at 0.35 opacity, weight 800, font-size `size*0.42`) variants; `aria-label = bellLabel(unread)`, `aria-haspopup="dialog"`; pip positioned `top: -1, right: -1` when `unread > 0`.
- `CCAppBar`, `CCTabBar` — bottom-nav labels are `browse · search · watching · me`; `me` tab's `aria-label` extends to `` `${label}. ${pipLabel}` `` when piped; tabs are `minWidth: 56` / `minHeight: 44`; pip at `top: -2, right: -4` with `ring="var(--bg-elevated)"`.
- `InboxStrip` (Option B, recommended placement) — max 2 unread previews rendered with `NotifItem compact`, header row using `panelTitle` + a 6px static pip + `panelSub(n)`, and a `seeAll(n)` button (~38px). Zero-unread branch collapses to a bell chip + `menuRow` + `markedAll`.
- `MenuNotifRow` (Option A fallback) — 44px min-height row, bell chip, weight 800 when count > 0, `panelSub(count)` in `--signal`.
- `CCUserMenu` — the desktop menu with `mode="strip" | "row" | "panel"`; in `panel` mode it renders a `‹ Menu` back row (44px min-height, `menuBack` copy) above `NotifBody` with `panelMaxHeight = 340` and `hasMore = items.length > 6`.
- `ProfileSegments` (Option C) — segment chips at `minHeight: 34`, `segments.*` copy, static 6px pip on the alerts chip.
- `InstallSlotCC`, `OfflinePillCC`, `DesktopHeader` — lifted verbatim from existing handoffs; the only #737 change to either bar is the pip.
- `aria-expanded` on the trigger (READINESS open item 3) — a chrome-side attribute.
- Panel-open clears the pip via a `last_seen_at` write; per-item read fires on row activation. Pip and rails deliberately disagree.
- Mobile `me` becoming a menu (mounting the existing `UserMenuSheet` and deciding what `/me` routes to).
- Endpoint wiring context: `GET /v1/notifications/me` (page size 20), `POST /v1/notifications/:id/read`, `POST /v1/notifications/read-all`.

---

## 8. Ambiguities

Real gaps only — points where an implementer must guess.

1. **Chevron on focus.** README says the chevron appears on "hover/focus"; the mock CSS only defines `.notif-row:hover .notif-chev`. The handoff does not state a `:focus-visible` selector for the chevron. (See ITEM-30.)
2. **`onRetry` / `onAction` are never wired.** `NotifBody` renders `<NotifError/>` and `<NotifEmpty/>` with no handlers, so the handoff does not state what Retry re-fetches or where "Find something to watch" navigates.
3. **`onMarkAll` optimistic behaviour is unspecified.** The handoff states the endpoint fires but does not say whether rails clear immediately, whether the header flips to `markedAll` before the response, or what happens on failure.
4. **Row activation vs navigation ordering.** Rows carry `data-action-url` and README says row activation fires the per-item read, but the handoff does not state whether navigation waits on the read POST, nor what happens when `actionUrl` is missing.
5. **`loadingVisible`, `slowRetry`, `unreadTag` have no render site.** All three are in `NOTIF_COPY` and consumed nowhere. The handoff does not state when `slowRetry` replaces the skeleton (no slow-poll threshold is given), where `loadingVisible` would be visible rather than hidden, or on what element `unreadTag` ("New") would appear.
6. **`emptyHint` is unused.** It exists in copy but `NotifEmpty` renders only title, body and CTA. The handoff does not say whether it should render.
7. **The load-more button has no `onClick` in the mock,** and the handoff does not state the loading affordance while page 2 is fetching (append skeletons? spinner in the button? nothing?).
8. **Scroll-region `maxHeight` on mobile.** `NotifSheet` passes no `maxHeight`; the sheet's own 88% height plus `flex: 1` is assumed to bound it. The handoff does not state a mobile `maxHeight`.
9. **Sticky-divider stacking with the header.** Dividers are `top: 0` inside the scroll container with `z-index: 2`; the handoff does not state a z-index for the header, so relative stacking during scroll is unspecified.
10. **`--shadow` / `--shadow-soft` do not exist in production themes.** READINESS flags this as an eng decision (add the tokens or accept the flat rgba fallback); the handoff does not decide it.
11. **Empty vs zero-after-mark-all.** The handoff does not distinguish "no notifications at all" from "all read" in the body — `NotifEmpty` only appears at `items.length === 0`, and an all-read non-empty list just shows rows with no rails. Whether that is intended as the all-read design is implied but not stated.
12. **Fixture row strings are modeled, not lifted** for `watch.cancelled`, `watch.postponed`, `watch.pricedrop`, `spotify.new_show`. The handoff explicitly says to build titles/bodies from the shipped writers instead — so the exact production copy is out of the design's hands, not an ambiguity in the design, but it does mean row copy cannot be verified against this document.
