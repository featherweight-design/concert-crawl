import type { NavItem } from './nav'
import { reviewHrefFromParam } from '@/lib/admin/edit-event-link'

export interface Crumb {
  label: string
  href?: string
}

export function buildBreadcrumbs(
  pathname: string,
  nav: NavItem[],
  searchParams?: URLSearchParams | null,
): Crumb[] {
  const section = nav.find((item) =>
    item.href !== '/admin'
      ? pathname.startsWith(item.href)
      : pathname === '/admin',
  )

  if (!section) return [{ label: 'Admin', href: '/admin' }]

  if (pathname === section.href) {
    const adminCrumb: Crumb =
      pathname === '/admin'
        ? { label: 'Admin' }
        : { label: 'Admin', href: '/admin' }
    return [adminCrumb, { label: section.label }]
  }

  const sub = pathname.slice(section.href.length).replace(/^\//, '')
  let subLabel = 'Details'
  if (section.key === 'venues') {
    if (sub === 'new') subLabel = 'New venue'
    else if (sub) subLabel = 'Edit venue'
  } else if (sub === 'new') {
    subLabel = 'New'
  }

  // Review subpages carry an optional `?from=<tab>` param so the breadcrumb
  // returns the admin to whichever Review tab they came from (#1083). Only
  // the Review section honours this — other sections keep their canonical
  // parent href.
  const sectionHref =
    section.key === 'review'
      ? reviewHrefFromParam(searchParams?.get('from'))
      : section.href

  return [{ label: section.label, href: sectionHref }, { label: subLabel }]
}
