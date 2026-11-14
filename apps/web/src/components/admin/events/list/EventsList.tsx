'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { RowMenu, useIsPhone } from '@/components/admin/primitives';
import { StatusChip } from '@/components/consumer/StatusChip';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { eventCanonicalPath } from '@/lib/share/event-metadata';
import { DateTile } from '../../prices/MissingTab';
import { HideEventDialog } from '../edit/StatusCard';
import type { EventListRow } from './events-api';
import { STATUS_CHIP, formatPrice, type When } from './events-rules';

const COPY = ADMIN_COPY.eventsList;
const HIDE_COPY = ADMIN_COPY.eventEdit.hide;

const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const ellipsis: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** The show's one status, as the fan app's `StatusChip` (addendum 5, §2). */
export const EventStatusChip = ({
  row,
}: {
  /** A list row or Event edit's detail: both carry it. */
  row: Pick<EventListRow, 'status'>;
}) => (
  <StatusChip
    status={STATUS_CHIP[row.status]}
    label={COPY.status[row.status]}
  />
);

/**
 * Hidden is not a status (addendum 5, §2): a hidden show keeps its status
 * chip and gets this muted tag under its title, "HIDDEN · UNSURE" or
 * "HIDDEN · BY ADMIN" (`02/events-statuschip-d`, `-m`).
 */
export const HiddenTag = ({
  row,
}: {
  row: Pick<EventListRow, 'hidden' | 'hiddenReason'>;
}) =>
  row.hidden ? (
    <span
      data-testid="hidden-tag"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        minWidth: 0,
        color: 'var(--fg-subtle)',
      }}
    >
      <Eye
        size={12}
        strokeWidth={1.6}
        aria-hidden="true"
        style={{ flex: 'none', display: 'block' }}
      />
      <span
        style={{
          ...MONO,
          ...ellipsis,
          fontSize: 9,
          letterSpacing: '0.1em',
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        {COPY.hiddenTag[row.hiddenReason ?? 'admin']}
      </span>
    </span>
  ) : null;

/**
 * Event edit's header: the status chip and, for a hidden show, a Hidden chip
 * (4b#8). The header with the list's tag isn't drawn, so it stays as built
 * (⏸ Design gap, addendum 5 §2).
 */
export const StatusChips = ({
  row,
}: {
  row: Pick<EventListRow, 'status' | 'hidden' | 'hiddenReason'>;
}) => (
  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
    <EventStatusChip row={row} />
    {row.hidden && (
      <StatusChip
        status="hidden"
        label={COPY.hiddenReason[row.hiddenReason ?? 'admin']}
      />
    )}
  </span>
);

/**
 * The venue glyph and name on one line, the name ellipsised: both boards draw
 * it so (`06/events` 24px tile, gap 8; `06/events-mobile` 18px, gap 6).
 */
const VenueLine = ({
  row,
  size,
  gap,
}: {
  row: EventListRow;
  size: number;
  gap: number;
}) => (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      gap,
      minWidth: 0,
      // 12.5 on both boards (`06/events`, `06/events-mobile`).
      fontSize: 12.5,
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
    <span style={ellipsis}>{row.venueName}</span>
  </span>
);

/**
 * The row's ⋯ (`06/event-menu`). Only the lines whose action exists today:
 * View on the venue's site shows when the row has a safe venue page
 * (`venueUrl`); Open the crawl run is dropped (4b#3); Merge lands in 4b-4,
 * and Delete with its dialog. Hide from site… opens Event edit's Hide dialog,
 * on a show that isn't hidden.
 */
const EventMenu = ({
  row,
  onHide,
}: {
  row: EventListRow;
  onHide: ((row: EventListRow) => Promise<void>) | undefined;
}) => {
  const router = useRouter();
  const [hiding, setHiding] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  // The dialog opened from a menu item that has since unmounted, so focus
  // goes back to the ⋯ itself once the dialog closes.
  const wasHiding = useRef(false);
  useEffect(() => {
    if (wasHiding.current && !hiding)
      wrapRef.current
        ?.querySelector<HTMLButtonElement>('[data-testid="event-row-menu"]')
        ?.focus();
    wasHiding.current = hiding;
  }, [hiding]);
  const { venueUrl } = row;
  return (
    <span ref={wrapRef}>
      {hiding && onHide !== undefined && (
        <HideEventDialog
          artist={row.title}
          watchingCount={row.watchingCount}
          onCancel={() => setHiding(false)}
          onHide={async () => {
            await onHide(row);
            setHiding(false);
          }}
        />
      )}
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
          ...(onHide !== undefined && !row.hidden
            ? [
                {
                  key: 'hide',
                  icon: EyeOff,
                  label: HIDE_COPY.menu,
                  hint: HIDE_COPY.menuHint,
                  warning: true,
                  onSelect: () => setHiding(true),
                },
              ]
            : []),
        ]}
      />
    </span>
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

type OnHide = ((row: EventListRow) => Promise<void>) | undefined;

const DesktopTable = ({
  rows,
  when,
  onHide,
}: {
  rows: EventListRow[];
  when: When;
  onHide: OnHide;
}) => {
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
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--fg)',
                  }}
                >
                  {row.title}
                </div>
                {row.hidden && (
                  <div style={{ display: 'flex', marginTop: 2 }}>
                    <HiddenTag row={row} />
                  </div>
                )}
              </td>
              <td style={td}>
                <VenueLine row={row} size={24} gap={8} />
              </td>
              <td style={td}>
                <EventStatusChip row={row} />
              </td>
              <td
                style={{
                  ...td,
                  fontSize: 13,
                  fontVariantNumeric: 'tabular-nums',
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
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  color: 'var(--fg-muted)',
                }}
              >
                {past ? wentText(row) : watchingText(row)}
              </td>
              {!past && (
                <td style={{ ...td, textAlign: 'right', paddingRight: 14 }}>
                  <EventMenu row={row} onHide={onHide} />
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
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--fg)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {row.title}
        </div>
        {row.hidden && (
          <div style={{ display: 'flex' }}>
            <HiddenTag row={row} />
          </div>
        )}
        <VenueLine row={row} size={18} gap={6} />
      </div>
      <div
        style={{
          flex: 'none',
          maxWidth: '46%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 5,
          textAlign: 'right',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: price === null ? 500 : 600,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            color: price === null ? 'var(--fg-muted)' : 'var(--fg)',
          }}
        >
          {price ?? COPY.phoneNoPrice}
        </span>
        {countLine !== null && (
          <span
            style={{
              fontSize: 11.5,
              whiteSpace: 'nowrap',
              color: 'var(--fg-subtle)',
            }}
          >
            {countLine}
          </span>
        )}
        <EventStatusChip row={row} />
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
  onHide,
}: {
  rows: EventListRow[];
  when: When;
  /** Hide from site… in a row's ⋯: saves, then reloads the list. */
  onHide?: OnHide;
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
      <DesktopTable rows={rows} when={when} onHide={onHide} />
    </div>
  );
};
