'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUpDown, Check, ExternalLink, X } from 'lucide-react'
import { apiClient, ApiError } from '@/lib/api'
import {
  Panel,
  AdminButton,
  StatusBadge,
  Pagination,
  SectionHead,
  RelTime,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
} from '@/components/admin/primitives'
import { type StatusKind } from '@/components/admin/primitives/utils'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { BulkActionDock } from '@/components/admin/review/BulkActionDock'
import { reviewQueryKeys } from '@/lib/queries/use-admin-review'
import {
  adminPriceSubmissionsKey,
  useAdminPriceSubmissions,
  type PriceSubmissionHistoryRow,
} from '@/lib/queries/use-admin-price-submissions'

const COPY = ADMIN_COPY.submissionsHistory

type StatusFilter = 'all' | 'pending' | 'corroborated' | 'disputed' | 'stale'
type SortKey = 'date' | 'event' | 'user'
type SortDir = 'asc' | 'desc'

const FILTER_ORDER: ReadonlyArray<StatusFilter> = [
  'all',
  'pending',
  'corroborated',
  'disputed',
  'stale',
]

const STATUS_KIND: Record<string, StatusKind> = {
  pending: 'warning',
  corroborated: 'success',
  disputed: 'danger',
  stale: 'neutral',
  archived: 'neutral',
}

function statusLabel(status: string): string {
  return COPY.statusLabels[status as keyof typeof COPY.statusLabels] ?? status
}

function formatPrice(min: string | null, max: string | null): string {
  if (!min) return '—'
  const fmtNum = (val: string) => {
    const num = parseFloat(val)
    return Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`
  }
  return max ? `${fmtNum(min)}–${fmtNum(max)}` : fmtNum(min)
}

function userDisplay(userId: string | null): string {
  if (!userId) return COPY.anonUser
  return userId.slice(0, 12)
}

function compareRows(
  left: PriceSubmissionHistoryRow,
  right: PriceSubmissionHistoryRow,
  sortKey: SortKey,
  sortDir: SortDir,
): number {
  let result = 0
  if (sortKey === 'event') {
    result = (left.eventTitle ?? '').localeCompare(right.eventTitle ?? '')
  } else if (sortKey === 'user') {
    result = (left.userId ?? '').localeCompare(right.userId ?? '')
  }
  // Stable tiebreak (also the primary key for the date sort): compare
  // createdAt ascending (oldest first) in the base order — the sortDir
  // inversion below flips it — then id so equal timestamps never swap.
  if (result === 0) result = left.createdAt.localeCompare(right.createdAt)
  if (result === 0) result = left.id.localeCompare(right.id)
  return sortDir === 'asc' ? result : -result
}

interface PricesSubmissionsClientProps {
  initialSubmissions: PriceSubmissionHistoryRow[]
  initialTotal: number
}

export const PricesSubmissionsClient = ({
  initialSubmissions,
  initialTotal,
}: PricesSubmissionsClientProps) => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const submissionsQuery = useAdminPriceSubmissions(initialSubmissions)
  const rows = submissionsQuery.data ?? initialSubmissions

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? rows
        : rows.filter((row) => row.status === statusFilter),
    [rows, statusFilter],
  )

  const sorted = useMemo(
    () => [...filtered].sort((aa, bb) => compareRows(aa, bb, sortKey, sortDir)),
    [filtered, sortKey, sortDir],
  )

  const total = sorted.length
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  )

  // Only pending rows are actionable — resolved rows are read-only history.
  const pendingPageIds = useMemo(
    () =>
      pageRows.filter((row) => row.status === 'pending').map((row) => row.id),
    [pageRows],
  )
  const allPendingSelected =
    pendingPageIds.length > 0 && pendingPageIds.every((id) => selected.has(id))

  const resetToFirstPage = useCallback(() => setPage(1), [])

  const onFilterChange = useCallback(
    (next: StatusFilter) => {
      setStatusFilter(next)
      setSelected(new Set())
      resetToFirstPage()
    },
    [resetToFirstPage],
  )

  const onSort = useCallback(
    (key: SortKey) => {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          setSortDir((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
          return prevKey
        }
        // New column defaults to descending for date, ascending otherwise.
        setSortDir(key === 'date' ? 'desc' : 'asc')
        return key
      })
      resetToFirstPage()
    },
    [resetToFirstPage],
  )

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAllPending = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev)
      const shouldClear = pendingPageIds.every((id) => next.has(id))
      for (const id of pendingPageIds) {
        if (shouldClear) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [pendingPageIds])

  const patchStatus = useCallback(
    async (ids: string[], status: 'corroborated' | 'disputed') => {
      if (ids.length === 0) return
      setError(null)
      try {
        const token = await getToken()
        if (!token) {
          setError(COPY.authError)
          return
        }
        await Promise.all(
          ids.map((id) =>
            apiClient.patch(`/v1/admin/prices/submissions/${id}`, token, {
              status,
            }),
          ),
        )
        // Optimistic: flip the affected rows in the cached full set so the
        // table + badges update without waiting on the refetch below.
        const idSet = new Set(ids)
        queryClient.setQueryData<PriceSubmissionHistoryRow[]>(
          adminPriceSubmissionsKey,
          (prev) =>
            prev?.map((row) => (idSet.has(row.id) ? { ...row, status } : row)),
        )
        setSelected((prev) => {
          const next = new Set(prev)
          for (const id of ids) next.delete(id)
          return next
        })
        void queryClient.invalidateQueries({
          queryKey: adminPriceSubmissionsKey,
        })
        void queryClient.invalidateQueries({
          queryKey: reviewQueryKeys.counts,
        })
      } catch (patchErr) {
        const message =
          patchErr instanceof ApiError
            ? patchErr.message
            : 'Failed to update submission.'
        console.error('patchStatus error:', patchErr)
        setError(message)
      }
    },
    [getToken, queryClient],
  )

  const selectedPendingIds = useMemo(
    () =>
      rows
        .filter((row) => selected.has(row.id) && row.status === 'pending')
        .map((row) => row.id),
    [rows, selected],
  )

  // True only transiently while the hook is still walking offsets to load
  // the full set (SSR seeds the first page; initialTotal is the server count).
  const truncated = rows.length < initialTotal

  // A PATCH failure (`error`) takes precedence over a background load
  // failure — both need surfacing so a transient API error can't masquerade
  // as a legitimate empty state (the SSR seed swallows the first-paint error).
  const bannerMessage =
    error ?? (submissionsQuery.isError ? COPY.loadError : null)

  const sectionHead = (
    <SectionHead
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      subtitle={COPY.subtitle}
    />
  )

  const backLink = (
    <Link
      href="/admin/review"
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

  const filterRail = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {FILTER_ORDER.map((key) => {
        const active = statusFilter === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onFilterChange(key)}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
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
            }}
          >
            {COPY.filters[key]}
          </button>
        )
      })}
    </div>
  )

  const sortButton = (key: SortKey, label: string) => {
    const active = sortKey === key
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        aria-label={COPY.sort.ariaLabel(label, active ? sortDir : null)}
        style={{
          all: 'unset',
          // `all: unset` also wipes the UA focus ring; revert restores the
          // browser's native :focus-visible outline for keyboard users.
          outline: 'revert',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: active ? 'var(--fg)' : 'var(--fg-muted)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          fontWeight: active ? 700 : 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
        <ArrowUpDown size={11} />
        {active && (sortDir === 'asc' ? '↑' : '↓')}
      </button>
    )
  }

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
      {sectionHead}

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

      {filterRail}

      {truncated && (
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
          {COPY.truncatedNotice(rows.length, initialTotal)}
        </div>
      )}

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
            {COPY.empty}
          </div>
        ) : (
          <>
            <AdminTable minWidth={720}>
              <THead>
                <tr>
                  <TH width={40}>
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleAllPending}
                      disabled={pendingPageIds.length === 0}
                      aria-label={COPY.selectAllAria}
                      style={{ cursor: 'pointer' }}
                    />
                  </TH>
                  <TH>{sortButton('event', COPY.columns.event)}</TH>
                  <TH>{COPY.columns.price}</TH>
                  <TH>{sortButton('user', COPY.columns.user)}</TH>
                  <TH>{COPY.columns.status}</TH>
                  <TH>{sortButton('date', COPY.columns.submitted)}</TH>
                  <TH width={150} />
                </tr>
              </THead>
              <tbody>
                {pageRows.map((row) => {
                  const eventLine = row.eventTitle
                    ? [row.eventTitle, row.venueName, row.eventDate]
                        .filter(Boolean)
                        .join(' · ')
                    : `${row.eventId.slice(0, 8)}…`
                  const isPending = row.status === 'pending'
                  return (
                    <TR key={row.id}>
                      <TD width={40}>
                        {isPending && (
                          <input
                            type="checkbox"
                            checked={selected.has(row.id)}
                            onChange={() => toggleRow(row.id)}
                            aria-label={COPY.selectRowAria(eventLine)}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </TD>
                      <TD>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{eventLine}</span>
                          {row.ticketUrl && (
                            <a
                              href={row.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open ticket page"
                              aria-label={COPY.ticketLinkAria(eventLine)}
                              style={{
                                color: 'var(--fg-muted)',
                                display: 'inline-flex',
                              }}
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </span>
                      </TD>
                      <TD mono>{formatPrice(row.priceMin, row.priceMax)}</TD>
                      <TD mono color="var(--accent)">
                        {userDisplay(row.userId)}
                      </TD>
                      <TD>
                        <StatusBadge
                          kind={STATUS_KIND[row.status] ?? 'neutral'}
                        >
                          {statusLabel(row.status)}
                        </StatusBadge>
                      </TD>
                      <TD color="var(--fg-subtle)">
                        <RelTime iso={row.createdAt} />
                      </TD>
                      <TD align="right">
                        {isPending && (
                          <span
                            style={{
                              display: 'inline-flex',
                              gap: 6,
                              justifyContent: 'flex-end',
                            }}
                          >
                            <AdminButton
                              variant="ghost"
                              size="sm"
                              icon={X}
                              onClick={() => patchStatus([row.id], 'disputed')}
                              aria-label={COPY.denyAria(eventLine)}
                            >
                              {COPY.deny}
                            </AdminButton>
                            <AdminButton
                              variant="success"
                              size="sm"
                              icon={Check}
                              onClick={() =>
                                patchStatus([row.id], 'corroborated')
                              }
                              aria-label={COPY.approveAria(eventLine)}
                            >
                              {COPY.approve}
                            </AdminButton>
                          </span>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </tbody>
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                resetToFirstPage()
              }}
              loading={submissionsQuery.isFetching}
              itemLabel={COPY.itemLabel}
            />
          </>
        )}
      </Panel>

      {selectedPendingIds.length > 0 && (
        <BulkActionDock
          count={selectedPendingIds.length}
          onApproveAll={() => patchStatus(selectedPendingIds, 'corroborated')}
          onRejectAll={() => patchStatus(selectedPendingIds, 'disputed')}
        />
      )}
    </div>
  )
}
