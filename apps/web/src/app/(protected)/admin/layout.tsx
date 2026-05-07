import { requireAdminUser } from '@/lib/auth'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/venues', label: 'Venues' },
  { href: '/admin/crawl', label: 'Crawl Status' },
  { href: '/admin/events', label: 'Event Review' },
  { href: '/admin/invite-codes', label: 'Invite Codes' },
  { href: '/admin/settings', label: 'Settings' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-border bg-surface-1 p-4">
        <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-fg-muted">
          Admin
        </p>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-fg hover:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-border">
          <UserButton showName />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
