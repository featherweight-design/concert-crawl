'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  RowMenu,
  STRETCHED_LINK,
  useIsPhone,
} from '@/components/admin/primitives';
import { StatusChip } from '@/components/consumer/StatusChip';
import { VenueTile } from '@/components/consumer/venue-glyph';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { eventCanonicalPath } from '@/lib/share/event-metadata';
import { DateTile } from '../../prices/MissingTab';
import { shortDate } from '../../prices/prices-rules';
import { HideEventDialog } from '../edit/StatusCard';
import { EventDeleteConfirm } from '../EventDeleteConfirm';
import type { EventListRow } from './events-api';
import { STATUS_CHIP, formatPrice, type When } from './events-rules';

const COPY = ADMIN_COPY.eventsList;
const HIDE_COPY = ADMIN_COPY.eventEdit.hide;
const DELETE_COPY = ADMIN_COPY.eventDelete;
const NO_NEW_DATE = ADMIN_COPY.eventEdit.postponed.noDate;

/**
 * A past row's title link: stretched over its own cell, with keyboard focus
 * ringing the title (the row tints too, below).
 */
const ROW_LINK = `${STRETCHED_LINK} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]`;
/** A past row tints on hover or focus, and only then shows its chevron. */
const ROW_HOVER =
  'group hover:bg-[var(--surface-2)] focus-within:bg-[var(--surface-2)]';
const CHEVRON_ON_HOVER =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

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
 * "HIDDEN · BY ADMIN" (`02/events-statuschip-d`, `-m`). Addendum 6 item 21
 * lifts it to 10px `--fg-muted`, eye included, for contrast (7.5:1 on the
 * Electric row ground; Light's darker `--fg-muted` passes too).
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
        alignItems: 'flex-start',
        gap: 5,
        minWidth: 0,
        color: 'var(--fg-muted)',
      }}
    >
      <Eye
        size={12}
        strokeWidth={1.6}
        aria-hidden="true"
        style={{ flex: 'none', display: 'block' }}
      />
      {/* Never cut: a narrow card wraps the tag rather than lose its reason
          (orchestrator, 320px). */}
      <span
        style={{
          ...MONO,
          minWidth: 0,
          lineHeight: '12px',
          fontSize: 10,
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
 * Event edit's header (addendum 6 item 19, `19/event-edit-hidden-header`):
 * the fan status chip, then for a hidden show the list's Hidden tag, not a
 * second chip. Wraps the tag to its own line before it would truncate.
 */
export const StatusChips = ({
  row,
}: {
  row: Pick<EventListRow, 'status' | 'hidden' | 'hiddenReason'>;
}) => (
  <span
    style={{
      display: 'inline-flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
    }}
  >
    <EventStatusChip row={row} />
    <HiddenTag row={row} />
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
 * (`venueUrl`); Open the crawl run is dropped (4b#3); Merge lands with E4.
 * Hide from site… opens Event edit's Hide dialog, on a show that isn't
 * hidden. Delete… shows on a manual row only (4b#10), with its dialog.
 */
const EventMenu = ({
  row,
  onHide,
  onDelete,
}: {
  row: EventListRow;
  onHide: OnHide;
  onDelete: OnHide;
}) => {
  const router = useRouter();
  const [hiding, setHiding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  // The dialog opened from a menu item that has since unmounted, so focus
  // goes back to the ⋯ itself once the dialog closes.
  const open = hiding || deleting;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open)
      wrapRef.current
        ?.querySelector<HTMLButtonElement>('[data-testid="event-row-menu"]')
        ?.focus();
    wasOpen.current = open;
  }, [open]);
  const { venueUrl } = row;
  return (
    <span ref={wrapRef}>
      {deleting && onDelete !== undefined && (
        <EventDeleteConfirm
          title={row.title}
          onDelete={() => onDelete(row)}
          onCancel={() => setDeleting(false)}
          onDone={() => setDeleting(false)}
        />
      )}
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
          ...(onDelete !== undefined && row.manual
            ? [
                {
                  key: 'delete',
                  icon: Trash2,
                  label: DELETE_COPY.menu,
                  hint: DELETE_COPY.menuHint,
                  danger: true,
                  onSelect: () => setDeleting(true),
                },
              ]
            : []),
        ]}
      />
    </span>
  );
};

/**
 * The status chip, and under a postponed show on Past (its date has passed
 * with no new one) "No new date yet" in amber (`36/past-d`, `36/past-m`).
 */
const StatusCell = ({
  row,
  past,
  align,
}: {
  row: EventListRow;
  past: boolean;
  align: 'flex-start' | 'flex-end';
}) =>
  past && row.status === 'postponed' ? (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        gap: 3,
      }}
    >
      <EventStatusChip row={row} />
      <span
        data-testid="no-new-date"
        style={{
          fontSize: 11.5,
          whiteSpace: 'nowrap',
          color: 'var(--warning)',
        }}
      >
        {NO_NEW_DATE}
      </span>
    </span>
  ) : (
    <EventStatusChip row={row} />
  );

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

/**
 * A past row's other cells open the editor too. WebKit doesn't make a
 * positioned `<tr>` a containing block, so each cell is positioned and gets
 * its own cover: a mouse target only, out of the tab order and hidden from
 * assistive tech, since the title link is the row's one real link.
 */
const CellCover = ({ href }: { href: string }) => (
  <Link
    href={href}
    tabIndex={-1}
    aria-hidden="true"
    data-testid="row-cover"
    style={{ position: 'absolute', inset: 0 }}
  />
);

const DesktopTable = ({
  rows,
  when,
  onHide,
  onDelete,
}: {
  rows: EventListRow[];
  when: When;
  onHide: OnHide;
  onDelete: OnHide;
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
        {/* Upcoming's ⋯; Past's 14px chevron in the 16px column `36/past-d`
            draws, plus the row's 18px right padding and the cell's 12px. */}
        <col style={{ width: past ? 44 : 52 }} />
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
          <th style={th} aria-hidden="true" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const price = formatPrice(row.priceMin, row.priceMax);
          const titleStyle: CSSProperties = {
            ...ellipsis,
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--fg)',
          };
          // On Past the whole row opens the past-show editor (`36/past-d`):
          // the title is the link, and every cell is positioned with a cover
          // (see `CellCover`). 06/past-shows' no-⋯ stands, so the row holds
          // nothing else to press.
          const href = editEventHref(row.id);
          const cell = (extra: CSSProperties = {}): CSSProperties =>
            past
              ? { ...td, ...extra, position: 'relative' }
              : { ...td, ...extra };
          const cover = past ? <CellCover href={href} /> : null;
          return (
            <tr
              key={row.id}
              data-testid="event-row"
              className={past ? ROW_HOVER : undefined}
            >
              <td style={cell({ paddingLeft: 18 })}>
                <DateTile date={row.date} />
                {cover}
              </td>
              <td style={cell()}>
                {past ? (
                  <Link
                    href={href}
                    className={ROW_LINK}
                    style={{
                      ...titleStyle,
                      display: 'block',
                      textDecoration: 'none',
                    }}
                  >
                    {row.title}
                    {/* Two shows can share a title; the date tells them
                        apart to a screen reader. */}
                    <span className="sr-only">
                      {COPY.rowDate(shortDate(row.date))}
                    </span>
                  </Link>
                ) : (
                  <div style={titleStyle}>{row.title}</div>
                )}
                {row.hidden && (
                  <div style={{ display: 'flex', marginTop: 2 }}>
                    <HiddenTag row={row} />
                  </div>
                )}
              </td>
              <td style={cell()}>
                <VenueLine row={row} size={24} gap={8} />
                {cover}
              </td>
              <td style={cell()}>
                <StatusCell row={row} past={past} align="flex-start" />
                {cover}
              </td>
              <td
                style={cell({
                  fontSize: 13,
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  color:
                    price === null || past ? 'var(--fg-muted)' : 'var(--fg)',
                })}
              >
                {price ?? COPY.none}
                {cover}
              </td>
              <td
                style={cell({
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  color: 'var(--fg-muted)',
                })}
              >
                {past ? wentText(row) : watchingText(row)}
                {cover}
              </td>
              {past ? (
                <td style={cell({ paddingRight: 18 })}>
                  {/* 14px in its 16px column, as `36/past-d` draws it. */}
                  <ChevronRight
                    data-testid="row-chevron"
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className={CHEVRON_ON_HOVER}
                    style={{ display: 'block', color: 'var(--fg-muted)' }}
                  />
                  {cover}
                </td>
              ) : (
                <td style={{ ...td, textAlign: 'right', paddingRight: 14 }}>
                  <EventMenu row={row} onHide={onHide} onDelete={onDelete} />
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
  // `36/past-m` draws the past card a little differently from
  // `06/events-mobile`: one-line title, venue 3px under it, price 13.5/700
  // (— when none), "N went" 12px muted.
  const body = (
    <>
      <DateTile date={row.date} />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: past ? 3 : 6,
        }}
      >
        <div
          style={{
            fontSize: 14.5,
            fontWeight: 700,
            lineHeight: 1.3,
            color: 'var(--fg)',
            ...(past
              ? ellipsis
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
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
          gap: past ? 6 : 5,
          textAlign: 'right',
        }}
      >
        {past ? (
          <span
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
              color: 'var(--fg)',
            }}
          >
            {price ?? COPY.none}
          </span>
        ) : (
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
        )}
        {countLine !== null && (
          <span
            style={{
              fontSize: past ? 12 : 11.5,
              whiteSpace: 'nowrap',
              color: past ? 'var(--fg-muted)' : 'var(--fg-subtle)',
            }}
          >
            {countLine}
          </span>
        )}
        <StatusCell row={row} past={past} align="flex-end" />
      </div>
    </>
  );
  // Every card opens the editor; a past show's is the past-show editor
  // (`36/past-m`: the whole card is the link).
  return (
    <li style={{ borderBottom: '1px solid var(--border)' }}>
      <Link
        href={editEventHref(row.id)}
        style={{
          display: 'flex',
          gap: 12,
          padding: past ? '12px 0' : '14px 0',
          color: 'inherit',
          textDecoration: 'none',
        }}
      >
        {body}
        {/* The date tile is hidden from screen readers; as on desktop, the
            date tells same-title past shows apart. */}
        {past && (
          <span className="sr-only">{COPY.rowDate(shortDate(row.date))}</span>
        )}
      </Link>
    </li>
  );
};

/**
 * The rows of `06/events` (desktop table) and `06/events-mobile` (cards, no
 * ⋯: a card opens the editor), and on Past `06/past-shows` (CONCERTS in place
 * of WATCHING, no ⋯) with addendum 6's `36/past-d` and `36/past-m`: the whole
 * row or card opens the past-show editor.
 */
export const EventsList = ({
  rows,
  when,
  onHide,
  onDelete,
}: {
  rows: EventListRow[];
  when: When;
  /** Hide from site… in a row's ⋯: saves, then reloads the list. */
  onHide?: OnHide;
  /**
   * Delete… in a manual row's ⋯: sends the DELETE (throwing its ApiError),
   * then reloads the list.
   */
  onDelete?: OnHide;
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
      <DesktopTable
        rows={rows}
        when={when}
        onHide={onHide}
        onDelete={onDelete}
      />
    </div>
  );
};
