# Event + Venue Page Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four layout issues across the event detail and venue pages: remove overlapping desktop breadcrumbs (replaced by the existing back button), move the venue chevron inline with the venue name, and add max-width + responsive padding to the venue page.

**Architecture:** All changes are pure JSX/Tailwind edits across two page files. No new components, no API changes, no new files. `InfoRow` (event detail) gets its chevron moved from trailing to inline. The venue page content gets a centered max-width wrapper matching EventDetail's pattern.

**Tech Stack:** Next.js 14 App Router (RSC), Tailwind CSS, TypeScript

**Worktree:** `.worktrees/polish/issues-387-390`
**Branch:** `polish/issues-387-390`

---

## Files Modified

| File | What changes |
|------|-------------|
| `apps/web/src/app/(protected)/events/[id]/page.tsx` | Remove desktop breadcrumb (lines 132–162); remove `sm:hidden` from back button (line 113); move InfoRow chevron inline |
| `apps/web/src/app/(protected)/venues/[slug]/page.tsx` | Remove desktop breadcrumb (lines 99–129); remove `sm:hidden` from back button (line 80); add `max-w-[880px] mx-auto` inner content wrapper; add `sm:px-8` padding |

---

## Task 1: EventDetail — remove desktop breadcrumb, extend back button to desktop

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx:110–162`

- [ ] **Step 1: Remove `sm:hidden` from the back button**

  In `apps/web/src/app/(protected)/events/[id]/page.tsx`, find the back button `<Link>` at line 110. Change:
  ```tsx
  className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:hidden"
  ```
  To:
  ```tsx
  className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
  ```

- [ ] **Step 2: Delete the desktop breadcrumb block**

  Delete the entire comment + div from line 132 to line 163 (inclusive):
  ```tsx
  {/* Desktop: breadcrumb over hero */}
  <div className="absolute bottom-4 left-6 hidden items-center gap-1.5 text-[13px] sm:flex">
    <Link
      href="/events"
      className="flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M11 4L5 8l6 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Browse
    </Link>
    <span
      className="text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
    >
      /
    </span>
    <span className="font-medium text-fg">{event.artist}</span>
  </div>
  ```

- [ ] **Step 3: Verify types and lint**

  ```bash
  cd .worktrees/polish/issues-387-390 && pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  cd .worktrees/polish/issues-387-390
  git add apps/web/src/app/\(protected\)/events/\[id\]/page.tsx
  git commit -m "fix(event-detail): remove desktop breadcrumb, show back button on all breakpoints"
  ```

---

## Task 2: Venue page — remove desktop breadcrumb, extend back button, add max-width

**Files:**
- Modify: `apps/web/src/app/(protected)/venues/[slug]/page.tsx:77–246`

- [ ] **Step 1: Remove `sm:hidden` from the back button**

  In `apps/web/src/app/(protected)/venues/[slug]/page.tsx`, find the back button `<Link>` at line 77. Change:
  ```tsx
  className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full sm:hidden"
  ```
  To:
  ```tsx
  className="absolute left-3.5 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full"
  ```

- [ ] **Step 2: Delete the desktop breadcrumb block**

  Delete the entire comment + div from line 99 to line 130 (inclusive):
  ```tsx
  {/* Desktop: breadcrumb */}
  <div className="absolute bottom-4 left-6 hidden items-center gap-1.5 text-[13px] sm:flex">
    <Link
      href="/events"
      className="flex items-center gap-1.5 text-fg-muted transition-colors hover:text-fg"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M11 4L5 8l6 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Browse
    </Link>
    <span
      className="text-fg-subtle"
      style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
    >
      /
    </span>
    <span className="font-medium text-fg">{venue.name}</span>
  </div>
  ```

- [ ] **Step 3: Add max-width wrapper and responsive padding to content section**

  Find the content section opening at line 132:
  ```tsx
  {/* Content */}
  <div className="relative -mt-5 flex-1 px-[18px] pb-10">
    {/* Venue name */}
    <h1
  ```

  Replace with:
  ```tsx
  {/* Content */}
  <div className="relative -mt-5 flex-1 pb-10">
    <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">
    {/* Venue name */}
    <h1
  ```

  Then close the new inner `<div>` before the outer `</div>` at the end of the content section. The outer closing `</div>` is at line 245. The structure becomes:
  ```tsx
  {/* Content */}
  <div className="relative -mt-5 flex-1 pb-10">
    <div className="mx-auto w-full max-w-[880px] px-[18px] sm:px-8">
      {/* Venue name */}
      <h1>...</h1>

      {/* City + Directions */}
      ...

      {/* Stats row */}
      ...

      {/* Upcoming shows */}
      ...

      {/* Map placeholder */}
      ...
    </div>  {/* closes max-width wrapper */}
  </div>    {/* closes content */}
  ```

- [ ] **Step 4: Verify types and lint**

  ```bash
  cd .worktrees/polish/issues-387-390 && pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  cd .worktrees/polish/issues-387-390
  git add apps/web/src/app/\(protected\)/venues/\[slug\]/page.tsx
  git commit -m "fix(venue): remove desktop breadcrumb, extend back button, add max-width and responsive padding"
  ```

---

## Task 3: EventDetail InfoRow — move venue chevron inline with value

**Files:**
- Modify: `apps/web/src/app/(protected)/events/[id]/page.tsx:514–553`

- [ ] **Step 1: Move the chevron SVG inside the value `<p>` tag**

  Find the `InfoRow` `inner` variable (around line 514). The current structure is:
  ```tsx
  const inner = (
    <>
      <div className="h-4 w-4 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p
          className="uppercase text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </p>
        <p
          className="mt-[1px] text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {value}
        </p>
      </div>
      {href && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-fg-subtle"
          aria-hidden
        >
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </>
  )
  ```

  Replace with:
  ```tsx
  const inner = (
    <>
      <div className="h-4 w-4 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p
          className="uppercase text-fg-subtle"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.06em',
          }}
        >
          {label}
        </p>
        <p
          className="mt-[1px] text-[14px] font-semibold tracking-[-0.01em]"
          style={{ color: signal ? 'var(--signal)' : 'var(--fg)' }}
        >
          {href ? (
            <span className="inline-flex items-center gap-0.5">
              {value}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0 text-fg-subtle"
                aria-hidden
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          ) : (
            value
          )}
        </p>
      </div>
    </>
  )
  ```

- [ ] **Step 2: Verify types and lint**

  ```bash
  cd .worktrees/polish/issues-387-390 && pnpm --filter @concert-crawl/web typecheck && pnpm --filter @concert-crawl/web lint
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  cd .worktrees/polish/issues-387-390
  git add apps/web/src/app/\(protected\)/events/\[id\]/page.tsx
  git commit -m "fix(event-detail): move venue chevron inline with venue name in InfoRow"
  ```

---

## Task 4: Manual verification + PR

- [ ] **Step 1: Start the dev server**

  ```bash
  cd .worktrees/polish/issues-387-390 && pnpm dev
  ```

- [ ] **Step 2: Verify event detail page**

  Open an event at `http://localhost:3000/events/<id>`.

  Check on **mobile** (< 640px):
  - Back button visible at top-left of hero
  - No breadcrumb text in hero

  Check on **desktop** (≥ 640px):
  - Back button visible at top-left of hero (was previously hidden)
  - No breadcrumb text in hero
  - Venue row in the info block: chevron `›` appears immediately after the venue name, not at far right

- [ ] **Step 3: Verify venue page**

  Open a venue at `http://localhost:3000/venues/<slug>`.

  Check on **mobile** (< 640px):
  - Back button visible at top-left of hero
  - Content uses `px-[18px]` padding, full width

  Check on **desktop** (≥ 640px):
  - Back button visible (was previously hidden)
  - No breadcrumb text in hero
  - Content is centered at 880px max-width with `32px` side padding
  - Layout matches EventDetail page width

- [ ] **Step 4: Run full checks**

  ```bash
  cd .worktrees/polish/issues-387-390 && pnpm typecheck && pnpm lint && pnpm test
  ```
  Expected: all pass.

- [ ] **Step 5: Rebase and push**

  ```bash
  cd .worktrees/polish/issues-387-390
  git fetch origin && git rebase origin/main
  git push -u origin polish/issues-387-390
  ```

- [ ] **Step 6: Open PR**

  ```bash
  gh pr create \
    --title "fix(ui): remove breadcrumbs, inline venue chevron, venue max-width (#387, #388, #389, #390)" \
    --body "$(cat <<'EOF'
  ## What does this PR do?

  Addresses four layout polish issues across the event detail and venue pages.

  - **#387** — Removes the desktop breadcrumb from the EventDetail hero (was hard to read over the image). The existing floating back button now shows on all breakpoints instead of mobile-only.
  - **#388** — Moves the venue chevron from a far-right trailing position to inline immediately after the venue name in the EventDetail InfoRow. The whole row remains a link.
  - **#389** — Adds `max-w-[880px] mx-auto` inner wrapper to the venue page content section, matching EventDetail. Also adds `sm:px-8` responsive padding.
  - **#390** — Removes the desktop breadcrumb from the Venue hero (was overlapping IdentityArt initials). Back button now shows on all breakpoints.

  Closes #387
  Closes #388
  Closes #389
  Closes #390

  ## How to test

  1. Open an event detail page on mobile + desktop — back button visible both sizes; no breadcrumb; venue row shows `Venue Name ›` with chevron right after text
  2. Open a venue page on mobile + desktop — back button visible both sizes; no breadcrumb; content centered at 880px on desktop with 32px padding

  ## Checklist

  - [ ] Tests pass locally (`pnpm test`)
  - [ ] Types pass (`pnpm typecheck`)
  - [ ] No new lint errors (`pnpm lint`)
  - [ ] Relevant documentation updated
  EOF
  )"
  ```
