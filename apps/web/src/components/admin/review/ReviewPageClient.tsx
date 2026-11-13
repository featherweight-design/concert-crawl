'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api';
import { SectionHead } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  reviewQueryKeys,
  useInvalidateReviewQueries,
  useReviewCounts,
  useReviewPriceEvents,
  type PriceEvent,
  type ReviewCounts,
} from '@/lib/queries/use-admin-review';
import { useQueryClient } from '@tanstack/react-query';
import { type PriceSubmissionHistoryRow } from '@/lib/queries/use-admin-price-submissions';
import { AdminReviewMobile } from './AdminReviewMobile';
import { ReviewTabs } from './ReviewTabs';
import { editEventHref } from '@/lib/admin/edit-event-link';
import {
  isReviewTabKey,
  resolveReviewTab,
  type ReviewTabKey,
} from '@/lib/admin/review-tabs';
import { buildReviewTabs } from './lib/build-review-tabs';
import { computePendingCount } from '@/lib/admin/review-pending';
import { PricesTabContent } from './_tabs/PricesTabContent';
import { SubmissionsTabContent } from './_tabs/SubmissionsTabContent';
import { AllEventsTabContent } from './_tabs/AllEventsTabContent';
import {
  EMPTY_PAGINATION,
  parseFiltersFromParams,
  parsePaginationFromParams,
  serializeFiltersToParams,
  serializePaginationToParams,
  type PaginationState,
} from './all/filters';
import { type AllEvent } from './all/types';

interface ReviewPageClientProps {
  initialSubmissions: PriceSubmissionHistoryRow[];
  initialSubmissionsTotal: number;
  initialCounts: ReviewCounts;
}

export const ReviewPageClient = ({
  initialSubmissions,
  initialSubmissionsTotal,
  initialCounts,
}: ReviewPageClientProps) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateReviewQueries();

  // Push helper — pushing an empty query string leaves a trailing "?" in
  // the URL, so route through pathname when there are no params.
  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );
  const activeTab: ReviewTabKey = resolveReviewTab(
    new URLSearchParams(searchParams?.toString() ?? ''),
  );

  // Pagination state is parsed straight out of the URL — one (page, pageSize)
  // shared across whichever tab is active. Switching tabs strips the keys so
  // each tab opens at page 1 (sitting on page 40 of the previous tab's data
  // is never what the admin wants).
  const pagination: PaginationState = parsePaginationFromParams(
    new URLSearchParams(searchParams?.toString() ?? ''),
  );

  const onPaginationChange = useCallback(
    (next: PaginationState) => {
      const base = new URLSearchParams(searchParams?.toString() ?? '');
      pushParams(serializePaginationToParams(next, base));
    },
    [pushParams, searchParams],
  );

  const setActiveTab = useCallback(
    (next: string) => {
      if (!isReviewTabKey(next)) return;
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', next);
      params.delete('section'); // retire legacy key once user navigates
      // Each tab opens at its own page 1 — strip pagination from the URL.
      pushParams(serializePaginationToParams(EMPTY_PAGINATION, params));
    },
    [pushParams, searchParams],
  );

  const [priceFilter, setPriceFilter] = useState<'missing' | 'all'>('missing');
  const [error, setError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  // Price coverage: keyed by both the filter toggle and the current page so
  // flipping the toggle resets to page 1 cleanly (handled in togglePriceFilter).
  // Desktop only fetches when the prices tab is active; mobile renders every
  // surface through a single shell (AdminReviewMobile owns the visible tab),
  // so the query stays enabled there.
  const priceEventsQuery = useReviewPriceEvents(
    priceFilter,
    pagination,
    !isDesktop || activeTab === 'prices',
  );
  const priceEventsTotal = priceEventsQuery.data?.total ?? 0;
  const priceEvents: PriceEvent[] = priceEventsQuery.data?.rows ?? [];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    setIsDesktop(mq.matches);
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const togglePriceFilter = useCallback(() => {
    setPriceFilter((prev) => (prev === 'missing' ? 'all' : 'missing'));
    // Reset to page 1 — page 5 of "missing" rarely lines up with page 5 of "all".
    onPaginationChange({ page: 1, pageSize: pagination.pageSize });
  }, [onPaginationChange, pagination.pageSize]);

  // Tab-pill counts. SSR seeds initial values so the numbers paint on first
  // render; subsequent mutations call `invalidate.counts()` to refresh.
  const countsQuery = useReviewCounts(initialCounts);
  const counts = countsQuery.data ?? initialCounts;

  const addPrice = useCallback(
    async (
      eventId: string,
      priceMin: string,
      priceMax: string | null,
      vendor: string,
      howFound: string,
    ) => {
      setError(null);
      try {
        const token = await getToken();
        if (!token) return;
        await apiClient.post('/v1/admin/prices/submissions', token, {
          eventId,
          priceMin,
          ...(priceMax !== null && { priceMax }),
          vendor,
          howFound,
        });
        // Optimistic patch on the active price-events cache slot: the row
        // that just got a price gets the new min/max + 'community' source so
        // the admin sees the change without waiting on a refetch. The
        // invalidate below sweeps every (page, pageSize) slot so the truth
        // wins eventually.
        queryClient.setQueryData<{
          rows: PriceEvent[];
          total: number;
        }>(
          reviewQueryKeys.priceEvents(
            priceFilter,
            pagination.page,
            pagination.pageSize,
          ),
          (prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              rows: prev.rows.map((ev) =>
                ev.eventId === eventId
                  ? { ...ev, priceMin, priceMax, priceSource: 'community' }
                  : ev,
              ),
            };
          },
        );
        void invalidate.priceEvents();
        void invalidate.counts();
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to save price.';
        console.error('addPrice error:', err);
        setError(message);
      }
    },
    [
      getToken,
      invalidate,
      pagination.page,
      pagination.pageSize,
      priceFilter,
      queryClient,
    ],
  );

  // Pending count formula is extracted so a unit test can pin it — see
  // lib/admin/review-pending.ts. Server-driven counts so the number
  // stays accurate beyond the first page of any individual tab.
  const pendingCount = computePendingCount(counts);

  const sectionHead = (
    <SectionHead
      eyebrow={ADMIN_COPY.review.reviewPageClient.eyebrow}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {ADMIN_COPY.review.reviewPageClient.title}
          {pendingCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '3px 10px',
                borderRadius: 20,
                border: '1.5px solid var(--warning)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--warning)',
                letterSpacing: 0,
                lineHeight: 1.4,
              }}
            >
              {pendingCount} pending
            </span>
          )}
        </span>
      }
      subtitle={ADMIN_COPY.review.reviewPageClient.subtitle}
    />
  );

  const allEventsApi = {
    verify: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.patch(`/v1/admin/events/${event.id}/verify`, token, {});
      void invalidate.eventFlags();
      void invalidate.counts();
    },
    unverify: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
        verified: false,
      });
      void invalidate.eventFlags();
      void invalidate.counts();
    },
    setStatus: async (
      event: AllEvent,
      status: 'upcoming' | 'cancelled' | 'postponed',
    ) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, { status });
    },
    markSoldOut: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post(`/v1/admin/events/${event.id}/sold-out`, token, {});
    },
    markAvailable: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post(`/v1/admin/events/${event.id}/available`, token, {});
    },
    markNonConcert: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
        hiddenFromConsumer: true,
      });
    },
    deleteEvent: async (event: AllEvent) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.delete(`/v1/admin/events/${event.id}`, token);
      void invalidate.eventFlags();
      void invalidate.counts();
    },
    bulkUnverify: async (ids: string[]) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post('/v1/admin/events/bulk/unverify', token, { ids });
      void invalidate.eventFlags();
      void invalidate.counts();
    },
    bulkMarkNonConcert: async (ids: string[]) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post('/v1/admin/events/bulk/mark-non-concert', token, {
        ids,
      });
    },
    bulkMarkAsConcert: async (ids: string[]) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post('/v1/admin/events/bulk/mark-as-concert', token, {
        ids,
      });
    },
    bulkDelete: async (ids: string[]) => {
      const token = await getToken();
      if (!token) throw new ApiError(401, 'Unauthorized');
      await apiClient.post('/v1/admin/events/bulk/delete', token, {
        ids,
        confirmation: 'DELETE',
      });
      void invalidate.eventFlags();
      void invalidate.counts();
    },
  };

  // Callers inside Review pass `activeTab` so the editor's topbar breadcrumb
  // takes the admin back to whichever tab they came from (#1083).
  const onAllEventsEdit = (event: AllEvent) =>
    router.push(editEventHref(event.id, activeTab));
  const onAllEventsViewDetail = (event: AllEvent) => {
    window.open(`/events/${event.id}`, '_blank', 'noopener,noreferrer');
  };

  const errorBanner = error && (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid color-mix(in oklab, var(--danger) 30%, transparent)',
        background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
        fontSize: 13,
        color: 'var(--danger)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {error}
    </div>
  );

  if (!isDesktop) {
    const mobileSectionHead = (
      <div style={{ padding: '4px 0' }}>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--fg)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 4,
          }}
        >
          {ADMIN_COPY.review.reviewPageClient.mobileTitle}
        </div>
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          {ADMIN_COPY.review.reviewPageClient.mobileSubtitle(
            counts.eventFlags,
            counts.prices,
            counts.missing,
          )}
        </div>
      </div>
    );

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: 16,
        }}
      >
        <div style={{ flexShrink: 0 }}>{mobileSectionHead}</div>
        {errorBanner && <div style={{ flexShrink: 0 }}>{errorBanner}</div>}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AdminReviewMobile
            priceEvents={priceEvents}
            onAddPrice={addPrice}
            initialTab={activeTab}
            submissionsCount={counts.prices}
            initialSubmissions={initialSubmissions}
            initialSubmissionsTotal={initialSubmissionsTotal}
            pricesMissingOnly={priceFilter === 'missing'}
            priceEventsPage={pagination.page}
            priceEventsPageSize={pagination.pageSize}
            priceEventsTotal={priceEventsTotal}
            priceEventsLoading={priceEventsQuery.isFetching}
            onTogglePriceFilter={togglePriceFilter}
            onPriceEventsPageChange={(next) =>
              onPaginationChange({ page: next, pageSize: pagination.pageSize })
            }
            onPriceEventsPageSizeChange={(next) =>
              onPaginationChange({ page: 1, pageSize: next })
            }
            onAllEventsRowClick={(id) =>
              router.push(editEventHref(id, activeTab))
            }
            allEventsFilters={parseFiltersFromParams(
              new URLSearchParams(searchParams?.toString() ?? ''),
            )}
            onAllEventsFiltersChange={(next) => {
              const base = new URLSearchParams(searchParams?.toString() ?? '');
              const merged = serializeFiltersToParams(next, base);
              merged.set('tab', 'all-events');
              // Reset pagination in the same push so changing filters
              // doesn't briefly retain a stale ?page=N. See PR #702
              // comment #28.
              pushParams(serializePaginationToParams(EMPTY_PAGINATION, merged));
            }}
            allEventsPagination={pagination}
            onAllEventsPaginationChange={onPaginationChange}
            allEventsApi={allEventsApi}
            onAllEventsEdit={onAllEventsEdit}
            onAllEventsViewDetail={onAllEventsViewDetail}
          />
        </div>
      </div>
    );
  }

  const tabs = buildReviewTabs(counts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sectionHead}
      {errorBanner}

      <ReviewTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label={ADMIN_COPY.review.tabs.ariaLabel}
      />

      {activeTab === 'prices' && (
        <PricesTabContent
          priceEvents={priceEvents}
          priceEventsLoading={priceEventsQuery.isPending}
          pricesMissingOnly={priceFilter === 'missing'}
          onTogglePriceFilter={togglePriceFilter}
          priceEventsPage={pagination.page}
          priceEventsPageSize={pagination.pageSize}
          priceEventsTotal={priceEventsTotal}
          onPriceEventsPageChange={(next) =>
            onPaginationChange({ page: next, pageSize: pagination.pageSize })
          }
          onPriceEventsPageSizeChange={(next) =>
            onPaginationChange({ page: 1, pageSize: next })
          }
          onAddPrice={addPrice}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsTabContent
          initialSubmissions={initialSubmissions}
          initialTotal={initialSubmissionsTotal}
        />
      )}

      {activeTab === 'all-events' && (
        <AllEventsTabContent
          isDesktop
          onRowClick={(id) => router.push(editEventHref(id, activeTab))}
          onEdit={onAllEventsEdit}
          onViewDetail={onAllEventsViewDetail}
          api={allEventsApi}
          filters={parseFiltersFromParams(
            new URLSearchParams(searchParams?.toString() ?? ''),
          )}
          onFiltersChange={(next) => {
            const base = new URLSearchParams(searchParams?.toString() ?? '');
            const merged = serializeFiltersToParams(next, base);
            merged.set('tab', 'all-events');
            // Filter changes reset pagination in the same push — see
            // PR #702 comment #28.
            pushParams(serializePaginationToParams(EMPTY_PAGINATION, merged));
          }}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}
    </div>
  );
};
