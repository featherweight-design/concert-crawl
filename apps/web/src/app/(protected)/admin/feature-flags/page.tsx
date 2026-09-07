import type { AdminFeatureFlag } from '@concert-crawl/entitlements'

import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead } from '@/components/admin/primitives'
import { FeatureFlagControl } from '@/components/admin/feature-flags/FeatureFlagControl'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.featureFlags

export default async function AdminFeatureFlagsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const flags = await apiClient.get<AdminFeatureFlag[]>(
    '/v1/admin/feature-flags',
    token,
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow={COPY.sectionEyebrow}
        title={COPY.sectionTitle}
        subtitle={COPY.sectionSubtitle}
      />
      <FeatureFlagControl initial={flags} />
    </div>
  )
}
