'use client';

import type { CSSProperties } from 'react';
import { ExternalLink, Tag } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  EmptyState,
  useIsPhone,
} from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import { VenueTile } from '@/components/consumer/venue-glyph';
import type { MissingRow } from './prices-api';
import { dateTile } from './prices-rules';

const COPY = ADMIN_COPY.pricesPage.missing;
export const MISSING_PAGE_SIZE = 50;
/** The most the API serves in one call. */
export const MISSING_MAX_PER_CALL = 100;

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const linkButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 30,
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  color: 'var(--fg)',
  background: 'var(--surface-2)',
  border: '1px solid var(--border-strong)',
  textDecoration: 'none',
};

const addButtonStyle: CSSProperties = {
  ...linkButtonStyle,
  cursor: 'pointer',
  color: 'var(--signal)',
  background: 'color-mix(in srgb, var(--signal) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--signal) 30%, transparent)',
};

/** The mono weekday over the day number; the Events list draws it too. */
export const DateTile = ({ date }: { date: string }) => {
  const tile = dateTile(date);
  return (
    <div
      aria-hidden="true"
      style={{
        width: 44,
        height: 44,
        flex: 'none',
        borderRadius: 10,
        background: 'var(--surface-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          ...MONO,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'var(--fg-subtle)',
        }}
      >
        {tile?.weekday ?? ''}
      </span>
      <span style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>
        {tile?.day ?? ''}
      </span>
    </div>
  );
};

const AddingPill = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 22,
      padding: '0 10px',
      borderRadius: 999,
      fontSize: 11.5,
      fontWeight: 600,
      color: 'var(--signal)',
      background: 'color-mix(in srgb, var(--signal) 14%, transparent)',
      border: '1px solid color-mix(in srgb, var(--signal) 32%, transparent)',
    }}
  >
    <span
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: 'var(--signal)',
      }}
    />
    {COPY.adding}
  </span>
);

export type LoadMoreState = 'idle' | 'loading' | 'failed';

interface MissingTabProps {
  rows: MissingRow[];
  total: number;
  /** The show whose panel is open, or null. */
  adding: string | null;
  loadState: LoadMoreState;
  onAdd: (row: MissingRow) => void;
  onLoadMore: () => void;
}

/**
 * The Missing a price tab (`06/prices-missing-a-price`, `prices-mobile`): one
 * row per upcoming show without a price, soonest first and most Watched first
 * within a day. A backlog, so no badge and no filters.
 */
export const MissingTab = ({
  rows,
  total,
  adding,
  loadState,
  onAdd,
  onLoadMore,
}: MissingTabProps) => {
  const isPhone = useIsPhone();

  if (total === 0) {
    return (
      <EmptyState icon={Tag} title={COPY.empty.title} body={COPY.empty.body} />
    );
  }

  const list = (
    <ul
      aria-label={COPY.listLabel}
      style={{ listStyle: 'none', margin: 0, padding: 0 }}
    >
      {rows.map((row) => {
        const isOpen = adding === row.eventId;
        return (
          <li
            key={row.eventId}
            style={
              isPhone
                ? {
                    display: 'flex',
                    gap: 12,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border)',
                  }
                : {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 18px',
                    borderTop: '1px solid var(--border)',
                    ...(isOpen
                      ? {
                          background:
                            'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, var(--signal), var(--accent) 50%, var(--border)) border-box',
                          border: '1px solid transparent',
                        }
                      : {}),
                  }
            }
          >
            <DateTile date={row.date} />
            {isPhone ? (
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 14.5,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.title}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  <VenueTile
                    slug={row.venueSlug}
                    name={row.venueName ?? ''}
                    size={18}
                  />
                  <span>
                    {[row.venueName, COPY.watching(row.watching)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SafeExternalLink
                    href={row.ticketUrl}
                    style={{ ...linkButtonStyle, flex: 1, height: 32 }}
                  >
                    {COPY.ticketPage}
                  </SafeExternalLink>
                  <button
                    type="button"
                    onClick={() => onAdd(row)}
                    style={{ ...addButtonStyle, flex: 1, height: 32 }}
                  >
                    {COPY.addPrice}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    flex: 1.6,
                    minWidth: 0,
                    fontSize: 13.5,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.title}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  <VenueTile
                    slug={row.venueSlug}
                    name={row.venueName ?? ''}
                    size={22}
                  />
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.venueName}
                  </span>
                </div>
                <div
                  style={{
                    width: 96,
                    flex: 'none',
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {COPY.watching(row.watching)}
                </div>
                <div
                  style={{
                    width: 250,
                    flex: 'none',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 6,
                  }}
                >
                  {isOpen ? (
                    <AddingPill />
                  ) : (
                    <>
                      <SafeExternalLink
                        href={row.ticketUrl}
                        style={linkButtonStyle}
                      >
                        <ExternalLink size={14} strokeWidth={1.8} />
                        {COPY.ticketPage}
                      </SafeExternalLink>
                      <button
                        type="button"
                        onClick={() => onAdd(row)}
                        style={addButtonStyle}
                      >
                        {COPY.addPrice}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );

  // "209 more" and a Load more button, as the board's footer row.
  const remaining = total - rows.length;
  const pager =
    remaining > 0 ? (
      <div
        data-testid="missing-load-more"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isPhone ? '12px 0' : '12px 18px',
          borderTop: isPhone ? 'none' : '1px solid var(--border)',
          fontSize: 12.5,
          color: 'var(--fg-subtle)',
        }}
      >
        <span>{COPY.moreRows(remaining)}</span>
        <span style={{ flex: 1 }} />
        {loadState === 'failed' && (
          <span role="alert" style={{ color: 'var(--danger)' }}>
            {COPY.loadMoreFailed}
          </span>
        )}
        <AdminButton
          type="button"
          variant="outline"
          size="sm"
          aria-disabled={loadState === 'loading' || undefined}
          onClick={() => {
            if (loadState !== 'loading') onLoadMore();
          }}
        >
          {loadState === 'loading' ? COPY.loadingMore : COPY.loadMore}
        </AdminButton>
      </div>
    ) : null;

  if (isPhone) {
    return (
      <div>
        {list}
        {pager}
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          ...MONO,
          display: 'flex',
          gap: 12,
          padding: '12px 18px',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        <span style={{ width: 44, flex: 'none' }}>{COPY.columns.date}</span>
        <span style={{ flex: 1.6 }}>{COPY.columns.show}</span>
        <span style={{ flex: 1 }}>{COPY.columns.venue}</span>
        <span style={{ width: 96, flex: 'none' }}>{COPY.columns.watching}</span>
        <span style={{ width: 250, flex: 'none' }} />
      </div>
      {list}
      {pager}
    </div>
  );
};
