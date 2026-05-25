'use client'

import { useState, useTransition, useCallback } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import {
  AdminTable,
  THead,
  TR,
  TH,
  TD,
} from '@/components/admin/primitives/AdminTable'
import { updateUserRole } from '@/lib/actions/admin-users'
import type { Role } from '@concert-crawl/types'

export interface AdminUserRow {
  id: string
  email: string
  handle: string | null
  role: Role
  createdAt: string | null
}

const ASSIGNABLE_ROLES: Role[] = ['admin', 'promoter', 'beta', 'user']

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  promoter: 'Promoter',
  beta: 'Beta',
  sub_admin: 'Staff',
  user: 'Member',
}

const ROLE_DOT: Partial<Record<Role, string>> = {
  admin: 'var(--warning)',
  promoter: 'var(--accent)',
  beta: 'var(--signal)',
  sub_admin: 'var(--signal)',
}

function RolePip({ role }: { role: Role }) {
  const dot = ROLE_DOT[role]
  if (!dot)
    return (
      <span style={{ color: 'var(--fg-subtle)', fontSize: 12 }}>Member</span>
    )
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 7px',
        borderRadius: 4,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        color: 'var(--fg-muted)',
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: 5,
          background: dot,
          display: 'block',
          flexShrink: 0,
        }}
      />
      {ROLE_LABEL[role]}
    </span>
  )
}

function RoleSelect({
  userId,
  currentRole,
  onSuccess,
}: {
  userId: string
  currentRole: Role
  onSuccess: (newRole: Role) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback(
    (newRole: Role) => {
      if (newRole === currentRole) return
      setError(null)
      startTransition(async () => {
        const result = await updateUserRole(userId, newRole)
        if (result.success) {
          onSuccess(newRole)
        } else {
          setError(result.error ?? ADMIN_COPY.users.roleSelect.errorFallback)
        }
      })
    },
    [userId, currentRole, onSuccess],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select
        value={currentRole}
        disabled={pending}
        onChange={(ev) => handleChange(ev.target.value as Role)}
        aria-label={ADMIN_COPY.users.roleSelect.ariaLabel}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          padding: '5px 28px 5px 10px',
          borderRadius: 6,
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-1)',
          color: pending ? 'var(--fg-muted)' : 'var(--fg)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 12.5,
          fontWeight: 500,
          cursor: pending ? 'not-allowed' : 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          minWidth: 120,
        }}
      >
        {currentRole === 'sub_admin' && (
          <option value="sub_admin" disabled>
            {ROLE_LABEL['sub_admin']}
          </option>
        )}
        {ASSIGNABLE_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABEL[role]}
          </option>
        ))}
      </select>
      {error && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--danger)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

// ── Mobile card (shown on narrow screens) ────────────────────
function UserCard({
  row,
  onRoleChange,
}: {
  row: AdminUserRow
  onRoleChange: (id: string, role: Role) => void
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13.5,
              color: 'var(--fg)',
              wordBreak: 'break-all',
            }}
          >
            {row.email}
          </span>
          {row.handle && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--fg-subtle)',
              }}
            >
              @{row.handle}
            </span>
          )}
        </div>
        <RolePip role={row.role} />
      </div>
      <RoleSelect
        userId={row.id}
        currentRole={row.role}
        onSuccess={(newRole) => onRoleChange(row.id, newRole)}
      />
    </div>
  )
}

// ── Main client component ────────────────────────────────────
export function AdminUsersClient({
  initialUsers,
  total,
}: {
  initialUsers: AdminUserRow[]
  total: number
}) {
  const [users, setUsers] = useState(initialUsers)

  const handleRoleChange = useCallback((id: string, newRole: Role) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === id ? { ...user, role: newRole } : user)),
    )
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Summary line */}
      <div
        style={{
          padding: '8px 0 16px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--fg-subtle)',
          letterSpacing: '0.04em',
        }}
      >
        {total}{' '}
        {total !== 1
          ? ADMIN_COPY.users.summary.userPlural
          : ADMIN_COPY.users.summary.userSingular}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <AdminTable>
          <THead sticky>
            <tr>
              <TH>{ADMIN_COPY.users.columns.emailHandle}</TH>
              <TH>{ADMIN_COPY.users.columns.role}</TH>
              <TH>{ADMIN_COPY.users.columns.joined}</TH>
              <TH>{ADMIN_COPY.users.columns.assignRole}</TH>
            </tr>
          </THead>
          <tbody>
            {users.map((row) => (
              <TR key={row.id}>
                <TD>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{row.email}</span>
                    {row.handle && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          color: 'var(--fg-subtle)',
                        }}
                      >
                        @{row.handle}
                      </span>
                    )}
                  </div>
                </TD>
                <TD>
                  <RolePip role={row.role} />
                </TD>
                <TD mono color="var(--fg-muted)">
                  {row.createdAt
                    ? new Date(row.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </TD>
                <TD>
                  <RoleSelect
                    userId={row.id}
                    currentRole={row.role}
                    onSuccess={(newRole) => handleRoleChange(row.id, newRole)}
                  />
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </div>

      {/* Mobile card list */}
      <div
        className="md:hidden"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {users.map((row) => (
          <UserCard key={row.id} row={row} onRoleChange={handleRoleChange} />
        ))}
      </div>

      {users.length === 0 && (
        <div
          style={{
            padding: '48px 0',
            textAlign: 'center',
            color: 'var(--fg-muted)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
          }}
        >
          {ADMIN_COPY.users.empty}
        </div>
      )}

      {total > users.length && (
        <div
          style={{
            padding: '12px 0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: 'var(--fg-subtle)',
          }}
        >
          {ADMIN_COPY.users.pagination(users.length, total)}
        </div>
      )}
    </div>
  )
}
