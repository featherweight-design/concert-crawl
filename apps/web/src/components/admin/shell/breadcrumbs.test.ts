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

  it('returns section link + sub-label on a new-entity page', () => {
    const crumbs = buildBreadcrumbs('/admin/venues/new', NAV)
    expect(crumbs).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'New venue' },
    ])
  })

  it('returns section link + Edit venue on a venue detail page', () => {
    const crumbs = buildBreadcrumbs('/admin/venues/abc123', NAV)
    expect(crumbs).toEqual([
      { label: 'Venues', href: '/admin/venues' },
      { label: 'Edit venue' },
    ])
  })

  it('returns section link + New on a generic new-entity page', () => {
    const crumbs = buildBreadcrumbs('/admin/events/new', NAV)
    expect(crumbs).toEqual([
      { label: 'Event review', href: '/admin/events' },
      { label: 'New' },
    ])
  })

  it('falls back to Admin-only crumb for unknown paths', () => {
    const crumbs = buildBreadcrumbs('/admin/unknown', NAV)
    expect(crumbs).toEqual([{ label: 'Admin', href: '/admin' }])
  })
})
