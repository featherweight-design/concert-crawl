import type { NavItem } from './nav'

export interface Crumb {
  label: string
  href?: string
}

export function buildBreadcrumbs(pathname: string, nav: NavItem[]): Crumb[] {
  const section = nav.find((item) =>
    item.href !== '/admin'
      ? pathname.startsWith(item.href)
      : pathname === '/admin',
  )

  if (!section) return [{ label: 'Admin', href: '/admin' }]

  if (pathname === section.href) {
    return [{ label: 'Admin', href: '/admin' }, { label: section.label }]
  }

  const sub = pathname.slice(section.href.length).replace(/^\//, '')
  let subLabel = 'Details'
  if (section.key === 'venues') {
    if (sub === 'new') subLabel = 'New venue'
    else if (sub) subLabel = 'Edit venue'
  } else if (sub === 'new') {
    subLabel = 'New'
  }

  return [{ label: section.label, href: section.href }, { label: subLabel }]
}
