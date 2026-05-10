# Admin Sidebar Polish — Design Spec

**Issue:** #139
**Branch:** `fix/admin-sidebar-polish`
**Date:** 2026-05-10
**Phase:** pre-beta

---

## Overview

Four targeted fixes to bring the admin sidebar into alignment with the design spec. The Inbox sidebar row (issue #139 item 5) is explicitly deferred to issue #111 (beta deliverable).

---

## Scope

| # | Item | File(s) |
|---|------|---------|
| 1 | Badge contrast on "Event review" | `admin.css` |
| 2 | Logo centralization + AdminSidebar fix | `CCMark.tsx`, `AppHeader.tsx`, `AdminSidebar.tsx` |
| 3 | Invite Codes icon: `Ticket` → `Key` | `nav.ts` |
| 4 | Missing "OPERATIONS" section label | `AdminSidebar.tsx` |

---

## 1. Badge Contrast

**Problem:** The `--warning` CSS token in `admin.css` is `#ffd27a` for the Electric and Jade themes — a bright yellow that fails white-text contrast. The light and dark themes use darker amber values that work fine.

**Fix:** Darken `--warning` in Electric and Jade to `#c97920` (burnt amber). This is dark enough for white text (contrast ratio > 4.5:1) and matches the design spec's "darker amber/burnt-orange" intent. No component code changes required — all badge rendering already uses `var(--warning)`.

---

## 2. Logo Centralization

**Problem:** `CCMark` (the canonical logomark SVG) lives in `components/consumer/cc-mark/` — a consumer-scoped directory. The AdminSidebar has its own divergent inline SVG. Both `CCMark` and `CCWordmark` should live together under `components/brand/`.

**Fix:**
1. Move `CCMark.tsx` from `components/consumer/cc-mark/` → `components/brand/cc-mark/`.
2. Update the one existing import in `AppHeader.tsx` to the new path.
3. Replace the AdminSidebar's inline SVG + inline wordmark text with `<CCMark>` and `<CCWordmark>` from `components/brand/`.

`CCMark` already uses CSS token colors (`var(--bg)`, `var(--accent)`, `var(--signal)`), so it renders correctly in both consumer and admin themes.

---

## 3. Invite Codes Icon

**Problem:** `nav.ts` sets `iconName: 'Ticket'` for the Invite Codes nav item. Design spec uses a key icon.

**Fix:** Change `iconName` to `'Key'` (Lucide `Key` icon). One-line change in `nav.ts`.

---

## 4. "OPERATIONS" Section Label

**Problem:** The AdminSidebar renders an "Account" section label when crossing into the `account` section, but renders nothing when crossing into the `operations` section. The design shows an "OPERATIONS" label above Dashboard/Venues/Crawl/etc.

**Fix:** Extend the section label rendering logic in `AdminSidebar.tsx` to also render an "OPERATIONS" label when the first item in the `operations` section is encountered. It uses the same style as the "Account" label (10px, uppercase, `var(--fg-subtle)`). No divider above it — it sits at the very top of the nav list.

---

## Out of Scope

- **Inbox sidebar row** — deferred to issue #111 (beta deliverable).
- The `CCWordmark` component itself is unchanged; it already lives in `components/brand/` and is correct.
