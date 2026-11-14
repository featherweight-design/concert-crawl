'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { EyeOff, RefreshCw, type LucideIcon } from 'lucide-react';
import { TINT_BUTTON } from '@/components/admin/artists/artist-styles';
import { shortDate } from '@/components/admin/venues/overview/overview-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminCard,
  ConfirmDialog,
  SaveFailedToast,
} from '@/components/admin/primitives';
import { gradientBorder } from '@/components/admin/artists/artist-styles';
import { Switch } from '@/components/admin/people/PersonParts';
import type { EventDetail } from './event-detail';
import { DateField, TimeField } from './pickers';

const COPY = ADMIN_COPY.eventEdit;
const FAILED = ADMIN_COPY.states.saveFailed;

/** What the Save bar saves: Tickets available or Sold out. */
export type Sale = 'available' | 'soldout';

export type StatusDialog = 'postponed' | 'hide';

/** Postponed's New date: YYYY-MM-DD and an optional `HH:MM` show time. */
export interface NewDate {
  date: string;
  showTime: string | null;
}

const FIELD_LABEL: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

/** The pill drawn as chosen for a status, or none (delisted, played). */
type Pill = Sale | 'postponed' | 'cancelled';

export const pillOf = (status: EventDetail['status']): Pill | null =>
  status === 'available' ||
  status === 'soldout' ||
  status === 'postponed' ||
  status === 'cancelled'
    ? status
    : null;

const PILL: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 34,
  padding: '0 14px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const SMALL: CSSProperties = { fontSize: 12.5, color: 'var(--fg-muted)' };

const Pills = ({
  chosen,
  locked,
  current,
  onSale,
  onPostponed,
}: {
  chosen: Pill | null;
  /** A past show: every pill reads only (4b#22). */
  locked: boolean;
  current: Pill | null;
  onSale: (sale: Sale) => void;
  onPostponed: () => void;
}) => {
  const pills: { key: Pill; label: string; disabled: boolean }[] = [
    { key: 'available', label: COPY.status.available, disabled: locked },
    { key: 'soldout', label: COPY.status.soldout, disabled: locked },
    {
      key: 'postponed',
      label: COPY.status.postponed,
      disabled: locked || current === 'postponed',
    },
    // Mark cancelled waits for its Refund info field (Hugh 4b#7): drawn, and
    // chosen only when the show already is.
    { key: 'cancelled', label: COPY.status.cancelled, disabled: true },
  ];
  return (
    // Toggle buttons, one Tab stop each: Postponed opens a dialog rather than
    // choosing in place, so a radio group's arrow-key semantics would lie.
    <div
      role="group"
      aria-label={COPY.status.title}
      style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
    >
      {pills.map(({ key, label, disabled }) => {
        const on = chosen === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-disabled={disabled || undefined}
            data-testid={`status-pill-${key}`}
            onClick={() => {
              if (disabled || on) return;
              if (key === 'postponed') onPostponed();
              else if (key === 'available' || key === 'soldout') onSale(key);
            }}
            style={{
              ...PILL,
              cursor: disabled || on ? 'default' : 'pointer',
              ...(on
                ? { color: 'var(--fg)', ...gradientBorder('var(--surface-2)') }
                : {
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    ...(disabled && { opacity: 0.5 }),
                  }),
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * A dialog on desktop and a sheet on the phone (`ConfirmDialog`). A failed
 * action keeps it open and says so inside it, so trying again takes the same
 * deliberate press (the venue confirms' pattern).
 */
const EventConfirm = ({
  title,
  confirmLabel,
  confirmIcon,
  danger,
  failedWhat,
  failedSaved,
  onCancel,
  act,
  ready = true,
  children,
}: {
  title: string;
  confirmLabel: string;
  /** Left out where the board draws a bare label (Mark postponed). */
  confirmIcon?: LucideIcon;
  danger: boolean;
  failedWhat: string;
  failedSaved: string;
  onCancel: () => void;
  /** Saves; the caller closes the dialog once it resolves. */
  act: () => Promise<void>;
  /** False keeps the confirm off (a New date the same as the old one). */
  ready?: boolean;
  children: ReactNode;
}) => {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <ConfirmDialog
      title={title}
      confirmLabel={confirmLabel}
      {...(confirmIcon !== undefined && { confirmIcon })}
      tone={danger ? 'danger' : 'default'}
      confirmVariant={danger ? 'dangerOutline' : 'gradient'}
      buttonSize="large"
      pending={pending}
      confirmDisabled={!ready}
      onConfirm={() => {
        setPending(true);
        setFailed(false);
        act().catch(() => {
          setFailed(true);
          setPending(false);
        });
      }}
      onCancel={onCancel}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
          {failed && (
            <div role="alert" style={{ ...SMALL, color: 'var(--danger)' }}>
              {`${FAILED.title(failedWhat)}. ${FAILED.body(failedSaved)}`}
            </div>
          )}
        </div>
      }
    />
  );
};

const Radio = ({
  checked,
  label,
  onPick,
}: {
  checked: boolean;
  label: string;
  onPick: () => void;
}) => (
  // A toggle button per choice: No new date yet, or New date.
  <button
    type="button"
    aria-pressed={checked}
    onClick={onPick}
    style={{
      width: '100%',
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      minHeight: 48,
      padding: '0 16px',
      borderRadius: 12,
      fontSize: 15,
      color: 'var(--fg)',
      border: `1px solid ${checked ? 'var(--signal)' : 'var(--border)'}`,
      background: checked
        ? 'color-mix(in oklab, var(--signal) 10%, var(--bg-elevated))'
        : 'var(--bg-elevated)',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        flex: 'none',
        border: `2px solid ${checked ? 'var(--signal)' : 'var(--border-strong)'}`,
        boxShadow: checked ? 'inset 0 0 0 3px var(--bg-elevated)' : undefined,
        background: checked ? 'var(--signal)' : 'transparent',
      }}
    />
    {label}
  </button>
);

/**
 * The Status card (`06/event-edit`): the status pills and the Hide from site
 * toggle. Tickets available and Sold out are drafts the Save bar saves;
 * Postponed and Hide confirm in a dialog and save at once, because they reach
 * Watchers or take the show off the site.
 */
export const StatusCard = ({
  detail,
  phone,
  past,
  sale,
  onSale,
  onPostpone,
  today,
  onHidden,
  dialog,
  setDialog,
}: {
  detail: EventDetail;
  phone: boolean;
  past: boolean;
  /** The drafted sale, or null when the pills show what is saved. */
  sale: Sale | null;
  onSale: (sale: Sale) => void;
  /** Marks it postponed, with the New date when one is picked. */
  onPostpone: (newDate: NewDate | null) => Promise<void>;
  /** YYYY-MM-DD in Mountain Time: New date starts here. */
  today: string;
  onHidden: (hidden: boolean) => Promise<void>;
  /** Held by the page, so the ⋯'s Hide from site… opens the same dialog. */
  dialog: StatusDialog | null;
  setDialog: (dialog: StatusDialog | null) => void;
}) => {
  const [unhideFailed, setUnhideFailed] = useState(false);
  // Postponed's choice: null is No new date yet. Each opening starts there.
  const [newDate, setNewDate] = useState<NewDate | null>(null);
  useEffect(() => {
    if (dialog === 'postponed') setNewDate(null);
  }, [dialog]);
  const [unhiding, setUnhiding] = useState(false);
  const current = pillOf(detail.status);
  const delisted = detail.status === 'delisted';
  const since =
    detail.delistedAt === null ? null : shortDate(detail.delistedAt);
  const close = () => setDialog(null);
  // Showing a hidden show again saves at once; one at a time.
  const unhide = () => {
    if (unhiding) return;
    setUnhiding(true);
    setUnhideFailed(false);
    onHidden(false)
      .catch(() => setUnhideFailed(true))
      .finally(() => setUnhiding(false));
  };
  return (
    <AdminCard
      title={COPY.status.title}
      phone={phone}
      testId="event-edit-status"
    >
      {delisted && sale === null ? (
        // `04/listed-again`, before: read-only, with the one way back.
        <div
          data-testid="status-delisted"
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px dashed var(--border-strong)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.status.delisted}
            </span>
            {since !== null && (
              <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
                {COPY.status.delistedSince(since)}
              </span>
            )}
          </div>
          {since !== null && (
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {COPY.status.delistedWhy(
                detail.venueName ?? ADMIN_COPY.eventEdit.none,
                since,
                detail.watchingCount,
              )}
            </div>
          )}
          {!past && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                data-testid="listed-again"
                onClick={() =>
                  onSale(detail.isSoldOut ? 'soldout' : 'available')
                }
                style={{
                  ...TINT_BUTTON,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} aria-hidden />
                {COPY.status.listedAgain}
              </button>
              <span style={SMALL}>{COPY.status.listedAgainHint}</span>
            </div>
          )}
        </div>
      ) : (
        <Pills
          chosen={sale ?? current}
          locked={past}
          current={current}
          onSale={onSale}
          onPostponed={() => setDialog('postponed')}
        />
      )}
      {delisted && sale !== null && (
        // After Listed again: the earlier status, picked as an unsaved change.
        <div style={SMALL} data-testid="status-listed-back">
          {COPY.status.listedBack(
            sale === 'soldout' ? COPY.status.soldout : COPY.status.available,
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}
      >
        <Switch
          on={detail.hidden}
          label={COPY.status.hide}
          disabled={unhiding}
          onChange={(next) => {
            if (next) setDialog('hide');
            else unhide();
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 700 }}>
          {COPY.status.hide}
        </span>
        <span style={SMALL}>{COPY.status.hideHint}</span>
      </div>
      {unhideFailed && (
        <SaveFailedToast
          what={COPY.unhideFailed.what}
          saved={COPY.unhideFailed.saved}
          onRetry={unhide}
          retrying={unhiding}
          onDismiss={() => setUnhideFailed(false)}
        />
      )}
      {dialog === 'postponed' && (
        <EventConfirm
          title={COPY.postponed.title(detail.artist)}
          confirmLabel={COPY.postponed.confirm}
          danger={false}
          failedWhat={COPY.postponed.failed}
          failedSaved={COPY.statusSaved(
            ADMIN_COPY.eventsList.status[detail.status],
          )}
          onCancel={close}
          // A New date must move the show: the same day and time is no date.
          ready={
            newDate === null ||
            newDate.date !== detail.date ||
            newDate.showTime !== (detail.showTime?.slice(0, 5) ?? null)
          }
          act={async () => {
            await onPostpone(newDate);
            close();
          }}
        >
          <div>
            {phone
              ? COPY.postponed.notice(detail.watchingCount)
              : `${COPY.postponed.notice(detail.watchingCount)} ${COPY.postponed.stays}`}
          </div>
          <div
            role="group"
            aria-label={COPY.postponed.title(detail.artist)}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <Radio
              checked={newDate === null}
              label={COPY.postponed.noDate}
              onPick={() => setNewDate(null)}
            />
            <Radio
              checked={newDate !== null}
              label={COPY.postponed.newDate}
              onPick={() =>
                setNewDate(
                  newDate ?? {
                    date: today < detail.date ? detail.date : today,
                    showTime: detail.showTime?.slice(0, 5) ?? null,
                  },
                )
              }
            />
          </div>
          {/* `04/date-picker-d`: New date takes future dates only. */}
          {newDate !== null && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: phone ? '1fr 1fr' : '1.4fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <label htmlFor="postponed-date" style={FIELD_LABEL}>
                  {ADMIN_COPY.eventEdit.show.date}
                </label>
                <DateField
                  id="postponed-date"
                  value={newDate.date}
                  onChange={(date) => setNewDate({ ...newDate, date })}
                  today={today}
                  min={today}
                  phone={phone}
                  withYear={false}
                />
              </div>
              <div>
                <label htmlFor="postponed-show" style={FIELD_LABEL}>
                  {ADMIN_COPY.eventEdit.show.showTime}
                </label>
                <TimeField
                  id="postponed-show"
                  value={newDate.showTime}
                  onChange={(showTime) => setNewDate({ ...newDate, showTime })}
                  phone={phone}
                  placeholder={ADMIN_COPY.eventEdit.none}
                  label={ADMIN_COPY.eventEdit.show.showTime}
                />
              </div>
            </div>
          )}
        </EventConfirm>
      )}
      {dialog === 'hide' && (
        <EventConfirm
          title={COPY.hide.title(detail.artist)}
          confirmLabel={COPY.hide.confirm}
          confirmIcon={EyeOff}
          danger
          failedWhat={COPY.hide.failed}
          failedSaved={COPY.hide.saved}
          onCancel={close}
          act={async () => {
            await onHidden(true);
            close();
          }}
        >
          <div>{COPY.hide.body(detail.artist, detail.watchingCount)}</div>
          <div style={SMALL}>{COPY.hide.foot}</div>
        </EventConfirm>
      )}
    </AdminCard>
  );
};
