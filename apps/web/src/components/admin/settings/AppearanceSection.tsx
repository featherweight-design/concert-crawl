// apps/web/src/components/admin/settings/AppearanceSection.tsx
import { SettingsLayout } from './SettingsLayout'
import { ThemePicker } from '@/components/admin/ThemePicker'
import { COPY } from './definitions/copy'

export function AppearanceSection() {
  return (
    <SettingsLayout
      heading={COPY.appearance.heading}
      description={COPY.appearance.description}
    >
      <ThemePicker />
    </SettingsLayout>
  )
}
