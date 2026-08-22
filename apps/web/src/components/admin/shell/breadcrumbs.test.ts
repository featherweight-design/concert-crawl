import { describe, it, expect } from 'vitest'
import { buildBreadcrumbs } from './breadcrumbs'
import { NAV } from './nav'

describe('buildBreadcrumbs', () => {
  it('returns Admin + section label on a top-level section page', () => {
    const crumbs = buildBreadcrumbs('/admin/venues', NAV)
    expect(crumbs).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'Venues' },
    ])
  })

  it('returns unlinked Admin + Dashboard on the admin root to avoid a self-link', () => {
    const crumbs = buildBreadcrumbs('/admin', NAV)
    expect(crumbs).toEqual([{ label: 'Admin' }, { label: 'Dashboard' }])
  })

  it('returns section link + Edit venue on a venue detail page', () => {
    const crumbs = buildBreadcrumbs('/admin/venues/abc123', NAV)
    expect(crumbs).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'Edit venue' },
    ])
  })

  it('labels the venues robots audit tool with its own title, not Edit venue', () => {
    const crumbs = buildBreadcrumbs('/admin/venues/robots-audit', NAV)
    expect(crumbs).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'robots.txt audit' },
    ])
  })

  it('returns section link + sub-label on a review sub-page', () => {
    const crumbs = buildBreadcrumbs('/admin/review/abc123', NAV)
    expect(crumbs).toEqual([
      { label: 'Review', href: '/admin/review' },
      { label: 'Details' },
    ])
  })

  it('falls back to Admin-only crumb for unknown paths', () => {
    const crumbs = buildBreadcrumbs('/admin/unknown', NAV)
    expect(crumbs).toEqual([{ label: 'Admin', href: '/admin' }])
  })

  // #1083 — Review sub-pages carry an optional `?from=<tab>` param telling
  // us which Review tab the admin came from so the breadcrumb takes them
  // back there instead of dropping them on the default Event flags tab.
  // (The event editor at /admin/events/... is a separate top-level route
  // and gets its Review-return fix via the sidebar + mobile bottom bar,
  // which read the same param.)
  it('routes the Review breadcrumb to ?tab=<from> when the param is a known tab', () => {
    const params = new URLSearchParams('from=all-events')
    const crumbs = buildBreadcrumbs(
      '/admin/review/contests/abc123',
      NAV,
      params,
    )
    expect(crumbs).toEqual([
      { label: 'Review', href: '/admin/review?tab=all-events' },
      { label: 'Details' },
    ])
  })

  it('ignores an unknown ?from= value so a hand-crafted URL cannot steer the breadcrumb', () => {
    const params = new URLSearchParams('from=something-else')
    const crumbs = buildBreadcrumbs(
      '/admin/review/contests/abc123',
      NAV,
      params,
    )
    expect(crumbs).toEqual([
      { label: 'Review', href: '/admin/review' },
      { label: 'Details' },
    ])
  })

  it('leaves the Review breadcrumb untouched when no ?from= is present', () => {
    const crumbs = buildBreadcrumbs(
      '/admin/review/contests/abc123',
      NAV,
      new URLSearchParams(),
    )
    expect(crumbs).toEqual([
      { label: 'Review', href: '/admin/review' },
      { label: 'Details' },
    ])
  })

  it('does not apply ?from= to non-Review sections', () => {
    const params = new URLSearchParams('from=all-events')
    const crumbs = buildBreadcrumbs('/admin/venues/abc123', NAV, params)
    expect(crumbs).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'Edit venue' },
    ])
  })
})
