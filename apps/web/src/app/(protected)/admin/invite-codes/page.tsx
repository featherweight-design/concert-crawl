import { auth, requireAdminUser } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import type { InviteCode } from '@concert-crawl/types';
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
} from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives';
import { InviteCreatorPanel } from '@/components/admin/invite-codes/InviteCreatorPanel';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  inviteStatus,
  isPrintable,
  seatsTaken,
  type InviteStatus,
} from '@/lib/poster/poster-rule';
import Link from 'next/link';

const INVITE_STATUS_KIND: Record<InviteStatus, StatusKind> = {
  active: 'signal',
  redeemed: 'success',
  expired: 'neutral',
  revoked: 'danger',
};

export default async function AdminInviteCodesPage() {
  await requireAdminUser();
  const { getToken } = await auth();
  const token = await getToken();
  if (!token) return null;

  const codes = await apiClient
    .get<InviteCode[]>('/v1/admin/invite-codes', token)
    .catch((err: unknown) => {
      throw new Error(
        `Failed to load invite codes: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

  const now = new Date();
  const outstanding = codes.filter(
    (code) => inviteStatus(code, now) === 'active',
  ).length;
  const redeemed = codes.filter(
    (code) => inviteStatus(code, now) === 'redeemed',
  ).length;
  const revoked = codes.filter(
    (code) => inviteStatus(code, now) === 'revoked',
  ).length;

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
              <TH>Uses</TH>
              <TH>Created</TH>
              <TH>Redeemed</TH>
              <TH>Expires</TH>
              <TH>Sent by</TH>
            </tr>
          </THead>
          <tbody>
            {codes.map((code) => {
              const status = inviteStatus(code, now);
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
                    {code.label ? (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {code.label}
                      </div>
                    ) : null}
                  </TD>
                  <TD>
                    <StatusBadge kind={INVITE_STATUS_KIND[status]} dot>
                      {status}
                    </StatusBadge>
                  </TD>
                  <TD mono color="var(--fg-muted)">
                    {ADMIN_COPY.inviteCodes.uses(
                      seatsTaken(code),
                      code.maxUses,
                    )}
                    {isPrintable(code, now) ? (
                      <>
                        {' · '}
                        <Link
                          href={`/admin/invite-codes/${code.id}/poster`}
                          prefetch={false}
                          style={{ color: 'var(--signal)' }}
                        >
                          {ADMIN_COPY.inviteCodes.posterLink}
                        </Link>
                      </>
                    ) : null}
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
              );
            })}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  );
}
