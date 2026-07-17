# PWA Manifest Design

**Date:** 2026-05-25
**Issue:** #526
**Branch:** feat/pwa-manifest

## Problem

`apps/web/src/app/layout.tsx` declares `manifest: '/manifest.json'` in Next.js metadata, but no manifest file exists. The URL 404s on every page load and PWA install fails silently.

## Solution

Three new files following Next.js App Router conventions — consistent with the existing `icon.svg` and `apple-icon.tsx` pattern. No binary assets, no changes to `layout.tsx`.

## Files

### `src/app/manifest.ts`

Next.js App Router manifest file, automatically served at `/manifest.json`.

```ts
name: 'Concert Crawl'
short_name: 'Concert Crawl'
description: 'Denver concert calendar — find shows at your favorite venues.'
start_url: '/'
display: 'standalone'
background_color: '#070A1A' // Electric theme bg
theme_color: '#070A1A' // matches viewport.themeColor in layout.tsx
icons: [
  { src: '/api/pwa/icon-192', sizes: '192x192', type: 'image/png' },
  { src: '/api/pwa/icon-512', sizes: '512x512', type: 'image/png' },
]
```

`start_url: "/"` is relative — resolves correctly on any domain (staging.concertcrawl.app, concertcrawl.app) without hardcoding.

### `src/app/api/pwa/icon-192/route.tsx`

Route handler returning a 192×192 `ImageResponse` using the same graphic as `apple-icon.tsx` (dark Electric palette: `#171D3A` background, `#FF7BD4`/`#7AE6FF` signal, `#E8F3FF` dots).

### `src/app/api/pwa/icon-512/route.tsx`

Same as above at 512×512. Both handlers share the same SVG graphic — only `size` differs.

## Why API Routes for Icons

The existing `apple-icon.tsx` uses Next.js's special metadata image convention (180×180). PWA manifest icons require specific sizes (192, 512) that don't map to Next.js's built-in naming conventions. API route handlers returning `ImageResponse` are the consistent, code-only approach — no binary PNG files in the repo.

## No Changes Required

- `layout.tsx` — `manifest: '/manifest.json'` already declared
- `viewport.themeColor: '#070A1A'` already set
- `icon.svg` and `apple-icon.tsx` — unchanged, continue serving favicon and Apple touch icon

## Acceptance Criteria

- `/manifest.json` returns 200 with valid JSON
- Chrome DevTools → Application → Manifest shows all required fields populated
- "Add to Home Screen" prompt appears on mobile when visiting over HTTPS (staging: `staging.concertcrawl.app`, prod: `concertcrawl.app`)
- Installed app opens in standalone mode (no browser address bar)

## Testing

No unit tests needed — the manifest and icon routes are pure Next.js conventions with no logic to test. Manual verification via Chrome DevTools Application tab covers the acceptance criteria. Staging deploy is the validation gate.
