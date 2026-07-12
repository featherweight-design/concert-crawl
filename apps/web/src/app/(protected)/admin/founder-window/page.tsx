import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { FounderWindowControl } from '@/components/admin/founder-window/FounderWindowControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import type { AdminFounderWindow } from '@concert-crawl/types'

const COPY = ADMIN_COPY.founderWindow

export default async function AdminFounderWindowPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const founderWindow = await apiClient.get<AdminFounderWindow>(
    '/v1/admin/founder-window',
    token,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow={COPY.sectionEyebrow}
        title={COPY.sectionTitle}
        subtitle={COPY.sectionSubtitle}
      />
      <FounderWindowControl initial={founderWindow} />
    </div>
  )
}
