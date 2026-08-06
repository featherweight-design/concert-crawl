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
 * deterministic from FIXTURE_SEED. artist-detail is the one exception — the
 * staging seeder does not populate `artists`, so it needs the separate backfill
 * noted on its entry. If an id or slug 404s, the sweep records a
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
    interactions: [
      {
        // The #72 share sheet is a component on this page, not a route, so it
        // is unreachable by a path-only sweep. The poster preview inside it is
        // a PNG rendered on demand from `/share/:id/:ratio`; the sweep's own
        // post-interaction `networkidle` wait is what lets it land before the
        // screenshot, so no interaction here waits for itself.
        id: 'open-share-sheet',
        description:
          'Open the share sheet from the event hero to capture the poster preview and its destinations',
        run: async (page: Page) => {
          await page.getByRole('button', { name: /share this show/i }).click()
        },
      },
    ],
  },
  // The public mirror `/e/:id` (#72 PR-0) has NO entry here, deliberately, and
  // the reason is worth writing down because an entry looks obviously correct
  // until you trace both auth modes:
  //
  //   auth: 'user' → `app/e/[id]/page.tsx` redirects a signed-in visitor to
  //     `/events/:id`, so the sweep captures the protected page a second time
  //     under a name that claims to be the mirror.
  //   auth: 'none' → the route sits in `isPublicOnceLaunched`, so before launch
  //     an anonymous visitor is bounced to the invite gate and the sweep
  //     screenshots that instead.
  //
  // Neither mode reaches the mirror, so an entry here would be coverage that
  // reports green while auditing nothing. It becomes sweepable as `none` once
  // the public-launch flag flips; until then the surface is walked by hand with
  // NEXT_PUBLIC_PUBLIC_BROWSE=true, tracked in #1359.
  {
    id: 'venue-detail',
    path: '/venues/cervantes-masterpiece-ballroom',
    tags: ['consumer'],
    auth: 'user',
  },
  {
    // Needs the `artists` projection populated. `db:seed:staging` syncs venues,
    // events and price_log but not `artists`, so after a staging reset this
    // route 404s until `pnpm --filter @concert-crawl/db db:backfill-artists`
    // is run against the target. Tracked in #1326.
    id: 'artist-detail',
    path: '/artists/andrea-bocelli',
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
  {
    // #1226 Concert Crews. The index is stable; crew detail keys on a UUID
    // created at runtime by whoever made the crew, so it is reached by
    // clicking the first crew card instead (same reasoning as
    // open-first-venue). When the audit user belongs to no crews the click
    // fails and the sweep records an interaction error — which is the honest
    // signal that staging has no crew data, not a false green.
    id: 'crews',
    path: '/crews',
    tags: ['consumer'],
    auth: 'user',
    interactions: [
      {
        id: 'open-first-crew',
        description:
          'Open the first crew from the crews index (UUID-stable coverage of /crews/[crewId])',
        run: async (page: Page) => {
          await page.locator('a[href^="/crews/"]:visible').first().click()
          // The crew home fetches after navigation, so the sweep's own
          // networkidle wait can still land on the skeleton. Waiting for the
          // skeleton to DETACH is a race — it is not mounted yet at the moment
          // the click returns, so the wait passes instantly against nothing.
          // Wait for a resolved-state control to appear instead.
          await page
            .getByRole('button', { name: /invite people/i })
            .first()
            .waitFor({ state: 'visible', timeout: 30000 })
        },
      },
      {
        // Runs on the page open-first-crew left behind. The tab that opens by
        // default depends on the data — a crew with nights opens on Coming up
        // — so this deliberately targets the roster, which never opens by
        // default once there is anything upcoming. Clicking the already-active
        // tab would produce a capture byte-identical to the previous one and
        // read as coverage of a surface nothing ever visited.
        id: 'crew-roster',
        description:
          "Switch the crew home to the Who's in tab to capture the roster",
        run: async (page: Page) => {
          await page
            .getByRole('tab', { name: /who's in/i })
            .first()
            .click()
        },
      },
    ],
  },
  // `/crew/join/[token]` has NO entry, deliberately. An invite token is a
  // capability minted per invite and consumed on join, so there is no stable
  // value to hardcode; any placeholder resolves to the `unknown` dead end and
  // the page calls notFound(), meaning the sweep would screenshot the 404 and
  // report it as coverage of the landing surface. It is walked by hand during
  // the journey gate instead.

  // --- Additional admin routes --------------------------------------------
  {
    // The dashboard, which hosts the triage panel (#1215). It had no entry, so
    // the panel's forced-state sweep had nothing to run against.
    id: 'admin-dashboard',
    path: '/admin',
    tags: ['admin'],
    auth: 'admin',
  },
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
