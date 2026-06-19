# Concert Crawl — Admin · Pagination component

> Open **`Pagination.html`** — the component spec: live demo, anatomy, desktop + mobile states, and integration notes. Electric theme by default; a Light toggle sits top-right.

A single reusable pager for every `/admin/review` tab — **Event Flags · Community Prices · Price Coverage · Missing · All Events**. Replaces the current "load the whole set on mount" behavior (slow on All Events, thousands of rows) with true server-side pagination. Lives inside the same `<Panel>` as the table, as its footer.

These are in-browser React prototypes (Babel-standalone) — design references, accurate about layout, hierarchy, copy, tokens, states, and the component API; not about data fetching or a11y wiring.

---

## What ships

One direction, fully stated. The component does everything Hugh asked for:

- **Total pages** + a `1–25 of 2,438` range readout (mono, tabular).
- **Flexible page size** — `25 / 50 / 100`, default `25` (customizable per surface via `pageSizeOptions` / `initialPageSize`). Drops *up*, since it sits at the panel bottom. Changing it resets to page 1.
- **Back / forward** — Prev/Next plus First/Last (`« ‹ › »`), disabled at the edges.
- **Go to a page** — numbered pages with `…` collapse; tap any to jump there.
- **Desktop ↔ mobile** — auto-collapses under ~560px (ResizeObserver) to a stacked `Prev · Page X / Y · Next` row with ≥44px targets. Works to 360px.

States on the canvas: **default · first page · last page · single page · loading · empty**, desktop and mobile.

---

## Files

| File | Exports |
|---|---|
| `Pagination.html` | The spec canvas (loads everything below) |
| `admin-pagination.jsx` | **`usePagination(total, opts)`**, **`pageWindow(current, totalPages)`**, **`<Pagination/>`** |
| `admin-primitives.jsx` | *(copy)* `AdminIcon`, `StatusBadge`, `MonoLabel`, `AdminButton`, `Panel`, `Spinner`, table primitives… |
| `theme-context.jsx` | *(copy)* `ThemeProvider`, `CC_THEMES`, `useThemeState` |

---

## API

```jsx
// 1. State hook — owns page + pageSize, hands you offset/limit for the request.
const pg = usePagination(total, { initialPage: 1, initialPageSize: 25 });
// pg → { page, pageSize, totalPages, start, end, total, offset, limit,
//        setPage, setPageSize, next, prev, first, last }

// 2. Feed offset/limit straight to the endpoint:
//    GET /v1/admin/events?limit={pg.limit}&offset={pg.offset}

// 3. Render it as the LAST child inside the table's Panel (padding={0}):
<Pagination
  page={pg.page}
  pageSize={pg.pageSize}
  total={total}                 // server total count
  pageSizeOptions={[25, 50, 100]}
  onPageChange={pg.setPage}
  onPageSizeChange={pg.setPageSize}
  loading={isFetching}          // dims controls + shows the spinner veil
  itemLabel="events"            // "No events" / readout context
/>
```

Other props: `forceCompact` (bypass the ResizeObserver — used for the mobile artboards), `threshold` (compact breakpoint, default 560), `showSizeSelector`.

`pageWindow(current, totalPages)` returns the button sequence, e.g. `[1, '…', 4, 5, 6, '…', 49]` — first + last always present, current ±1 in the middle.

---

## Behavior contract

- **Server-side, always.** The pager owns `page` + `pageSize` only; everything else derives. Each tab fetches just its current page on mount. Page/size change → one re-fetch.
- **Placement.** Last child inside `<Panel padding={0}>`, `--border` top rule, `--surface-1` ground so it reads as the card's footer. Identical on all five tabs.
- **Size change resets to page 1.** You can't sit on page 40 of a freshly-resized set.
- **Edges & single page.** First/Prev disable on page 1; Next/Last on the final page. One page → arrows + numbers inert, size selector stays.
- **Loading.** Controls lock (`pointer-events: none`, dimmed); a spinner veil sits over the table; the readout keeps its last value to avoid layout jump.
- **Event Flags** (split list + inspector, not a plain table): the pager drives the **left list**; selecting a row loads it into the inspector; paging clamps the selection to the new page's first row.
- **Selection across pages.** Bulk-select is keyed by row **id**, not index, so selections survive paging and size changes; the bulk dock shows the running count.
- **Compact under ~560px.** A `ResizeObserver` swaps to a stacked layout: range + size on top, a 44px `Prev · Page X / Y · Next` row below. All hit targets ≥ 44px; works to 360px.
- **Accessibility.** `nav[aria-label="Pagination"]`; active page `aria-current="page"`; labelled arrows (First/Previous/Next/Last); focus rings inherit `--focus`.

---

## Tokens / type

Consumer token system via `var(--*)` — `--signal` for the active page + CTAs, `--surface-1` footer ground, `--border` rules. Inter for labels, **JetBrains Mono** (tabular) for all numbers and the small-caps `rows` label. No raw hex. Theme-agnostic — inherits whatever `ThemeProvider` wraps it (Electric default; Light verified via the toggle).

---

## Open items

- **Page-size default** is set to `25` (within the 20–50 sweet spot). Each surface can override via `initialPageSize` / `pageSizeOptions`.
- **URL sync** — production should mirror `page`/`pageSize` into the query string so a paged view is shareable/back-button-able. Hook supports it (lift `page`/`pageSize` to the router); not wired in the prototype.
