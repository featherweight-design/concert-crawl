# PWA Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a valid Web App Manifest so Concert Crawl can be installed as a PWA on mobile devices.

**Architecture:** Three new files following Next.js App Router conventions. `manifest.ts` is served automatically at `/manifest.webmanifest`. Two API route handlers generate 192×192 and 512×512 PNG icons via `ImageResponse` — same pattern as the existing `apple-icon.tsx`. No changes to `layout.tsx` (manifest reference and themeColor already declared).

**Tech Stack:** Next.js 14 App Router, `next/og` ImageResponse, TypeScript

---

### Task 1: Commit the spec doc

**Files:**

- Commit: `docs/superpowers/specs/2026-05-25-pwa-manifest-design.md`

- [ ] **Step 1: Stage and commit the spec**

```bash
git add docs/superpowers/specs/2026-05-25-pwa-manifest-design.md
git commit -m "docs: add PWA manifest design spec"
```

---

### Task 2: Create the Web App Manifest

**Files:**

- Create: `apps/web/src/app/manifest.ts`

The manifest file uses Next.js's built-in `MetadataRoute.Manifest` type and is automatically served at `/manifest.webmanifest` by the App Router — no additional config needed.

- [ ] **Step 1: Create `apps/web/src/app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Concert Crawl',
    short_name: 'Concert Crawl',
    description:
      'Denver concert calendar — find shows at your favorite venues.',
    start_url: '/',
    display: 'standalone',
    background_color: '#070A1A',
    theme_color: '#070A1A',
    icons: [
      {
        src: '/api/pwa/icon-192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/pwa/icon-512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
```

- [ ] **Step 2: Run typecheck to verify**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/manifest.ts
git commit -m "feat(pwa): add web app manifest"
```

---

### Task 3: Create the 192×192 PWA icon route

**Files:**

- Create: `apps/web/src/app/api/pwa/icon-192/route.tsx`

Route handlers that return images must use `.tsx` extension (JSX required for `ImageResponse`). The graphic matches `apple-icon.tsx` exactly — same Electric dark palette, same SVG structure — just at 192×192.

- [ ] **Step 1: Create `apps/web/src/app/api/pwa/icon-192/route.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    <svg
      width="192"
      height="192"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Opaque canvas fill */}
      <rect width="48" height="48" fill="#070A1A" />
      {/* Rounded background */}
      <rect width="48" height="48" rx="10" fill="#171D3A" />
      {/* Signal ring */}
      <circle cx="34" cy="14" r="9" fill="#FF7BD4" opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill="#FF7BD4" opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill="#7AE6FF" />
      {/* Dot trail */}
      <circle cx="14" cy="38" r="1.6" fill="#E8F3FF" opacity="0.45" />
      <circle cx="18" cy="34" r="1.6" fill="#E8F3FF" opacity="0.52" />
      <circle cx="22" cy="30" r="1.6" fill="#E8F3FF" opacity="0.59" />
      <circle cx="26" cy="26" r="1.6" fill="#E8F3FF" opacity="0.66" />
      <circle cx="30" cy="22" r="1.6" fill="#E8F3FF" opacity="0.73" />
      <circle cx="34" cy="18" r="1.6" fill="#E8F3FF" opacity="0.80" />
      <circle cx="14" cy="32" r="1.6" fill="#E8F3FF" opacity="0.87" />
    </svg>,
    { width: 192, height: 192 },
  )
}
```

- [ ] **Step 2: Run typecheck to verify**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/pwa/icon-192/route.tsx
git commit -m "feat(pwa): add 192x192 PWA icon route"
```

---

### Task 4: Create the 512×512 PWA icon route

**Files:**

- Create: `apps/web/src/app/api/pwa/icon-512/route.tsx`

Identical to the 192 route — only `width`, `height`, and the `ImageResponse` size differ.

- [ ] **Step 1: Create `apps/web/src/app/api/pwa/icon-512/route.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    <svg
      width="512"
      height="512"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Opaque canvas fill */}
      <rect width="48" height="48" fill="#070A1A" />
      {/* Rounded background */}
      <rect width="48" height="48" rx="10" fill="#171D3A" />
      {/* Signal ring */}
      <circle cx="34" cy="14" r="9" fill="#FF7BD4" opacity="0.22" />
      <circle cx="34" cy="14" r="5" fill="#FF7BD4" opacity="0.45" />
      <circle cx="34" cy="14" r="3" fill="#7AE6FF" />
      {/* Dot trail */}
      <circle cx="14" cy="38" r="1.6" fill="#E8F3FF" opacity="0.45" />
      <circle cx="18" cy="34" r="1.6" fill="#E8F3FF" opacity="0.52" />
      <circle cx="22" cy="30" r="1.6" fill="#E8F3FF" opacity="0.59" />
      <circle cx="26" cy="26" r="1.6" fill="#E8F3FF" opacity="0.66" />
      <circle cx="30" cy="22" r="1.6" fill="#E8F3FF" opacity="0.73" />
      <circle cx="34" cy="18" r="1.6" fill="#E8F3FF" opacity="0.80" />
      <circle cx="14" cy="32" r="1.6" fill="#E8F3FF" opacity="0.87" />
    </svg>,
    { width: 512, height: 512 },
  )
}
```

- [ ] **Step 2: Run typecheck to verify**

```bash
cd apps/web && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/pwa/icon-512/route.tsx
git commit -m "feat(pwa): add 512x512 PWA icon route"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full web test suite**

```bash
pnpm turbo test --filter=@concert-crawl/web
```

Expected: 35 test files, 289 tests passing (same as baseline — no new tests needed; these are pure Next.js conventions with no logic to unit test)

- [ ] **Step 2: Run typecheck across all packages**

```bash
pnpm turbo typecheck
```

Expected: no errors

- [ ] **Step 3: Commit the plan doc**

```bash
git add docs/superpowers/plans/2026-05-25-pwa-manifest.md
git commit -m "docs: add PWA manifest implementation plan"
```

- [ ] **Step 4: Manual verification checklist (after staging deploy)**
  1. Open `https://staging.concertcrawl.app` in Chrome
  2. Open DevTools → Application → Manifest
  3. Confirm: name, short_name, start_url, display, theme_color, background_color all populated
  4. Confirm: both icons (192, 512) load without error
  5. On mobile Chrome: confirm "Add to Home Screen" prompt appears
  6. Install and confirm app opens without browser address bar (standalone mode)
