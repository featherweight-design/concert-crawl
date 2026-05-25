// apps/web/src/components/admin/settings/AppearanceSection.tsx
import { SettingsLayout } from './SettingsLayout'
import { ThemePicker } from '@/components/admin/ThemePicker'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export function AppearanceSection() {
  return (
    <SettingsLayout
      heading={ADMIN_COPY.settings.appearance.heading}
      description={ADMIN_COPY.settings.appearance.description}
    >
      <ThemePicker />
    </SettingsLayout>
  )
}
