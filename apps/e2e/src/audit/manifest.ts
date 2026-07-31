// PRs that add a new consumer- or admin-facing surface should add a
// manifest entry in the same PR. When the ui-audit skill proves itself,
// this convention will move into CLAUDE.md's Code section.

/*
 * Concrete route manifest for the UI audit sweep engine.
 *
 * Import validateManifest from manifest-types to ensure every entry is
 * structurally valid at import time — a bad entry will throw loudly
 * before the sweep runner can start.
 *
 * The admin-feedback entry includes an expand-first-card interaction that
 * surfaces the motivating mobile-layout bug (CONTEXT column hidden on mobile).
 *
 * These routes reference stable staging data seeded by `pnpm db:seed:staging`:
 * event-detail is a hardcoded UUID and venue-detail a slug, both from the
 * prod→staging public-data sync (stable because the sync upserts by natural
 * key); admin-contests is a hardcoded UUID from the synthetic seeder, which is
 * deterministic from FIXTURE_SEED. If an id or slug 404s, the sweep records a
 * load error (spec: "route fails to load → recorded as a sweep error in the
 * report"). All consumer routes live under Next's `(protected)` group, so they
 * require an authenticated user — auth:'user', not 'none'.
 */

import type { Page } from '@playwright/test'
import { validateManifest } from './manifest-types.js'
import type { AuditManifest } from './manifest-types.js'

const manifest: AuditManifest = validateManifest([
  {
    id: 'browse',
    path: '/events',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    // Consumer-visible event: the /v1/events/:id detail endpoint 404s any
    // event with hiddenFromConsumer=true or a non-null firstMissingAt, so this
    // id must be one that passes both filters (verified against seeded staging).
    id: 'event-detail',
    path: '/events/7324584c-9104-4760-8e88-94cd232ba035',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'venue-detail',
    path: '/venues/cervantes-masterpiece-ballroom',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'my-shows',
    path: '/watching',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'admin-feedback',
    path: '/admin/feedback',
    tags: ['admin'],
    auth: 'admin',
    interactions: [
      {
        id: 'expand-first-card',
        description:
          'Expand the first feedback card to reveal the CONTEXT column (the motivating mobile-layout bug)',
        run: async (page: Page) => {
          await page
            .getByRole('button', { name: /expand feedback/i })
            .first()
            .click()
          await page.waitForLoadState('networkidle')
        },
      },
    ],
  },
  {
    id: 'admin-contests',
    path: '/admin/review/contests/36ee6949-8d3f-2988-d3b8-b89c4205406b',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-events',
    path: '/admin/events',
    tags: ['admin'],
    auth: 'admin',
  },

  // --- Additional consumer routes -----------------------------------------
  {
    id: 'search',
    path: '/search',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'changelog',
    path: '/changelog',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'venues-index',
    path: '/venues',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    id: 'me',
    path: '/me',
    tags: ['consumer'],
    auth: 'user',
  },

  // --- Additional admin routes --------------------------------------------
  {
    id: 'admin-settings',
    path: '/admin/settings',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-prices',
    path: '/admin/prices',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-price-submissions',
    path: '/admin/prices/submissions',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-venues',
    path: '/admin/venues',
    tags: ['admin'],
    auth: 'admin',
    interactions: [
      {
        // Admin venue-detail (`/admin/venues/[id]`) keys on the staging venue
        // UUID, which is NOT stable: the prod->staging sync strips the prod id
        // and lets staging generate its own (see sync-venues.ts — insert drops
        // `id`, ON CONFLICT targets `slug`), so a hardcoded UUID would 404 after
        // any staging rebuild. Reach the detail page by clicking the first real
        // venue row link on the stable index instead. The `:not(...)` filters
        // exclude the two non-detail links (`/robots-audit`, `/new`); the venue
        // table renders both a mobile-card and desktop-table link set, so
        // `:visible` picks the one rendered at the current viewport.
        id: 'open-first-venue',
        description:
          'Open the first venue detail page from the admin venues index (UUID-stable coverage of /admin/venues/[id])',
        run: async (page: Page) => {
          await page
            .locator(
              'a[href^="/admin/venues/"]:not([href="/admin/venues/robots-audit"]):not([href="/admin/venues/new"]):visible',
            )
            .first()
            .click()
          await page.waitForLoadState('networkidle')
        },
      },
    ],
  },
  {
    id: 'admin-robots-audit',
    path: '/admin/venues/robots-audit',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-crawl',
    path: '/admin/crawl',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-founder-window',
    path: '/admin/founder-window',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-users',
    path: '/admin/users',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    // /admin/users/:userId keys on the Clerk user id (identity source of
    // truth); this is the seeded `alpha` fixture user from fixture-users.ts.
    id: 'admin-user-detail',
    path: '/admin/users/user_3GYqkhiaCasabdEYXqtsdiUYjnD',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-invite-codes',
    path: '/admin/invite-codes',
    tags: ['admin'],
    auth: 'admin',
  },
])

export default manifest
