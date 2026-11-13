'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api';
import { SectionHead } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useInvalidateReviewQueries } from '@/lib/queries/use-admin-review';
import { AdminReviewMobile } from './AdminReviewMobile';
import { ReviewTabs } from './ReviewTabs';
import { editEventHref } from '@/lib/admin/edit-event-link';
import {
  isReviewTabKey,
  resolveReviewTab,
  type ReviewTabKey,
} from '@/lib/admin/review-tabs';
import { buildReviewTabs } from './lib/build-review-tabs';
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
  /** The Needs you decision count (the sidebar badge's source). */
  decisions: number;
}

export const ReviewPageClient = ({ decisions }: ReviewPageClientProps) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
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

  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    setIsDesktop(mq.matches);
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // The decisions waiting are Needs you's, not this page's tabs: the pill and
  // the mobile subtitle read the same count as the sidebar badge.
  const pendingCount = decisions;

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
          {ADMIN_COPY.review.reviewPageClient.mobileSubtitle(pendingCount)}
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
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <AdminReviewMobile
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

  const tabs = buildReviewTabs();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {sectionHead}

      <ReviewTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        aria-label={ADMIN_COPY.review.tabs.ariaLabel}
      />

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
