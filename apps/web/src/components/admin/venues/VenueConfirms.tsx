'use client';

import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, EyeOff, Trash2, X, type LucideIcon } from 'lucide-react';
import type {
  VenueDeleteBlockers,
  VenueHideReason,
  VenueWithCrawlHealth,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ConfirmDialog, useIsPhone } from '@/components/admin/primitives';
import { gradientBorder } from '@/components/admin/artists/artist-styles';
import { hideVenue, removeVenue, tryDeleteVenue } from '@/lib/actions/venues';

const COPY = ADMIN_COPY.venueConfirms;
const FAILED = ADMIN_COPY.states.saveFailed;
const HIDE_REASONS: readonly VenueHideReason[] = [
  'venue_closed',
  'not_music_venue',
  'other',
];
/** The API keeps 500 characters of reason; the fixed reason takes the rest. */
const TAKE_DOWN_NOTE_MAX = 400;

const field = (isPhone: boolean): CSSProperties => ({
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: 'var(--bg)',
  padding: '10px 12px',
  // 16px on the phone or iOS Safari zooms in on focus.
  fontSize: isPhone ? 16 : 13.5,
  lineHeight: 1.45,
  color: 'var(--fg)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  width: '100%',
});

const SMALL: CSSProperties = { fontSize: 12.5, color: 'var(--fg-muted)' };
const ALERT: CSSProperties = { ...SMALL, color: 'var(--danger)' };
const FIELD_LABEL: CSSProperties = {
  ...SMALL,
  display: 'block',
  fontWeight: 600,
  marginBottom: 6,
};

interface ConfirmProps {
  venue: VenueWithCrawlHealth;
  onCancel: () => void;
  /** The action went through; the caller refreshes or leaves the page. */
  onDone: () => void;
}

/** Upcoming shows, or null when the payload has no counts. */
const countsOf = (venue: VenueWithCrawlHealth): number | null =>
  venue.deleteBlockers?.upcomingShows ?? null;

/**
 * A centred dialog on desktop and a sheet on the phone (`ConfirmDialog`),
 * with the drawn danger-outline confirm. A failed action keeps it open and
 * says so inside it (rule 10's words), so trying again takes the same
 * deliberate press as the first time, never a one-click toast.
 */
const VenueConfirm = ({
  title,
  confirmLabel,
  confirmIcon,
  ready,
  failedWhat,
  failedSaved,
  onCancel,
  act,
  onDone,
  children,
}: {
  title: string;
  confirmLabel: string;
  confirmIcon: LucideIcon;
  ready: boolean;
  failedWhat: string;
  failedSaved: string;
  onCancel: () => void;
  /**
   * Runs the action: true once it went through, false when it settled the
   * outcome itself (a refusal it shows). A throw shows the failure inline.
   */
  act: () => Promise<boolean>;
  /** Runs after a success, outside the failure path. */
  onDone: () => void;
  children: ReactNode;
}) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  // Latched on success, so the confirm can't send again even if the caller
  // keeps the dialog mounted.
  const [done, setDone] = useState(false);
  const confirm = async () => {
    if (done) return;
    setPending(true);
    setError(false);
    let succeeded = false;
    try {
      succeeded = await act();
    } catch (err: unknown) {
      console.warn('VenueConfirm: action failed', { title, err });
      setError(true);
    }
    setPending(false);
    if (!succeeded) return;
    setDone(true);
    // The change went through; a throw here is the caller's, not a failure.
    try {
      onDone();
    } catch (err: unknown) {
      console.warn('VenueConfirm: onDone threw after success', { title, err });
    }
  };
  return (
    <ConfirmDialog
      title={title}
      confirmLabel={confirmLabel}
      confirmIcon={confirmIcon}
      tone="danger"
      confirmVariant="dangerOutline"
      buttonSize="large"
      pending={pending}
      confirmDisabled={!ready || done}
      onConfirm={() => void confirm()}
      onCancel={onCancel}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
          {error && (
            <div role="alert" style={ALERT}>
              {`${FAILED.title(failedWhat)}. ${FAILED.body(failedSaved)}`}
            </div>
          )}
        </div>
      }
    />
  );
};

/** "Type the venue's name to confirm", for the two that can't be undone. */
const TypedName = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const isPhone = useIsPhone();
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} style={FIELD_LABEL}>
        {COPY.remove.field}
      </label>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(evt) => onChange(evt.target.value)}
        style={{ ...field(isPhone), height: 38, padding: '0 12px' }}
      />
    </div>
  );
};

/** A note with its drawn label above it, visible as well as announced. */
const NoteField = ({
  label,
  placeholder,
  maxLength,
  required = false,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  maxLength: number;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) => {
  const isPhone = useIsPhone();
  const noteId = useId();
  return (
    <div>
      <label htmlFor={noteId} style={FIELD_LABEL}>
        {label}
      </label>
      <textarea
        id={noteId}
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(evt) => onChange(evt.target.value)}
        style={{ ...field(isPhone), minHeight: 52, resize: 'vertical' }}
      />
    </div>
  );
};

/**
 * Folds what a keyboard or autocorrect changes without meaning to: Unicode
 * forms (NFKC), curly quotes to straight, runs of whitespace, and case.
 */
const foldName = (text: string): string =>
  text
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const named = (typed: string, venue: VenueWithCrawlHealth): boolean =>
  foldName(typed) === foldName(venue.name);

/** Arrow keys walk a radio group and pick as they go, as native radios do. */
const STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/** `A3/03/hide-other-d`: why it's hidden, with a required note for Other. */
export const HideConfirm = ({ venue, onCancel, onDone }: ConfirmProps) => {
  const whyId = useId();
  const radios = useRef<Array<HTMLButtonElement | null>>([]);
  const [reason, setReason] = useState<VenueHideReason | null>(null);
  const [note, setNote] = useState('');
  const trimmed = note.trim();

  // A roving tabindex: one stop for the group, arrows move and pick.
  const onKey = (evt: KeyboardEvent, index: number) => {
    const step = STEP[evt.key];
    if (step === undefined) return;
    evt.preventDefault();
    const next = (index + step + HIDE_REASONS.length) % HIDE_REASONS.length;
    const key = HIDE_REASONS[next];
    if (key === undefined) return;
    setReason(key);
    radios.current[next]?.focus();
  };

  return (
    <VenueConfirm
      title={COPY.hide.title(venue.name)}
      confirmLabel={COPY.hide.confirm}
      confirmIcon={EyeOff}
      ready={reason !== null && (reason !== 'other' || trimmed !== '')}
      failedWhat={COPY.failed.hide(venue.name)}
      failedSaved={COPY.failed.hideSaved}
      onCancel={onCancel}
      act={async () => {
        if (reason === null) return false;
        await hideVenue(venue.id, reason, reason === 'other' ? trimmed : null);
        return true;
      }}
      onDone={onDone}
    >
      <div>{COPY.hide.body(venue.name, countsOf(venue))}</div>
      <div>
        <div id={whyId} style={FIELD_LABEL}>
          {COPY.hide.why}
        </div>
        <div
          role="radiogroup"
          aria-labelledby={whyId}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          {HIDE_REASONS.map((key, index) => (
            <button
              key={key}
              ref={(el) => {
                radios.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={reason === key}
              tabIndex={
                reason === key || (reason === null && index === 0) ? 0 : -1
              }
              onClick={() => setReason(key)}
              onKeyDown={(evt) => onKey(evt, index)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 32,
                padding: '0 12px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                ...(reason === key
                  ? {
                      color: 'var(--fg)',
                      ...gradientBorder('var(--surface-2)'),
                    }
                  : {
                      color: 'var(--fg-muted)',
                      border: '1px solid var(--border)',
                      background:
                        'color-mix(in srgb, var(--bg-elevated) 60%, transparent)',
                    }),
              }}
            >
              {COPY.hide.reasons[key]}
            </button>
          ))}
        </div>
      </div>
      {reason === 'other' && (
        <NoteField
          label={COPY.hide.noteLabel}
          placeholder={COPY.hide.notePlaceholder}
          maxLength={500}
          required
          value={note}
          onChange={setNote}
        />
      )}
      <div style={SMALL}>{COPY.hide.foot}</div>
    </VenueConfirm>
  );
};

/**
 * `A3/03/take-down-d`: the one ticked reason, an optional note on who asked
 * and how (both go to the `venue.remove` audit row), and the venue's name
 * typed, since this is the one action that can't be undone.
 */
export const TakeDownConfirm = ({ venue, onCancel, onDone }: ConfirmProps) => {
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState('');
  return (
    <VenueConfirm
      title={COPY.takeDown.title(venue.name)}
      confirmLabel={COPY.takeDown.confirm}
      confirmIcon={X}
      ready={named(typed, venue)}
      failedWhat={COPY.failed.takeDown(venue.name)}
      failedSaved={COPY.failed.takeDownSaved}
      onCancel={onCancel}
      act={async () => {
        await removeVenue(venue.id, COPY.takeDown.auditReason(note.trim()));
        return true;
      }}
      onDone={onDone}
    >
      <div>{COPY.takeDown.body(venue.name, countsOf(venue))}</div>
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border:
            '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
          background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
          fontSize: 13,
          lineHeight: 1.45,
          color: 'var(--fg)',
        }}
      >
        {COPY.takeDown.warn}
      </div>
      <div
        style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--fg)' }}
      >
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            marginTop: 1,
            borderRadius: 5,
            flex: 'none',
            background: 'var(--signal)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} strokeWidth={3} color="var(--bg)" />
        </span>
        {COPY.takeDown.reason}
      </div>
      <NoteField
        label={COPY.takeDown.noteLabel}
        placeholder={COPY.takeDown.notePlaceholder}
        maxLength={TAKE_DOWN_NOTE_MAX}
        value={note}
        onChange={setNote}
      />
      <TypedName value={typed} onChange={setTyped} />
    </VenueConfirm>
  );
};

/**
 * `04/delete-venue`, for the current venue only (ruling 15). The guard's 409
 * (a show or a Watcher since the page loaded) says why here, in the refused
 * row's words, and hands its counts to `onRefused` so the ⋯ menu can draw
 * the refused row (`A3/03/delete-refused`).
 */
export const DeleteConfirm = ({
  venue,
  onCancel,
  onDone,
  onRefused,
}: Omit<ConfirmProps, 'onDone'> & {
  /** Gets the shows kept, unlinked (`eventsDetached`); the menu doesn't show it. */
  onDone: (eventsDetached: number) => void;
  onRefused: (blockers: VenueDeleteBlockers) => void;
}) => {
  const [typed, setTyped] = useState('');
  const [refusal, setRefusal] = useState<string | null>(null);
  const detached = useRef(0);
  return (
    <VenueConfirm
      title={COPY.remove.title(venue.name)}
      confirmLabel={COPY.remove.confirm}
      confirmIcon={Trash2}
      ready={refusal === null && named(typed, venue)}
      failedWhat={COPY.failed.delete(venue.name)}
      failedSaved={COPY.failed.deleteSaved}
      onCancel={onCancel}
      act={async () => {
        const outcome = await tryDeleteVenue(venue.id);
        if (outcome.ok) {
          detached.current = outcome.eventsDetached;
          return true;
        }
        if (outcome.refused === null) throw new Error('delete refused');
        const { pastShows, upcomingShows, watchers } = outcome.refused;
        setRefusal(COPY.deleteRefused(pastShows, upcomingShows, watchers));
        onRefused(outcome.refused);
        return false;
      }}
      onDone={() => onDone(detached.current)}
    >
      <div>{COPY.remove.body}</div>
      <TypedName value={typed} onChange={setTyped} />
      <div style={SMALL}>{COPY.remove.note}</div>
      {refusal !== null && (
        <div role="alert" style={ALERT}>
          {refusal}
        </div>
      )}
    </VenueConfirm>
  );
};
