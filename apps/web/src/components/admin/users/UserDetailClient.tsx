'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import type {
  AdminUserDetail,
  FeedbackStatus,
  UserEventStatus,
} from '@concert-crawl/types'
import {
  Panel,
  SectionHead,
  StatCard,
  StatusBadge,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  RelTime,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.users.detail

const FEEDBACK_STATUS_KIND: Record<FeedbackStatus, StatusKind> = {
  unread: 'signal',
  read: 'neutral',
  flagged: 'warning',
  issue_opened: 'accent',
  resolved: 'success',
  archived: 'neutral',
}

const WATCHING_STATUS_KIND: Record<UserEventStatus, StatusKind> = {
  going: 'success',
  interested: 'signal',
  watching: 'neutral',
}

interface UserDetailClientProps {
  // null signals an SSR load failure (deleted user or API down) — the route
  // still renders with a recoverable banner rather than a 404 shell.
  user: AdminUserDetail | null
}

export const UserDetailClient = ({ user }: UserDetailClientProps) => {
  const backLink = (
    <Link
      href="/admin/users"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        textDecoration: 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <ArrowLeft size={14} />
      {COPY.backButton}
    </Link>
  )

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {backLink}
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border:
              '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
            background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
            fontSize: 13,
            color: 'var(--danger)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {COPY.loadError}
        </div>
      </div>
    )
  }

  const displayName = user.handle
    ? `@${user.handle}`
    : (user.email ?? COPY.identity.noHandle)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {backLink}
      <SectionHead
        eyebrow={COPY.eyebrow}
        title={displayName}
        subtitle={user.email ?? COPY.identity.noEmail}
        actions={
          <StatusBadge kind={user.role ? 'accent' : 'neutral'} dot>
            {user.role ?? COPY.identity.noRole}
          </StatusBadge>
        }
      />

      {user.clerkAccountMissing && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border:
              '1px solid color-mix(in oklab, var(--warning) 30%, transparent)',
            background: 'color-mix(in oklab, var(--warning) 8%, transparent)',
            fontSize: 12,
            color: 'var(--warning)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {COPY.identity.deletedNote}
        </div>
      )}

      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
        {user.joinedAt ? (
          <>
            {COPY.identity.joinedPrefix} <RelTime iso={user.joinedAt} />
          </>
        ) : (
          COPY.identity.unknownJoined
        )}
        {user.city ? ` · ${user.city}` : ''}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={COPY.stats.feedback}
          value={String(user.stats.feedback)}
          iconName="MessageSquare"
          kind="neutral"
          noChip
        />
        <StatCard
          label={COPY.stats.watching}
          value={String(user.stats.watching)}
          iconName="Eye"
          kind="neutral"
          noChip
        />
        <StatCard
          label={COPY.stats.priceSubmissions}
          value={String(user.stats.priceSubmissions)}
          iconName="DollarSign"
          kind="neutral"
          noChip
        />
        <StatCard
          label={COPY.stats.artistFollows}
          value={String(user.stats.artistFollows)}
          iconName="Music"
          kind="neutral"
          noChip
        />
      </div>

      <Panel title={COPY.feedback.title} padding={0}>
        {user.feedback.length === 0 ? (
          <div
            style={{
              padding: 16,
              color: 'var(--fg-muted)',
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {COPY.feedback.empty}
          </div>
        ) : (
          <AdminTable minWidth={640}>
            <THead>
              <TR>
                <TH>{COPY.feedback.columns.category}</TH>
                <TH>{COPY.feedback.columns.status}</TH>
                <TH>{COPY.feedback.columns.message}</TH>
                <TH>{COPY.feedback.columns.when}</TH>
              </TR>
            </THead>
            <tbody>
              {user.feedback.map((item) => (
                <TR key={item.id}>
                  <TD mono>{item.category}</TD>
                  <TD>
                    <StatusBadge kind={FEEDBACK_STATUS_KIND[item.status]} dot>
                      {item.status}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {item.message}
                      {item.issueUrl && (
                        <a
                          href={item.issueUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--signal)',
                            textDecoration: 'none',
                            fontSize: 12,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {COPY.feedback.viewIssue}
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </span>
                  </TD>
                  <TD>
                    <RelTime iso={item.createdAt} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>

      <Panel title={COPY.watching.title} padding={0}>
        {user.watching.length === 0 ? (
          <div
            style={{
              padding: 16,
              color: 'var(--fg-muted)',
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {COPY.watching.empty}
          </div>
        ) : (
          <AdminTable minWidth={640}>
            <THead>
              <TR>
                <TH>{COPY.watching.columns.event}</TH>
                <TH>{COPY.watching.columns.venue}</TH>
                <TH>{COPY.watching.columns.date}</TH>
                <TH>{COPY.watching.columns.status}</TH>
                <TH>{COPY.watching.columns.added}</TH>
              </TR>
            </THead>
            <tbody>
              {user.watching.map((item) => (
                <TR key={item.eventId}>
                  <TD>{item.eventTitle}</TD>
                  <TD>{item.venueName ?? COPY.watching.unknownVenue}</TD>
                  <TD mono>{item.eventDate}</TD>
                  <TD>
                    <StatusBadge kind={WATCHING_STATUS_KIND[item.status]} dot>
                      {item.status}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <RelTime iso={item.createdAt} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  )
}
