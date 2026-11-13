'use client';

import { useState } from 'react';
import {
  AdminButton,
  Pagination,
  StatusBadge,
} from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AllEventsTabContent,
  type AllEventsApi,
} from './_tabs/AllEventsTabContent';
import {
  SubmissionsTabContent,
  type SubmissionsTabContentProps,
} from './_tabs/SubmissionsTabContent';
import { type ReviewTabKey } from '@/lib/admin/review-tabs';
import { EMPTY_FILTERS, type AllEventsFilters } from './all/filters';
import { type AllEvent } from './all/types';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';

interface PriceEvent {
  eventId: string;
  eventTitle: string;
  artist: string | null;
  venueName: string | null;
  date: string;
  ticketUrl: string | null;
  priceMin: string | null;
  priceMax: string | null;
  priceSource: string | null;
  lastRetrievedAt: string | null;
  lastOutcome: string | null;
}

interface AdminReviewMobileProps {
  priceEvents: PriceEvent[];
  onAddPrice?: (
    eventId: string,
    priceMin: string,
    priceMax: string | null,
    vendor: string,
    howFound: string,
  ) => Promise<void>;
  initialTab?: ReviewTabKey;
  // Server count, not a page length.
  submissionsCount?: number;
  initialSubmissions?: SubmissionsTabContentProps['initialSubmissions'];
  initialSubmissionsTotal?: SubmissionsTabContentProps['initialTotal'];
  pricesMissingOnly: boolean;
  priceEventsPage: number;
  priceEventsPageSize: number;
  priceEventsTotal: number;
  // `isFetching` on the price-events query. The underlying React Query
  // uses `placeholderData: (prev) => prev`, so during an all → missing
  // toggle `priceEventsTotal` momentarily reflects the previous filter's
  // total; gating the badge on this flag keeps it hidden until the new
  // request resolves.
  priceEventsLoading?: boolean;
  onTogglePriceFilter: () => void;
  onPriceEventsPageChange: (next: number) => void;
  onPriceEventsPageSizeChange: (next: number) => void;
  onAllEventsRowClick?: (id: string) => void;
  allEventsFilters?: AllEventsFilters;
  onAllEventsFiltersChange?: (next: AllEventsFilters) => void;
  allEventsPagination?: { page: number; pageSize: number };
  onAllEventsPaginationChange?: (next: {
    page: number;
    pageSize: number;
  }) => void;
  allEventsApi?: AllEventsApi;
  onAllEventsEdit?: (event: AllEvent) => void;
  onAllEventsViewDetail?: (event: AllEvent) => void;
}

function NeedsPriceRow({
  event,
  onAddPrice,
}: {
  event: PriceEvent;
  onAddPrice?: AdminReviewMobileProps['onAddPrice'];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [vendor, setVendor] = useState('Ticketmaster');
  const [howFound, setHowFound] = useState('saw_listing');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!priceMin.trim() || !onAddPrice) return;
    setIsSaving(true);
    try {
      await onAddPrice(
        event.eventId,
        priceMin.trim(),
        priceMax.trim() || null,
        vendor,
        howFound,
      );
      setIsAdding(false);
      setPriceMin('');
      setPriceMax('');
      setVendor('Ticketmaster');
      setHowFound('saw_listing');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--fg)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {event.eventTitle}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              color: 'var(--fg-muted)',
              marginTop: 2,
            }}
          >
            {event.venueName ?? '—'} ·{' '}
            {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          {event.ticketUrl && (
            <SafeExternalLink
              href={event.ticketUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                marginTop: 4,
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--signal)',
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 14 }}>↗</span>
              {ADMIN_COPY.review.adminReviewMobile.buyTickets}
            </SafeExternalLink>
          )}
        </div>
        {event.priceMin !== null ? (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--fg)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            ${Math.round(parseFloat(event.priceMin))}
            {event.priceMax
              ? `–$${Math.round(parseFloat(event.priceMax))}`
              : ''}
          </span>
        ) : (
          !isAdding &&
          onAddPrice && (
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              + Add
            </AdminButton>
          )
        )}
      </div>

      {isAdding && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {/* Row 1: price inputs + selects */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              placeholder={
                ADMIN_COPY.review.adminReviewMobile.priceLowPlaceholder
              }
              value={priceMin}
              onChange={(evt) => setPriceMin(evt.target.value)}
              min={0}
              step={1}
              style={{
                width: 72,
                flexShrink: 0,
                height: 30,
                padding: '0 8px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <input
              type="number"
              placeholder={
                ADMIN_COPY.review.adminReviewMobile.priceHighPlaceholder
              }
              value={priceMax}
              onChange={(evt) => setPriceMax(evt.target.value)}
              min={0}
              step={1}
              style={{
                width: 72,
                flexShrink: 0,
                height: 30,
                padding: '0 8px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'JetBrains Mono', monospace",
                outline: 'none',
              }}
            />
            <select
              value={vendor}
              onChange={(evt) => setVendor(evt.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: 30,
                padding: '0 6px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            >
              <option value="Ticketmaster">
                {ADMIN_COPY.review.adminReviewMobile.vendorOptions.ticketmaster}
              </option>
              <option value="AXS">
                {ADMIN_COPY.review.adminReviewMobile.vendorOptions.axs}
              </option>
              <option value="SeatGeek">
                {ADMIN_COPY.review.adminReviewMobile.vendorOptions.seatgeek}
              </option>
              <option value="DICE">
                {ADMIN_COPY.review.adminReviewMobile.vendorOptions.dice}
              </option>
              <option value="Eventbrite">
                {ADMIN_COPY.review.adminReviewMobile.vendorOptions.eventbrite}
              </option>
              <option value="VenueBoxOffice">
                {
                  ADMIN_COPY.review.adminReviewMobile.vendorOptions
                    .venueBoxOffice
                }
              </option>
            </select>
            <select
              value={howFound}
              onChange={(evt) => setHowFound(evt.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: 30,
                padding: '0 6px',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
                color: 'var(--fg)',
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            >
              <option value="saw_listing">
                {ADMIN_COPY.review.adminReviewMobile.howFoundOptions.sawListing}
              </option>
              <option value="bought_myself">
                {
                  ADMIN_COPY.review.adminReviewMobile.howFoundOptions
                    .boughtMyself
                }
              </option>
              <option value="at_the_venue">
                {ADMIN_COPY.review.adminReviewMobile.howFoundOptions.atTheVenue}
              </option>
            </select>
          </div>
          {/* Row 2: actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <AdminButton
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setIsAdding(false)}
              disabled={isSaving}
            >
              {ADMIN_COPY.review.adminReviewMobile.cancel}
            </AdminButton>
            <AdminButton
              variant="success"
              size="sm"
              fullWidth
              onClick={() => void handleSave()}
              disabled={isSaving || !priceMin.trim()}
            >
              {isSaving
                ? ADMIN_COPY.review.adminReviewMobile.saving
                : ADMIN_COPY.review.adminReviewMobile.save}
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReviewMobile({
  priceEvents,
  onAddPrice,
  initialTab = 'prices',
  submissionsCount = 0,
  initialSubmissions = [],
  initialSubmissionsTotal = 0,
  pricesMissingOnly,
  priceEventsPage,
  priceEventsPageSize,
  priceEventsTotal,
  priceEventsLoading = false,
  onTogglePriceFilter,
  onPriceEventsPageChange,
  onPriceEventsPageSizeChange,
  onAllEventsRowClick,
  allEventsFilters,
  onAllEventsFiltersChange,
  allEventsPagination,
  onAllEventsPaginationChange,
  allEventsApi,
  onAllEventsEdit,
  onAllEventsViewDetail,
}: AdminReviewMobileProps) {
  const [activeTab, setActiveTab] = useState<ReviewTabKey>(initialTab);

  const onTabChange = (key: ReviewTabKey) => {
    setActiveTab(key);
  };

  const noopRowClick = (_id: string): void => undefined;

  // #1080 — the "Needs price" badge and Prices/Missing tab counts previously
  // used `priceEvents.filter((ev) => ev.priceMin === null).length` and
  // `missingEvents.length`, which count only the current paginated page —
  // showing "20" when the true total is 1,183. When `pricesMissingOnly` is
  // on, `priceEventsTotal` IS the server-side count of events needing a
  // price; when off, we can't derive that number from the fetched slice,
  // so mirror the desktop PriceCoverageTable pattern (#710) and hide the
  // badge. Also gate on `!priceEventsLoading` — the query uses
  // `placeholderData: (prev) => prev`, so during a filter toggle the badge
  // would flash the previous filter's total until the new request resolved.
  // The dropdown tab counts for Prices and Missing were dropped in #1079
  // on desktop for the same accuracy reason — this keeps mobile in parity.
  const needsPriceTotal =
    !priceEventsLoading && pricesMissingOnly && priceEventsTotal > 0
      ? priceEventsTotal
      : null;

  const tabOptions = [
    {
      key: 'prices',
      label: ADMIN_COPY.review.tabs.prices,
      count: 0,
    },
    {
      key: 'submissions',
      label: ADMIN_COPY.review.tabs.submissions,
      count: submissionsCount,
    },
    { key: 'all-events', label: ADMIN_COPY.review.tabs.allEvents, count: 0 },
  ] as const;

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    overflow: 'hidden',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: 16,
      }}
    >
      {/*
        Tab switcher — a native <select> rather than a pill row. Keeps
        the mobile shell one control tall and mirrors the below-`sm` fallback
        in ReviewTabs (the desktop surface). #1028
      */}
      <select
        aria-label={ADMIN_COPY.review.tabs.ariaLabel}
        value={activeTab}
        onChange={(evt) => {
          const next = tabOptions.find((opt) => opt.key === evt.target.value);
          if (next) onTabChange(next.key);
        }}
        style={{
          flexShrink: 0,
          width: '100%',
          padding: '10px 12px',
          background: 'var(--surface-1)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--fg)',
        }}
      >
        {tabOptions.map(({ key, label, count }) => (
          <option key={key} value={key}>
            {count > 0 ? `${label} (${count})` : label}
          </option>
        ))}
      </select>

      {/* Price coverage tab — the needs-price table fills the available height */}
      {activeTab === 'prices' && (
        <div
          style={{
            ...cardStyle,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '12px 16px 10px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg)',
              }}
            >
              {ADMIN_COPY.review.adminReviewMobile.needsPrice}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AdminButton
                variant={pricesMissingOnly ? 'outline' : 'ghost'}
                size="sm"
                onClick={onTogglePriceFilter}
              >
                {ADMIN_COPY.review.adminReviewMobile.missingOnly}
              </AdminButton>
              {needsPriceTotal !== null && (
                <StatusBadge kind="warning">{needsPriceTotal}</StatusBadge>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {priceEventsTotal === 0 ? (
              <div
                style={{
                  padding: '12px 16px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13,
                  color: 'var(--fg-subtle)',
                }}
              >
                {pricesMissingOnly
                  ? ADMIN_COPY.review.adminReviewMobile.allHavePrices
                  : ADMIN_COPY.review.adminReviewMobile.noUpcomingEvents}
              </div>
            ) : (
              <>
                {priceEvents.map((ev) => (
                  <NeedsPriceRow
                    key={ev.eventId}
                    event={ev}
                    onAddPrice={onAddPrice}
                  />
                ))}
                {(priceEventsTotal > priceEventsPageSize ||
                  priceEventsPage > 1) && (
                  <Pagination
                    page={priceEventsPage}
                    pageSize={priceEventsPageSize}
                    total={priceEventsTotal}
                    onPageChange={onPriceEventsPageChange}
                    onPageSizeChange={onPriceEventsPageSizeChange}
                    itemLabel="events"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Submissions tab — the same surface desktop renders, so the two
          shells stay in parity rather than diverging into a mobile-only
          card list. */}
      {activeTab === 'submissions' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <SubmissionsTabContent
            initialSubmissions={initialSubmissions}
            initialTotal={initialSubmissionsTotal}
          />
        </div>
      )}

      {activeTab === 'all-events' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <AllEventsTabContent
            isDesktop={false}
            onRowClick={onAllEventsRowClick ?? noopRowClick}
            filters={allEventsFilters ?? EMPTY_FILTERS}
            onFiltersChange={onAllEventsFiltersChange ?? (() => undefined)}
            {...(allEventsPagination
              ? { pagination: allEventsPagination }
              : {})}
            {...(onAllEventsPaginationChange
              ? { onPaginationChange: onAllEventsPaginationChange }
              : {})}
            {...(allEventsApi ? { api: allEventsApi } : {})}
            {...(onAllEventsEdit ? { onEdit: onAllEventsEdit } : {})}
            {...(onAllEventsViewDetail
              ? { onViewDetail: onAllEventsViewDetail }
              : {})}
          />
        </div>
      )}
    </div>
  );
}
