import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import type { InviteCode } from '@concert-crawl/types'
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
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

type DerivedStatus = 'active' | 'redeemed' | 'expired' | 'revoked'

const INVITE_STATUS_KIND: Record<DerivedStatus, StatusKind> = {
  active: 'signal',
  redeemed: 'success',
  expired: 'neutral',
  revoked: 'danger',
}

// #1084 — `usedBy` is the authoritative signal that a code has been
// redeemed (the redemption route in `apps/api/src/routes/auth/redeem-code.ts`
// writes it atomically alongside `usedAt`). Legacy rows exist where
// `usedBy` is set but `usedAt` is null, so gating only on `usedAt` mis-
// classifies those as active AND leaves the Redeemed column blank even
// though the code is spoken-for.
function deriveStatus(code: InviteCode): DerivedStatus {
  if (code.revokedAt != null) return 'revoked'
  if (code.usedBy != null || code.usedAt != null) return 'redeemed'
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
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <StatCard
          label="Outstanding"
          value={String(outstanding)}
          iconName="Ticket"
          kind="signal"
          hint="unredeemed active codes"
        />
        <StatCard
          label="Redeemed"
          value={String(redeemed)}
          iconName="CheckCircle"
          kind="success"
        />
        <StatCard
          label="Total issued"
          value={String(codes.length)}
          iconName="Users"
          kind="neutral"
        />
        <StatCard
          label="Revoked"
          value={String(revoked)}
          iconName="XCircle"
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
                    {/* #1084 — mirror deriveStatus: show the date when we
                        have it; if only `usedBy` is set (legacy redemption
                        row with no timestamp) surface the textual marker
                        rather than blanking the cell. Copy lives in
                        `ADMIN_COPY.inviteCodes.redeemedWithoutDate`. */}
                    {code.usedAt != null
                      ? new Date(code.usedAt).toLocaleDateString()
                      : code.usedBy != null
                        ? ADMIN_COPY.inviteCodes.redeemedWithoutDate
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
