# Event Detail + Venue Page Layout Polish

**Issues:** #387, #388, #389, #390
**Branch:** `polish/issues-387-390`
**Date:** 2026-05-19

---

## Problem

Four related layout issues on the event detail and venue pages:

1. **#387** — Desktop breadcrumb on EventDetail overlaps the hero image and is hard to read against it.
2. **#388** — On EventDetail, the venue chevron renders as a far-right trailing icon in the InfoRow rather than inline next to the venue name.
3. **#389** — Venue page content has no max-width constraint; EventDetail uses `max-w-[880px]`.
4. **#390** — Desktop breadcrumb on Venue page overlaps IdentityArt initials (both sit bottom-left).

---

## Design

### #387 + #390 — Remove desktop breadcrumbs; extend back button to all breakpoints

**Both pages** (`events/[id]/page.tsx`, `venues/[slug]/page.tsx`):

- Delete the desktop breadcrumb `<div>` entirely (the `absolute bottom-4 left-6 hidden ... sm:flex` block).
- On the existing floating back button, remove `sm:hidden` so it renders on all screen sizes. Position and styling stay the same (`absolute left-3.5 top-14 z-10`, scrim background, chevron SVG). Both mobile and desktop get the same circular back button floating over the hero.

No replacement breadcrumb. The site has no deeply nested routes — the back button is sufficient.

### #388 — Venue chevron inline with venue name (EventDetail InfoRow)

In the `InfoRow` component inside `events/[id]/page.tsx`:

- Remove the trailing chevron `<svg>` from after the content `<div>`.
- In the value `<p>` (the venue name line), wrap text and chevron in an `inline-flex items-center gap-0.5` span: `<span className="inline-flex items-center gap-0.5">{value} <ChevronSvg /></span>`.
- The entire row remains a `<Link>` — no change to click target.

The chevron should be the same size and color as the current trailing one (`shrink-0 text-fg-subtle`), just repositioned to sit immediately after the text.

### #389 + Venue page responsiveness

In `venues/[slug]/page.tsx`, the content wrapper currently has:
```
className="relative -mt-5 flex-1 px-[18px] pb-10"
```

Change to:
```
className="relative -mt-5 flex-1 px-[18px] pb-10 sm:px-8"
```

And wrap the inner content (everything inside the content div) with a centered max-width container:
```
<div className="mx-auto max-w-[880px]">
  {/* venue name, city/directions, stats, shows, map */}
</div>
```

This matches EventDetail's `max-w-[880px] mx-auto px-[18px] sm:px-8` pattern exactly. The hero remains full-width (no change to the hero `<div>`).

---

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/app/(protected)/events/[id]/page.tsx` | Delete desktop breadcrumb div; remove `sm:hidden` from back button; move InfoRow chevron inline |
| `apps/web/src/app/(protected)/venues/[slug]/page.tsx` | Delete desktop breadcrumb div; remove `sm:hidden` from back button; add `max-w-[880px] mx-auto` inner wrapper; add `sm:px-8` to content padding |

---

## Testing

- **Mobile (< 640px):** back button visible on both pages; venue content full-width with `px-[18px]`
- **Desktop (≥ 640px):** back button visible (no breadcrumb); venue content centered at 880px with `sm:px-8`; InfoRow venue chevron inline after name
- **EventDetail InfoRow:** whole row is still a link; chevron appears directly after venue name text, not trailing right
- **No regression** on EventDetail max-width (already 880px, untouched)
