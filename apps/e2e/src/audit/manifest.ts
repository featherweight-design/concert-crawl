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
 * event-detail uses a hardcoded staging slug. If the slug 404s, the sweep
 * records a load error (spec: "route fails to load → recorded as a sweep
 * error in the report"). A follow-up PR can make this dynamic once the
 * audit stabilizes.
 */

import type { Page } from '@playwright/test'
import { validateManifest } from './manifest-types.js'
import type { AuditManifest } from './manifest-types.js'

const manifest: AuditManifest = validateManifest([
  {
    id: 'browse',
    path: '/',
    tags: ['consumer'],
    auth: 'none',
  },
  {
    id: 'event-detail',
    path: '/events/staging-seed-example',
    tags: ['consumer'],
    auth: 'none',
  },
  {
    id: 'venue-detail',
    path: '/venues/ogden-theatre',
    tags: ['consumer'],
    auth: 'none',
  },
  {
    id: 'my-shows',
    path: '/my/shows',
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
            .getByRole('button', { name: /expand/i })
            .first()
            .click()
          await page.waitForLoadState('networkidle')
        },
      },
    ],
  },
  {
    id: 'admin-contests',
    path: '/admin/contests',
    tags: ['admin'],
    auth: 'admin',
  },
  {
    id: 'admin-events',
    path: '/admin/events',
    tags: ['admin'],
    auth: 'admin',
  },
])

export default manifest
