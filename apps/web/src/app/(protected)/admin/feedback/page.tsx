'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  StatCard,
  Panel,
  SectionHead,
  AdminButton,
} from '@/components/admin/primitives'
import { Filter, ExternalLink } from 'lucide-react'
import { FeedbackFilterRail } from '@/components/admin/feedback/FeedbackFilterRail'
import { FeedbackRow } from '@/components/admin/feedback/FeedbackRow'
import { FeedbackExpanded } from '@/components/admin/feedback/FeedbackExpanded'
import type {
  FeedbackStatusFilter,
  FeedbackSource,
} from '@/components/admin/feedback/FeedbackFilterRail'
import type { FeedbackItem } from '@/components/admin/feedback/FeedbackRow'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const STATUS_CHIPS: { value: FeedbackStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'issue_opened', label: 'Issue opened' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
]

const PANEL_TITLE: Record<FeedbackStatusFilter, string> = {
  all: 'Active feedback',
  unread: 'Unread feedback',
  flagged: 'Flagged feedback',
  issue_opened: 'Issues opened',
  resolved: 'Resolved feedback',
  archived: 'Archived feedback',
  read: 'Read feedback',
}

export default function FeedbackPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FeedbackStatusFilter>('all')
  const [activeSources, setActiveSources] = useState<Set<FeedbackSource>>(
    new Set(['feedback_surface']),
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    setIsMobile(mq.matches)
    const handler = (ev: MediaQueryListEvent) => setIsMobile(ev.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const fetchFeedback = async () => {
    const token = await getToken()
    if (!token) return
    const resp = await fetch(`${API_BASE}/v1/admin/feedback?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) return
    const body = (await resp.json()) as { data: FeedbackItem[] }
    setItems(body.data)
  }

  useEffect(() => {
    setIsLoading(true)
    void fetchFeedback().finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleStatusChange = async (
    id: string,
    status: FeedbackItem['status'],
  ) => {
    const token = await getToken()
    if (!token) return
    await fetch(`${API_BASE}/v1/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    )
    router.refresh()
  }

  const handleMarkAllRead = async () => {
    const token = await getToken()
    if (!token) return
    const unreadItems = items.filter((item) => item.status === 'unread')
    await Promise.all(
      unreadItems.map((item) =>
        fetch(`${API_BASE}/v1/admin/feedback/${item.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'read' }),
        }),
      ),
    )
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'unread' ? { ...item, status: 'read' as const } : item,
      ),
    )
    router.refresh()
  }

  const handleNotesChange = async (id: string, adminNotes: string) => {
    const token = await getToken()
    if (!token) return
    await fetch(`${API_BASE}/v1/admin/feedback/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminNotes }),
    })
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, adminNotes } : item)),
    )
  }

  const handleSourceToggle = (source: FeedbackSource) => {
    setActiveSources((prev) => {
      const next = new Set(prev)
      if (next.has(source)) {
        next.delete(source)
      } else {
        next.add(source)
      }
      return next
    })
  }

  const sourceFiltered = activeSources.has('feedback_surface') ? items : []

  const filtered =
    activeFilter === 'all'
      ? sourceFiltered
      : sourceFiltered.filter((item) => item.status === activeFilter)

  const counts = {
    all: items.length,
    unread: items.filter((item) => item.status === 'unread').length,
    read: items.filter((item) => item.status === 'read').length,
    flagged: items.filter((item) => item.status === 'flagged').length,
    issue_opened: items.filter((item) => item.status === 'issue_opened').length,
    resolved: items.filter((item) => item.status === 'resolved').length,
    archived: items.filter((item) => item.status === 'archived').length,
  }

  const lastWeek = items.filter(
    (item) =>
      Date.now() - new Date(item.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  ).length

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const issuesThisMonth = items.filter(
    (item) =>
      item.status === 'issue_opened' &&
      new Date(item.createdAt) >= startOfMonth,
  ).length

  const mobileSubtitle = [
    counts.unread > 0 ? `${counts.unread} unread` : null,
    counts.flagged > 0 ? `${counts.flagged} flagged` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const feedbackList = (
    <>
      {isLoading ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--fg-subtle)',
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--fg-subtle)',
            fontSize: 13,
          }}
        >
          No feedback in this category
        </div>
      ) : (
        filtered.map((item) => (
          <div key={item.id}>
            <FeedbackRow
              item={item}
              isExpanded={expandedId === item.id}
              onToggle={handleToggle}
            />
            {expandedId === item.id && (
              <FeedbackExpanded
                item={item}
                onStatusChange={handleStatusChange}
                onNotesChange={handleNotesChange}
              />
            )}
          </div>
        ))
      )}
    </>
  )

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionHead
          eyebrow="operations · users"
          title={
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
            >
              Feedback
              {counts.unread > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1.5px solid var(--signal)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--signal)',
                    letterSpacing: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {counts.unread} unread
                </span>
              )}
            </span>
          }
          subtitle={mobileSubtitle || undefined}
        />

        {/* Horizontal chip filter */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 2,
            scrollbarWidth: 'none',
          }}
        >
          {STATUS_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.value
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setActiveFilter(chip.value)}
                style={{
                  flexShrink: 0,
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 20,
                  border: isActive
                    ? '1.5px solid var(--signal)'
                    : '1px solid var(--border-strong)',
                  background: isActive ? 'var(--signal)' : 'var(--bg-elevated)',
                  color: isActive ? '#fff' : 'var(--fg-muted)',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Feedback list */}
        <Panel padding={0}>{feedbackList}</Panel>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        eyebrow="operations · users"
        title={
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
          >
            Feedback
            {counts.unread > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: 20,
                  border: '1.5px solid var(--signal)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--signal)',
                  letterSpacing: 0,
                  lineHeight: 1.4,
                }}
              >
                {counts.unread} unread
              </span>
            )}
          </span>
        }
        subtitle="Inbox for in-app feedback (and Sentry, soon email). Triage: mark read, flag for investigation, open a GH issue, or archive."
        actions={
          <>
            <AdminButton variant="outline" size="sm" icon={Filter}>
              Date range
            </AdminButton>
            <AdminButton variant="outline" size="sm" icon={ExternalLink}>
              Export CSV
            </AdminButton>
          </>
        }
      />

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        <StatCard
          label="Last 7 days"
          value={String(lastWeek)}
          iconName="Inbox"
          kind="signal"
        />
        <StatCard
          label="Unread"
          value={String(counts.unread)}
          iconName="AlertCircle"
          kind="warning"
        />
        <StatCard
          label="Flagged"
          value={String(counts.flagged)}
          iconName="Flag"
          kind="danger"
          hint="awaiting investigation"
        />
        <StatCard
          label="Issues opened"
          value={String(issuesThisMonth)}
          iconName="ExternalLink"
          kind="accent"
          hint="this month"
        />
      </div>

      {/* Main layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '200px minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <FeedbackFilterRail
          active={activeFilter}
          counts={counts}
          onChange={setActiveFilter}
          activeSources={activeSources}
          onSourceToggle={handleSourceToggle}
        />

        <Panel
          title={PANEL_TITLE[activeFilter]}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--fg-subtle)',
                }}
              >
                {filtered.length} items
              </span>
              {counts.unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--fg-muted)',
                    padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          }
          padding={0}
        >
          {feedbackList}
        </Panel>
      </div>
    </div>
  )
}
