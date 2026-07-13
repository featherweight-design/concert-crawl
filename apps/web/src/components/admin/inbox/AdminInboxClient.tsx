'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCheck } from 'lucide-react'
import type {
  InboxItem,
  InboxItemType,
  InboxResponse,
} from '@concert-crawl/types'
import { Panel, SectionHead, Pagination } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { isAuthError } from '@/components/admin/prices/lib/is-auth-error'
import {
  INBOX_PAGE_SIZE,
  useAdminInbox,
  useMarkAllInboxRead,
  useMarkInboxRead,
  type InboxCategoryFilter,
  type InboxStatusFilter,
} from '@/lib/queries/use-admin-inbox'
import { InboxRow } from './InboxRow'
import { INBOX_CATEGORY_ORDER } from './lib/category-meta'

const COPY = ADMIN_COPY.adminInbox

const CATEGORY_RAIL: ReadonlyArray<InboxCategoryFilter> = [
  'all',
  ...INBOX_CATEGORY_ORDER,
]
const STATUS_RAIL: ReadonlyArray<InboxStatusFilter> = ['unread', 'read', 'all']

interface AdminInboxClientProps {
  initialData: InboxResponse
}

export const AdminInboxClient = ({ initialData }: AdminInboxClientProps) => {
  const [category, setCategory] = useState<InboxCategoryFilter>('all')
  const [status, setStatus] = useState<InboxStatusFilter>('unread')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(INBOX_PAGE_SIZE)
  const [actionError, setActionError] = useState<string | null>(null)

  const queryInput = { category, status, page, pageSize }

  // The SSR seed matches only the default view (all categories, unread, page 1
  // at the default size). Any other filter/page has to fetch fresh, so gate the
  // seed on that exact shape to avoid handing stale rows to the wrong key.
  const isDefaultView =
    category === 'all' &&
    status === 'unread' &&
    page === 1 &&
    pageSize === INBOX_PAGE_SIZE
  const inboxQuery = useAdminInbox(
    queryInput,
    isDefaultView ? initialData : undefined,
  )

  const markRead = useMarkInboxRead()
  const markAll = useMarkAllInboxRead()

  const data = inboxQuery.data ?? initialData
  const items = data.items
  const total = data.total ?? items.length
  const unreadCounts = data.unreadCounts

  const totalUnread = useMemo(
    () =>
      INBOX_CATEGORY_ORDER.reduce(
        (sum, cat) => sum + (unreadCounts[cat] ?? 0),
        0,
      ),
    [unreadCounts],
  )

  const resetToFirstPage = useCallback(() => setPage(1), [])

  const onCategoryChange = useCallback(
    (next: InboxCategoryFilter) => {
      setCategory(next)
      resetToFirstPage()
    },
    [resetToFirstPage],
  )

  const onStatusChange = useCallback(
    (next: InboxStatusFilter) => {
      setStatus(next)
      resetToFirstPage()
    },
    [resetToFirstPage],
  )

  const onMarkRead = useCallback(
    (item: InboxItem) => {
      setActionError(null)
      markRead.mutate(
        {
          itemType: item.itemType,
          itemId: item.itemId,
          sourceCreatedAt: item.sourceCreatedAt,
        },
        { onError: () => setActionError(COPY.markError) },
      )
    },
    [markRead],
  )

  const onMarkAll = useCallback(() => {
    setActionError(null)
    // When a single category is selected, only that category is cleared;
    // otherwise every category is marked read.
    const target: InboxItemType | undefined =
      category === 'all' ? undefined : category
    markAll.mutate(target, { onError: () => setActionError(COPY.markError) })
  }, [category, markAll])

  const queryErrorMessage = inboxQuery.isError
    ? isAuthError(inboxQuery.error)
      ? COPY.authError
      : COPY.loadError
    : null
  const bannerMessage = actionError ?? queryErrorMessage

  // Mark-all only makes sense when the current view has unread items to clear.
  const markAllTargetUnread =
    category === 'all' ? totalUnread : (unreadCounts[category] ?? 0)

  const emptyMessage =
    status === 'read'
      ? COPY.emptyRead
      : category === 'all'
        ? COPY.empty
        : COPY.emptyFiltered(COPY.filters[category])

  const backLink = (
    <Link
      href="/admin"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--fg-muted)',
        textDecoration: 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <ArrowLeft size={14} />
      {COPY.backLink}
    </Link>
  )

  const pillStyle = (active: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    color: active ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
    background: active ? 'var(--signal)' : 'transparent',
    border: `1px solid ${active ? 'var(--signal)' : 'var(--border-strong)'}`,
  })

  const categoryRail = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {CATEGORY_RAIL.map((key) => {
        const active = category === key
        const badge = key === 'all' ? totalUnread : (unreadCounts[key] ?? 0)
        return (
          <button
            key={key}
            type="button"
            onClick={() => onCategoryChange(key)}
            aria-pressed={active}
            style={pillStyle(active)}
          >
            {COPY.filters[key]}
            {badge > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 99,
                  color: active ? 'var(--fg-on-accent)' : 'var(--signal)',
                  background: active
                    ? 'color-mix(in oklab, var(--fg-on-accent) 22%, transparent)'
                    : 'color-mix(in oklab, var(--signal) 16%, transparent)',
                }}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  const statusRail = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {STATUS_RAIL.map((key) => {
        const active = status === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onStatusChange(key)}
            aria-pressed={active}
            style={pillStyle(active)}
          >
            {COPY.status[key]}
          </button>
        )
      })}
    </div>
  )

  const panelTitle = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {COPY.panelTitle}
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.countBadge(total)}
      </span>
    </span>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {backLink}
      <SectionHead
        eyebrow={COPY.eyebrow}
        title={COPY.title}
        subtitle={COPY.subtitle}
      />

      {bannerMessage && (
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
          {bannerMessage}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categoryRail}
          {statusRail}
        </div>
        {markAllTargetUnread > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            disabled={markAll.isPending}
            aria-label={COPY.markAllAria}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 32,
              padding: '0 14px',
              borderRadius: 8,
              cursor: markAll.isPending ? 'default' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--fg)',
              background: 'var(--surface-1)',
              border: '1px solid var(--border-strong)',
              opacity: markAll.isPending ? 0.6 : 1,
            }}
          >
            <CheckCheck size={14} />
            {category === 'all'
              ? COPY.markAll
              : COPY.markAllInCategory(COPY.filters[category])}
          </button>
        )}
      </div>

      <Panel title={panelTitle} padding={0}>
        {total === 0 ? (
          <div
            style={{
              padding: 16,
              color: 'var(--fg-muted)',
              fontSize: 13,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          <>
            {items.map((item) => (
              <InboxRow
                key={`${item.itemType}:${item.itemId}:${item.sourceCreatedAt}`}
                item={item}
                onMarkRead={onMarkRead}
                marking={markRead.isPending}
              />
            ))}
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                resetToFirstPage()
              }}
              loading={inboxQuery.isFetching}
              itemLabel={COPY.itemLabel}
            />
          </>
        )}
      </Panel>
    </div>
  )
}
