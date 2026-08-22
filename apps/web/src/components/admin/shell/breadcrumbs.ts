import type { NavItem } from './nav'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
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
  if (section.key === 'venues' && sub) {
    // Every venues subpath except the robots audit tool is a venue detail page
    // keyed by id, so the id case is the default and the tool is the exception.
    // The tool's crumb reads from its page title so the two cannot drift.
    subLabel =
      sub === 'robots-audit' ? ADMIN_COPY.robotsAudit.page.title : 'Edit venue'
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
