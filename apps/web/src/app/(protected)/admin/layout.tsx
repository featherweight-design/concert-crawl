import './admin.css'
import { requireAdminUser } from '@/lib/auth'
import { AdminThemeProvider } from '@/components/admin/shell/AdminThemeProvider'
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar'
import { AdminTopbar } from '@/components/admin/shell/AdminTopbar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdminUser()

  return (
    <AdminThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminTopbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  )
}
