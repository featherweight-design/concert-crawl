import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'
import { InviteCodeTable } from '@/components/admin/invite-code-table'
import { GenerateInviteForm } from '@/components/admin/generate-invite-form'

export default async function InviteCodesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const codes = await apiClient.get<InviteCode[]>(
    '/v1/admin/invite-codes',
    token!,
  )

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Invite Codes</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate codes to grant beta access. Codes are single-use.
        </p>
      </div>
      <GenerateInviteForm />
      <InviteCodeTable codes={codes} />
    </div>
  )
}
