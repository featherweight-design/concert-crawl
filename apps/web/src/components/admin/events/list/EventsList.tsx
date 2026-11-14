'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { RowMenu, useIsPhone } from '@/components/admin/primitives';
import { StatusChip } from '@/components/consumer/StatusChip';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { eventCanonicalPath } from '@/lib/share/event-metadata';
import { DateTile } from '../../prices/MissingTab';
import type { EventListRow } from './events-api';
import { STATUS_CHIP, formatPrice, type When } from './events-rules';

const COPY = ADMIN_COPY.eventsList;

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const ellipsis: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/**
 * The status chip, and for a hidden show a second Hidden chip with its reason
 * (4b#8: the status stays, Hidden is separate).
 */
export const StatusChips = ({
  row,
  align = 'start',
}: {
  row: EventListRow;
  align?: 'start' | 'end';
}) => (
  <span
    style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
      gap: 6,
    }}
  >
    <StatusChip
      status={STATUS_CHIP[row.status]}
      label={COPY.status[row.status]}
    />
    {row.hidden && (
      <StatusChip
        status="hidden"
        label={COPY.hiddenReason[row.hiddenReason ?? 'admin']}
      />
    )}
  </span>
);

/** A table cell keeps one line; a phone card wraps the name, never cuts it. */
const VenueLine = ({
  row,
  size,
  wrap = false,
}: {
  row: EventListRow;
  size: number;
  wrap?: boolean;
}) => (
  <span
    style={{
      display: 'flex',
      alignItems: wrap ? 'flex-start' : 'center',
      gap: 8,
      minWidth: 0,
      fontSize: 13,
      color: 'var(--fg-muted)',
    }}
  >
    {row.venueSlug !== null && (
      <span style={{ flex: 'none', display: 'inline-flex' }}>
        <VenueTile
          slug={row.venueSlug}
          name={row.venueName ?? ''}
          size={size}
        />
      </span>
    )}
    <span style={wrap ? { minWidth: 0 } : ellipsis}>{row.venueName}</span>
  </span>
);

/**
 * The row's ⋯ (`06/event-menu`). Only the lines whose action exists today:
 * View on the venue's site shows when the row has a safe venue page
 * (`venueUrl`); Open the crawl run is dropped (4b#3); Merge lands in 4b-4,
 * and Hide and Delete with their dialogs.
 */
const EventMenu = ({ row }: { row: EventListRow }) => {
  const router = useRouter();
  const { venueUrl } = row;
  return (
    <RowMenu
      label={COPY.menu.label(row.title)}
      testId="event-row-menu"
      items={[
        {
          key: 'edit',
          icon: Calendar,
          label: COPY.menu.edit,
          hint: COPY.menu.editHint,
          onSelect: () => router.push(editEventHref(row.id)),
        },
        {
          key: 'view-fan',
          icon: ExternalLink,
          label: COPY.menu.viewFan,
          hint: COPY.menu.viewFanHint,
          onSelect: () => {
            window.open(eventCanonicalPath(row.id), '_blank', 'noopener');
          },
        },
        ...(venueUrl
          ? [
              {
                key: 'view-venue',
                icon: ExternalLink,
                label: COPY.menu.viewVenue,
                hint: COPY.menu.viewVenueHint,
                onSelect: () => {
                  window.open(venueUrl, '_blank', 'noopener');
                },
              },
            ]
          : []),
      ]}
    />
  );
};

const watchingText = (row: EventListRow): string =>
  row.hidden ? COPY.none : row.watchingCount.toLocaleString('en-US');

const wentText = (row: EventListRow): string =>
  row.wentCount === null || row.wentCount === 0
    ? COPY.none
    : COPY.went(row.wentCount);

const th: CSSProperties = {
  ...MONO,
  padding: '14px 12px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  textAlign: 'left',
  color: 'var(--fg-subtle)',
};

const td: CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid var(--border)',
  verticalAlign: 'middle',
};

const DesktopTable = ({ rows, when }: { rows: EventListRow[]; when: When }) => {
  const past = when === 'past';
  return (
    <table
      aria-label={COPY.title}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
      }}
    >
      <colgroup>
        <col style={{ width: 74 }} />
        <col />
        <col style={{ width: '19%' }} />
        <col style={{ width: 164 }} />
        <col style={{ width: 132 }} />
        <col style={{ width: past ? 96 : 84 }} />
        {!past && <col style={{ width: 52 }} />}
      </colgroup>
      <thead>
        <tr>
          <th style={{ ...th, paddingLeft: 18 }}>{COPY.columns.date}</th>
          <th style={th}>{COPY.columns.show}</th>
          <th style={th}>{COPY.columns.venue}</th>
          <th style={th}>{COPY.columns.status}</th>
          <th style={th}>{COPY.columns.price}</th>
          <th style={th}>
            {past ? COPY.columns.concerts : COPY.columns.watching}
          </th>
          {!past && <th style={th} aria-hidden="true" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const price = formatPrice(row.priceMin, row.priceMax);
          return (
            <tr key={row.id} data-testid="event-row">
              <td style={{ ...td, paddingLeft: 18 }}>
                <DateTile date={row.date} />
              </td>
              <td style={td}>
                <div
                  style={{
                    ...ellipsis,
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--fg)',
                  }}
                >
                  {row.title}
                </div>
              </td>
              <td style={td}>
                <VenueLine row={row} size={22} />
              </td>
              <td style={td}>
                <StatusChips row={row} />
              </td>
              <td
                style={{
                  ...td,
                  fontSize: 13.5,
                  whiteSpace: 'nowrap',
                  color:
                    price === null || past ? 'var(--fg-muted)' : 'var(--fg)',
                }}
              >
                {price ?? COPY.none}
              </td>
              <td
                style={{
                  ...td,
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  color: 'var(--fg-muted)',
                }}
              >
                {past ? wentText(row) : watchingText(row)}
              </td>
              {!past && (
                <td style={{ ...td, textAlign: 'right', paddingRight: 14 }}>
                  <EventMenu row={row} />
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const PhoneCard = ({ row, when }: { row: EventListRow; when: When }) => {
  const price = formatPrice(row.priceMin, row.priceMax);
  const past = when === 'past';
  // A hidden card has no Watching line (`06/events-mobile`).
  const countLine = past
    ? row.wentCount
      ? COPY.went(row.wentCount)
      : null
    : row.hidden
      ? null
      : COPY.watching(row.watchingCount);
  const body = (
    <>
      <DateTile date={row.date} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)' }}>
          {row.title}
        </div>
        <VenueLine row={row} size={18} wrap />
      </div>
      <div
        style={{
          flex: 'none',
          maxWidth: '46%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          textAlign: 'right',
        }}
      >
        <span
          style={{
            fontSize: 14.5,
            fontWeight: price === null ? 500 : 700,
            color: price === null ? 'var(--fg-muted)' : 'var(--fg)',
          }}
        >
          {price ?? COPY.phoneNoPrice}
        </span>
        {countLine !== null && (
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
            {countLine}
          </span>
        )}
        <StatusChips row={row} align="end" />
      </div>
    </>
  );
  const cardStyle: CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '14px 0',
    color: 'inherit',
    textDecoration: 'none',
  };
  return (
    <li style={{ borderBottom: '1px solid var(--border)' }}>
      {/* A past card does not open the editor: how a past show reaches its
          edit view is undrawn (held for Design). */}
      {past ? (
        <div style={cardStyle}>{body}</div>
      ) : (
        <Link href={editEventHref(row.id)} style={cardStyle}>
          {body}
        </Link>
      )}
    </li>
  );
};

/**
 * The rows of `06/events` (desktop table) and `06/events-mobile` (cards, no
 * ⋯: a card opens the editor), and on Past `06/past-shows` (CONCERTS in place
 * of WATCHING, no ⋯).
 */
export const EventsList = ({
  rows,
  when,
}: {
  rows: EventListRow[];
  when: When;
}) => {
  const isPhone = useIsPhone();
  if (isPhone) {
    return (
      <ul
        aria-label={COPY.title}
        data-testid="events-list"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {rows.map((row) => (
          <PhoneCard key={row.id} row={row} when={when} />
        ))}
      </ul>
    );
  }
  return (
    <div data-testid="events-list">
      <DesktopTable rows={rows} when={when} />
    </div>
  );
};
