'use client';

import { useId, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Pause } from 'lucide-react';
import type { CrawlPauseReason, CrawlPauseRequest } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import { DENVER_TIME_ZONE, formatISODate, localDateString } from '@/lib/time';
import {
  MAX_RESUME_DAYS,
  PAUSE_REASONS,
  RESUME_CHOICES,
  addDays,
  buildPauseBody,
  formFromBody,
  isPickable,
  monthGrid,
  resumeDate,
  shiftMonth,
  type ResumeChoice,
} from './pause-rules';

const COPY = ADMIN_COPY.pausePanel;

export interface PausePanelVenue {
  id: string;
  name: string;
  eventCount: number;
}

export interface PausePanelProps {
  /** One venue, or every venue in a Select: the same panel serves both. */
  venues: readonly PausePanelVenue[];
  onClose: () => void;
  /**
   * Sends the body. Resolves to an error to show in the panel (an API 422),
   * or null once the caller has taken it from here.
   */
  onSubmit: (body: CrawlPauseRequest) => Promise<string | null>;
  /**
   * A body the API refused after the panel closed (a Try again whose date has
   * since passed): the panel reopens on it, with the refusal shown inline.
   */
  refused?: { body: CrawlPauseRequest; error: string } | null;
}

const LABEL: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: 'var(--fg-subtle)',
};

/** Ruling 8: a choice gets the signal outline; the only glow is the button. */
const optionStyle = (on: boolean, isPhone: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: isPhone ? '12px' : '10px 12px',
  borderRadius: 10,
  fontSize: isPhone ? 15 : 14,
  cursor: 'pointer',
  color: 'var(--fg)',
  border: on ? '1.5px solid var(--signal)' : '1px solid var(--border)',
  background: on
    ? 'color-mix(in srgb, var(--signal) 7%, transparent)'
    : 'transparent',
});

const Radio = ({ on }: { on: boolean }) => (
  <span
    aria-hidden
    style={{
      width: 16,
      height: 16,
      marginTop: 1,
      borderRadius: '50%',
      flex: 'none',
      border: `1.5px solid ${on ? 'var(--signal)' : 'var(--border-strong)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {on && (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--signal)',
        }}
      />
    )}
  </span>
);

const chipStyle = (on: boolean): CSSProperties => ({
  all: 'unset',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  height: 32,
  padding: '0 12px',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  color: on ? 'var(--fg)' : 'var(--fg-muted)',
  border: on ? '1.5px solid var(--signal)' : '1px solid var(--border)',
});

const ICON_BUTTON: CSSProperties = {
  all: 'unset',
  display: 'flex',
  cursor: 'pointer',
  color: 'var(--fg-muted)',
};

const Calendar = ({
  today,
  picked,
  onPick,
}: {
  today: string;
  picked: string | null;
  onPick: (date: string) => void;
}) => {
  const [month, setMonth] = useState((picked ?? today).slice(0, 7));
  const first = today.slice(0, 7);
  const last = addDays(today, MAX_RESUME_DAYS).slice(0, 7);
  return (
    <div
      style={{
        width: 410,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          aria-label={COPY.previousMonth}
          data-pause-control
          disabled={month <= first}
          onClick={() => setMonth(shiftMonth(month, -1))}
          style={{ ...ICON_BUTTON, opacity: month <= first ? 0.35 : 1 }}
        >
          <ChevronLeft size={14} strokeWidth={1.8} aria-hidden />
        </button>
        <span
          aria-live="polite"
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {formatISODate(`${month}-15T12:00:00Z`, 'UTC', {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <button
          type="button"
          aria-label={COPY.nextMonth}
          data-pause-control
          disabled={month >= last}
          onClick={() => setMonth(shiftMonth(month, 1))}
          style={{ ...ICON_BUTTON, opacity: month >= last ? 0.35 : 1 }}
        >
          <ChevronRight size={14} strokeWidth={1.8} aria-hidden />
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
        }}
      >
        {COPY.weekdays.map((day, index) => (
          <span
            key={index}
            aria-hidden
            style={{
              ...LABEL,
              fontSize: 9.5,
              letterSpacing: '0.08em',
              textAlign: 'center',
            }}
          >
            {day}
          </span>
        ))}
        {monthGrid(month).map((date, index) => {
          if (date === null) return <span key={`pad-${index}`} />;
          const pickable = isPickable(date, today);
          const on = date === picked;
          return (
            <button
              key={date}
              type="button"
              data-pause-control
              disabled={!pickable}
              aria-pressed={on}
              aria-label={formatISODate(`${date}T12:00:00Z`, 'UTC', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              onClick={() => onPick(date)}
              style={{
                all: 'unset',
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                fontSize: 13,
                fontVariantNumeric: 'tabular-nums',
                cursor: pickable ? 'pointer' : 'default',
                color: pickable ? 'var(--fg)' : 'var(--fg-subtle)',
                ...(on && {
                  background:
                    'color-mix(in srgb, var(--signal) 14%, transparent)',
                  boxShadow: 'inset 0 0 0 1.5px var(--signal)',
                  fontWeight: 800,
                }),
              }}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Pause crawling (`A3/03/pause-panel-d`): a 460px side panel on desktop and a
 * bottom sheet on the phone (`01/pause-crawling`, rule 4). WHY radios, the
 * Other note, and RESUME chips with a calendar in place. Sends the full body.
 */
export const PausePanel = ({
  venues,
  onClose,
  onSubmit,
  refused,
}: PausePanelProps) => {
  const isPhone = useIsPhone();
  const noteId = useId();
  const [today] = useState(() => localDateString(DENVER_TIME_ZONE));
  const [start] = useState(() => formFromBody(refused?.body ?? null));
  const [reason, setReason] = useState<CrawlPauseReason>(start.reason);
  const [note, setNote] = useState(start.note);
  const [choice, setChoice] = useState<ResumeChoice>(start.choice);
  const [picked, setPicked] = useState<string | null>(start.picked);
  const [error, setError] = useState<string | null>(
    refused ? COPY.dateError(refused.error) : null,
  );
  const [pending, setPending] = useState(false);

  const body = buildPauseBody(reason, note, choice, picked);
  const resumes = resumeDate(choice, picked, today);
  const only = venues.length === 1 ? venues[0] : undefined;
  const shows = venues.reduce((sum, venue) => sum + venue.eventCount, 0);

  const submit = async () => {
    if (body === null) return;
    setPending(true);
    setError(null);
    const refused = await onSubmit(body).finally(() => setPending(false));
    if (refused !== null) setError(COPY.dateError(refused));
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={LABEL} id={`${noteId}-why`}>
        {COPY.why}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${noteId}-why`}
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {PAUSE_REASONS.map((key) => (
          <label
            key={key}
            data-pause-option
            style={optionStyle(reason === key, isPhone)}
          >
            <input
              type="radio"
              name={`${noteId}-reason`}
              className="sr-only"
              checked={reason === key}
              onChange={() => setReason(key)}
            />
            <Radio on={reason === key} />
            {COPY.reasons[key]}
          </label>
        ))}
      </div>
      {reason === 'other' && (
        <textarea
          id={noteId}
          aria-label={COPY.noteLabel}
          required
          maxLength={500}
          value={note}
          placeholder={COPY.notePlaceholder}
          onChange={(evt) => setNote(evt.target.value)}
          style={{
            minHeight: 56,
            resize: 'vertical',
            borderRadius: 10,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            padding: '10px 12px',
            // 16px on the phone or iOS Safari zooms in on focus.
            fontSize: isPhone ? 16 : 13.5,
            lineHeight: 1.45,
            color: 'var(--fg)',
            fontFamily: 'inherit',
          }}
        />
      )}
      <span style={LABEL} id={`${noteId}-resume`}>
        {COPY.resume}
      </span>
      <div
        role="group"
        aria-labelledby={`${noteId}-resume`}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
      >
        {RESUME_CHOICES.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={choice === key}
            data-pause-control
            onClick={() => {
              setChoice(key);
              setError(null);
            }}
            style={chipStyle(choice === key)}
          >
            {COPY.resumeChoices[key]}
          </button>
        ))}
      </div>
      {choice === 'date' && (
        <Calendar
          today={today}
          picked={picked}
          onPick={(date) => {
            setPicked(date);
            setError(null);
          }}
        />
      )}
      {resumes && (
        <div style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {COPY.resumesOn(
            formatISODate(`${resumes}T12:00:00Z`, 'UTC', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            }),
          )}
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>
          {error}
        </div>
      )}
    </div>
  );

  const pauseButton = (
    <AdminButton
      type="button"
      variant="gradient"
      icon={Pause}
      disabled={body === null || pending}
      onClick={() => void submit()}
      style={{
        // The sheet's footer is a column, where `flex: 1` would zero the
        // height; there the button keeps its drawn 46px.
        flex: isPhone ? 'none' : 1,
        height: isPhone ? 46 : 42,
        borderRadius: 9,
        fontSize: isPhone ? 15 : 14,
        opacity: body === null ? 0.45 : 1,
      }}
    >
      {COPY.submit}
    </AdminButton>
  );

  const title = only ? COPY.title(only.name) : COPY.titleMany(venues.length);
  const subtitle = only ? COPY.body(shows) : COPY.bodyMany(shows);

  if (isPhone) {
    // `01/pause-crawling` draws no Cancel, and the bottom sheet has no close of
    // its own (its grab handle is decoration), so a labelled Cancel sits under
    // the button: the desktop panel's own way out.
    return (
      <AdminSheet
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        dismissible={!pending}
        footer={
          <>
            {pauseButton}
            <AdminButton
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={onClose}
              style={{ height: 40, fontSize: 14, fontWeight: 600 }}
            >
              {COPY.cancel}
            </AdminButton>
          </>
        }
      >
        {content}
      </AdminSheet>
    );
  }

  return (
    <SidePanel
      onClose={onClose}
      title={<span style={{ fontSize: 18 }}>{title}</span>}
      subtitle={subtitle}
      dismissible={!pending}
      footer={
        <>
          {pauseButton}
          <AdminButton
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
            style={{
              height: 42,
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--surface-2)',
            }}
          >
            {COPY.cancel}
          </AdminButton>
        </>
      }
    >
      {content}
    </SidePanel>
  );
};
