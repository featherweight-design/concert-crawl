import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'
import { Ticket, CheckCircle, XCircle, Users } from 'lucide-react'
import {
  SectionHead,
  StatCard,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { InviteCreatorPanel } from '@/components/admin/invite-codes/InviteCreatorPanel'

type DerivedStatus = 'active' | 'redeemed' | 'expired' | 'revoked'

const INVITE_STATUS_KIND: Record<DerivedStatus, StatusKind> = {
  active: 'signal',
  redeemed: 'success',
  expired: 'neutral',
  revoked: 'danger',
}

function deriveStatus(code: InviteCode): DerivedStatus {
  if (code.revokedAt != null) return 'revoked'
  if (code.usedAt != null) return 'redeemed'
  if (code.expiresAt != null && new Date(code.expiresAt) < new Date())
    return 'expired'
  return 'active'
}

export default async function AdminInviteCodesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const codes = await apiClient
    .get<InviteCode[]>('/v1/admin/invite-codes', token)
    .catch((err: unknown) => {
      throw new Error(
        `Failed to load invite codes: ${err instanceof Error ? err.message : String(err)}`,
      )
    })

  const outstanding = codes.filter(
    (code) => deriveStatus(code) === 'active',
  ).length
  const redeemed = codes.filter(
    (code) => deriveStatus(code) === 'redeemed',
  ).length
  const revoked = codes.filter(
    (code) => deriveStatus(code) === 'revoked',
  ).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Invite codes" />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Outstanding"
          value={String(outstanding)}
          icon={Ticket}
          kind="signal"
          hint="unredeemed active codes"
        />
        <StatCard
          label="Redeemed"
          value={String(redeemed)}
          icon={CheckCircle}
          kind="success"
        />
        <StatCard
          label="Total issued"
          value={String(codes.length)}
          icon={Users}
          kind="neutral"
        />
        <StatCard
          label="Revoked"
          value={String(revoked)}
          icon={XCircle}
          kind="danger"
        />
      </div>

      <InviteCreatorPanel />

      <Panel title="Code log" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Status</TH>
              <TH>Created</TH>
              <TH>Redeemed</TH>
              <TH>Expires</TH>
              <TH>Sent by</TH>
            </tr>
          </THead>
          <tbody>
            {codes.map((code) => {
              const status = deriveStatus(code)
              return (
                <TR key={code.id}>
                  <TD>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        padding: '3px 8px',
                        background: 'var(--surface-1)',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                      }}
                    >
                      {code.code}
                    </span>
                  </TD>
                  <TD>
                    <StatusBadge kind={INVITE_STATUS_KIND[status]} dot>
                      {status}
                    </StatusBadge>
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {new Date(code.createdAt).toLocaleDateString()}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {code.usedAt != null
                      ? new Date(code.usedAt).toLocaleDateString()
                      : '—'}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {code.expiresAt != null
                      ? new Date(code.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    <span
                      style={{
                        padding: '2px 6px',
                        background: 'var(--surface-1)',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        fontSize: 11,
                      }}
                    >
                      {code.createdBy.slice(-8)}
                    </span>
                  </TD>
                </TR>
              )
            })}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
