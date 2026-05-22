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
          iconName="MessageSquare"
        />
        <StatCard
          label="Unread"
          value={String(counts.unread)}
          iconName="Inbox"
        />
        <StatCard
          label="Flagged"
          value={String(counts.flagged)}
          iconName="Flag"
        />
        <StatCard
          label="Issues opened"
          value={String(counts.issue_opened)}
          iconName="GitPullRequest"
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
          title={`Feedback${activeFilter !== 'all' ? ` · ${activeFilter}` : ''}`}
          action={
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'var(--fg-subtle)',
              }}
            >
              {filtered.length} items
            </span>
          }
          padding={0}
        >
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
        </Panel>
      </div>
    </div>
  )
}
