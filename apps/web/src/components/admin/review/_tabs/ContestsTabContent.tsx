'use client'

import { type FC, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Pagination } from '@/components/admin/primitives'
import {
  type ContestSortOrder,
  useReviewContestsQuery,
} from '@/lib/queries/admin-contests'
import {
  parsePaginationFromParams,
  serializePaginationToParams,
  EMPTY_PAGINATION,
  type PaginationState,
} from '../all/filters'
import { PriceDisputesQueue } from '../PriceDisputesQueue'
import { REVIEW_CONTEST_COPY } from '../definitions/copy'

// Contests-tab URL keys beyond the shared page/pageSize pair. `sort` and
// `disputes` deep-link the header ghost buttons (#758); other tabs ignore
// both keys, and ReviewPageClient's tab switch only strips pagination, so a
// lingering sort param on another tab is harmless.
const SORT_PARAM = 'sort'
const SORT_DESC = 'filed-at-desc'
const SCOPE_PARAM = 'disputes'
const SCOPE_ALL = 'all'

interface ContestsUrlState {
  pagination: PaginationState
  sortOrder: ContestSortOrder
  showAll: boolean
}

const parseUrlState = (params: URLSearchParams): ContestsUrlState => ({
  pagination: parsePaginationFromParams(params),
  sortOrder: params.get(SORT_PARAM) === SORT_DESC ? SORT_DESC : 'filed-at-asc',
  showAll: params.get(SCOPE_PARAM) === SCOPE_ALL,
})

// Tab body for the Contests review tab. Mounts the queue when there's
// data and surfaces minimal loading / error states off the React Query
// hook. The queue itself auto-hides on empty (spec §7.5 + design
// property table §1 line 15), so we don't render an empty-state message
// here — the tab pill (separate ReviewTabs surface) keeps the (0) badge.
//
// URL search params own all view state (#758 + #759): page/pageSize reuse
// the shared review pagination keys (stripped on tab switch by
// ReviewPageClient), sort + disputes are contests-specific.
export const ContestsTabContent: FC = () => {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams?.toString() ?? '')
  const { pagination, sortOrder, showAll } = parseUrlState(params)

  const pushParams = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString()
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router],
  )

  const onPaginationChange = useCallback(
    (next: PaginationState) => {
      const base = new URLSearchParams(searchParams?.toString() ?? '')
      pushParams(serializePaginationToParams(next, base))
    },
    [pushParams, searchParams],
  )

  // Sort + scope toggles reset to page 1 — flipping either changes which
  // rows exist on every page, so staying on page N would show arbitrary
  // rows. Mirrors the filter-change convention on the All events tab.
  const setListParam = useCallback(
    (key: string, value: string | null) => {
      const base = new URLSearchParams(searchParams?.toString() ?? '')
      if (value === null) base.delete(key)
      else base.set(key, value)
      pushParams(
        serializePaginationToParams(
          { ...EMPTY_PAGINATION, pageSize: pagination.pageSize },
          base,
        ),
      )
    },
    [pagination.pageSize, pushParams, searchParams],
  )

  const { data, isPending, isFetching, isError, refetch } =
    useReviewContestsQuery({
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize,
      sort: sortOrder,
      includeArchived: showAll,
    })

  if (isPending) {
    return (
      <div
        role="status"
        style={{
          padding: 16,
          color: 'var(--fg-muted)',
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {REVIEW_CONTEST_COPY.queue.loading}
      </div>
    )
  }

  if (isError) {
    // Retry button mirrors AdminDisputePanel's error banner so the tab
    // body and the detail panel surface the same affordance for the same
    // failure mode. The button styling is inlined (matching the panel)
    // because Tailwind dark: variants don't play with the admin token
    // palette and there's no shared <ErrorBanner> component yet.
    return (
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
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>{REVIEW_CONTEST_COPY.queue.errorHeading}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          style={{
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            padding: '6px 12px',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {REVIEW_CONTEST_COPY.queue.errorRetry}
        </button>
      </div>
    )
  }

  const items = data?.items ?? []
  const total = data?.total ?? 0

  // Pagination MUST render whenever there's something to page — including
  // the items=[] + total>0 deep-link case (?page=99 past the end), where
  // the Pagination primitive's clamp-sync pushes the URL back to a real
  // page. Same convention as PriceCoverageTable.
  const paginationFooter =
    total > 0 ? (
      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={total}
        onPageChange={(next) =>
          onPaginationChange({ page: next, pageSize: pagination.pageSize })
        }
        onPageSizeChange={(next) =>
          onPaginationChange({ page: 1, pageSize: next })
        }
        // isPending can't be true here (the loading branch returns above);
        // isFetching covers background refetches — e.g. post-mutation
        // invalidation — while the pager is on screen (PR #889 R1).
        loading={isFetching}
        itemLabel={REVIEW_CONTEST_COPY.queue.paginationItemLabel}
      />
    ) : undefined

  // Queue auto-hides on items=[]; render the bare pager in the deep-link
  // recovery case so clamp-sync can run (it corrects the URL on mount).
  if (items.length === 0) {
    return paginationFooter ?? null
  }

  return (
    <PriceDisputesQueue
      items={items}
      total={total}
      sortDirection={sortOrder === SORT_DESC ? 'desc' : 'asc'}
      onSortToggle={() =>
        setListParam(SORT_PARAM, sortOrder === SORT_DESC ? null : SORT_DESC)
      }
      showAllDisputes={showAll}
      onShowAllToggle={() =>
        setListParam(SCOPE_PARAM, showAll ? null : SCOPE_ALL)
      }
      footer={paginationFooter}
    />
  )
}
