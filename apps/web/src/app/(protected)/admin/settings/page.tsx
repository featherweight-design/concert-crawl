// apps/web/src/app/(protected)/admin/settings/page.tsx
import { requireAdminUser } from '@/lib/auth'
import { AppearanceSection } from '@/components/admin/settings/AppearanceSection'
import { OpsToolsSection } from '@/components/admin/settings/OpsToolsSection'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export default async function SettingsPage() {
  await requireAdminUser()

  return (
    <div className="max-w-2xl">
      <h1 className="mb-8 text-2xl font-bold text-fg">
        {ADMIN_COPY.settings.page.title}
      </h1>
      <div className="flex flex-col gap-0">
        <AppearanceSection />
        <OpsToolsSection />
      </div>
    </div>
  )
}
