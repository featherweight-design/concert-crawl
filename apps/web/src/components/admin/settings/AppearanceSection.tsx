// apps/web/src/components/admin/settings/AppearanceSection.tsx
import { SettingsLayout } from './SettingsLayout'
import { ThemePicker } from '@/components/admin/ThemePicker'

export function AppearanceSection() {
  return (
    <SettingsLayout
      heading="Appearance"
      description="Choose the theme for your admin interface. Your selection is saved locally."
    >
      <ThemePicker />
    </SettingsLayout>
  )
}
