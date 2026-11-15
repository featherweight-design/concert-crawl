'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Calendar } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminSheet,
  KindLabel,
  SaveFailedToast,
  SidePanel,
  Spinner,
} from '@/components/admin/primitives';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { editEventHref } from '@/lib/admin/edit-event-link';
import { fieldDate } from '../edit/event-detail';
import { DateField, TimeField } from '../edit/pickers';
import { addShowApi, type DuplicateShow, type PickVenue } from './add-show-api';
import {
  ADD_SHOW_FIELDS,
  EMPTY_DRAFT,
  isAddShowField,
  toBody,
  validateDraft,
  type AddShowDraft,
  type AddShowField,
  type FieldErrors,
} from './add-show-rules';
import { LineupField } from './LineupField';
import { VenuePicker } from './VenuePicker';

const COPY = ADMIN_COPY.addShow;
const DUPLICATE_DEBOUNCE_MS = 400;

const fieldId = (field: AddShowField) => `add-show-${field}`;
const errorId = (field: AddShowField) => `add-show-${field}-error`;

const Field = ({
  field,
  label,
  error,
  children,
}: {
  field: AddShowField;
  label: string;
  error: string | undefined;
  children: ReactNode;
}) => (
  <div style={{ minWidth: 0 }}>
    <label
      htmlFor={fieldId(field)}
      style={{
        display: 'block',
        marginBottom: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--fg-muted)',
      }}
    >
      {label}
    </label>
    {children}
    {error && (
      <div
        id={errorId(field)}
        style={{ marginTop: 5, fontSize: 12, color: 'var(--danger)' }}
      >
        {error}
      </div>
    )}
  </div>
);

const LINK: CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  font: 'inherit',
  fontWeight: 600,
  color: 'var(--signal)',
  cursor: 'pointer',
};

/**
 * 4b-3 Add a show by hand (`06/add-a-show-by-hand`, addendum 3
 * `11/add-a-show-lineup-d`, addendum 5 `04/add-show-errors-d`): a side panel
 * over Events on desktop, full screen on the phone. Errors show after Add
 * show or on leaving a field; a show already that night is an amber warning
 * that never blocks, except the API's exact-key 409. A saved show opens in
 * Event edit, where its price is added (4b#12). Closing drops the draft.
 */
export const AddShow = ({
  onClose,
  phone,
  today,
}: {
  onClose: () => void;
  phone: boolean;
  /** `YYYY-MM-DD` in Mountain Time. */
  today: string;
}) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const api = useMemo(() => addShowApi(getToken), [getToken]);

  const [draft, setDraft] = useState<AddShowDraft>(EMPTY_DRAFT);
  const [touched, setTouched] = useState<ReadonlySet<AddShowField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [venues, setVenues] = useState<PickVenue[] | 'failed' | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateShow[]>([]);
  const [exactId, setExactId] = useState<string | null>(null);

  const loadVenues = useCallback(() => {
    setVenues(null);
    api.venues().then(setVenues, (err: unknown) => {
      console.error('[admin add show] venues failed', err);
      setVenues('failed');
    });
  }, [api]);
  useEffect(loadVenues, [loadVenues]);

  // The warning follows venue, date and title as they're typed.
  const { venueId, date, title } = draft;
  useEffect(() => {
    setDuplicates([]);
    if (venueId === '' || date === '') return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .duplicates({ venueId, date, title: title.trim() }, controller.signal)
        .then(
          setDuplicates,
          // A warning only: a failed check shows none.
          () => setDuplicates([]),
        );
    }, DUPLICATE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [api, venueId, date, title]);

  const clientErrors = validateDraft(draft, today);
  const shown: FieldErrors = {};
  for (const field of ADD_SHOW_FIELDS) {
    const code =
      (submitted || touched.has(field) ? clientErrors[field] : undefined) ??
      serverErrors[field];
    if (code) shown[field] = code;
  }
  const errorOf = (field: AddShowField) => {
    const code = shown[field];
    return code ? COPY.errors[code] : undefined;
  };
  const look = (field: AddShowField) => ({
    invalid: shown[field] !== undefined,
    describedBy: shown[field] ? errorId(field) : undefined,
  });
  const blocked = Object.keys(shown).length > 0 || exactId !== null;

  const set = <K extends AddShowField>(field: K, value: AddShowDraft[K]) => {
    setDraft((was) => ({ ...was, [field]: value }));
    // The API's refusal for a field clears once that field changes.
    setServerErrors((was) => {
      const next = { ...was };
      delete next[field];
      return next;
    });
    setExactId(null);
    setFailed(false);
  };
  const touch = (field: AddShowField) =>
    setTouched((was) => new Set(was).add(field));

  const leave = (href: string) => {
    router.push(href);
    onClose();
  };

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      const result = await api.create(toBody(draft));
      if (result.kind === 'created') {
        leave(editEventHref(result.id));
        return;
      }
      if (result.kind === 'duplicate') {
        setExactId(result.existingId);
      } else {
        const next: FieldErrors = {};
        for (const issue of result.issues)
          if (isAddShowField(issue.field)) next[issue.field] ??= issue.code;
        setServerErrors(next);
      }
    } catch (err) {
      console.error('[admin add show] create failed', err);
      setFailed(true);
    }
    setSaving(false);
  };

  const submit = () => {
    setSubmitted(true);
    const first = ADD_SHOW_FIELDS.find((field) => clientErrors[field]);
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }
    void save();
  };

  const venueName = Array.isArray(venues)
    ? venues.find((venue) => venue.id === venueId)?.name
    : undefined;
  const [likeliest] = duplicates;
  const openIt = (id: string) => (
    <button type="button" onClick={() => leave(editEventHref(id))} style={LINK}>
      {COPY.duplicate.open}
    </button>
  );
  const warning = (exactId !== null || (likeliest && venueName)) && (
    <div
      data-testid="duplicate-warning"
      role="status"
      style={{
        display: 'flex',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
        background: 'color-mix(in srgb, var(--warning) 8%, transparent)',
        fontSize: 13,
        lineHeight: 1.45,
        color: 'var(--fg)',
      }}
    >
      <Calendar
        size={16}
        strokeWidth={1.7}
        color="var(--warning)"
        aria-hidden
        style={{ flex: 'none', marginTop: 1 }}
      />
      <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
        {exactId !== null ? (
          <>
            {COPY.duplicate.exact}
            {openIt(exactId)}
            {COPY.duplicate.exactTail}
          </>
        ) : likeliest && venueName ? (
          <>
            {COPY.duplicate.lead(
              venueName,
              fieldDate(date, false),
              !likeliest.manual,
            )}
            <b>{likeliest.title}</b>
            {COPY.duplicate.afterTitle}
            {openIt(likeliest.id)}
            {COPY.duplicate.tail}
          </>
        ) : null}
      </span>
    </div>
  );

  const placeholder = (
    <span style={{ color: 'var(--fg-subtle)' }}>{COPY.timeNone}</span>
  );
  const dateField = (
    <Field field="date" label={COPY.date} error={errorOf('date')}>
      <DateField
        id={fieldId('date')}
        value={draft.date}
        onChange={(next) => {
          set('date', next);
          touch('date');
        }}
        today={today}
        phone={phone}
        // Add a show takes no past day (`04/add-show-errors-d`).
        min={today}
        placeholder={COPY.datePlaceholder}
        withYear={false}
        height={38}
        {...look('date')}
      />
    </Field>
  );
  const timeField = (field: 'doorsTime' | 'showTime', label: string) => (
    <Field field={field} label={label} error={errorOf(field)}>
      <TimeField
        id={fieldId(field)}
        value={draft[field]}
        onChange={(next) => {
          set(field, next);
          touch(field);
        }}
        phone={phone}
        placeholder={placeholder}
        label={label}
        height={38}
        {...look(field)}
      />
    </Field>
  );

  const form = (
    <div
      data-testid="add-show"
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {phone && (
        <div>
          <KindLabel kind="show" />
        </div>
      )}
      <Field field="title" label={COPY.titleField} error={errorOf('title')}>
        <input
          id={fieldId('title')}
          value={draft.title}
          placeholder={COPY.titlePlaceholder}
          aria-invalid={look('title').invalid || undefined}
          aria-describedby={look('title').describedBy}
          onChange={(evt) => set('title', evt.target.value)}
          onBlur={() => touch('title')}
          style={{
            ...inputStyle(look('title').invalid),
            ...(phone && { fontSize: 16 }),
          }}
        />
      </Field>
      <Field field="venueId" label={COPY.venue} error={errorOf('venueId')}>
        <VenuePicker
          id={fieldId('venueId')}
          venues={venues}
          value={draft.venueId}
          onChange={(next) => {
            set('venueId', next);
            touch('venueId');
          }}
          onRetry={loadVenues}
          phone={phone}
          {...look('venueId')}
        />
      </Field>
      {phone ? (
        <>
          {dateField}
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
          >
            {timeField('doorsTime', COPY.doors)}
            {timeField('showTime', COPY.show)}
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1fr 1fr',
            gap: 10,
          }}
        >
          {dateField}
          {timeField('doorsTime', COPY.doors)}
          {timeField('showTime', COPY.show)}
        </div>
      )}
      <Field field="ticketUrl" label={COPY.ticket} error={errorOf('ticketUrl')}>
        <input
          id={fieldId('ticketUrl')}
          type="url"
          inputMode="url"
          value={draft.ticketUrl}
          placeholder={COPY.ticketPlaceholder}
          aria-invalid={look('ticketUrl').invalid || undefined}
          aria-describedby={look('ticketUrl').describedBy}
          onChange={(evt) => set('ticketUrl', evt.target.value)}
          onBlur={() => touch('ticketUrl')}
          style={{
            ...inputStyle(look('ticketUrl').invalid),
            ...(phone && { fontSize: 16 }),
          }}
        />
      </Field>
      {warning}
      <Field field="lineup" label={COPY.lineup} error={errorOf('lineup')}>
        <LineupField
          id={fieldId('lineup')}
          lineup={draft.lineup}
          onChange={(next) => set('lineup', next)}
          search={api.artists}
          phone={phone}
          {...look('lineup')}
        />
      </Field>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-muted)' }}>
        {COPY.priceNote}
      </p>
    </div>
  );

  const buttonHeight = phone ? 46 : 40;
  const footer = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {failed && (
        <SaveFailedToast
          title={COPY.saveFailed.title}
          body={COPY.saveFailed.body}
          onRetry={() => void save()}
          retrying={saving}
          {...(phone && {
            padding: '12px',
            gap: 10,
            crossStroke: 2.2,
            shadow: '0 14px 30px rgba(0,0,0,.45)',
          })}
        />
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          onClick={submit}
          disabled={saving || blocked}
          aria-busy={saving || undefined}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: buttonHeight,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid transparent',
            background:
              'linear-gradient(135deg, var(--signal), var(--cta-end, var(--accent)))',
            color: 'var(--fg-on-accent)',
            fontSize: phone ? 15 : 14,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: saving || blocked ? 'default' : 'pointer',
            opacity: saving ? 0.75 : blocked ? 0.45 : 1,
            transition: 'opacity var(--motion-fast) var(--motion-ease)',
          }}
        >
          {saving && <Spinner size={16} tone="var(--fg-on-accent)" />}
          {saving ? COPY.submitting : COPY.submit}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          style={{
            height: buttonHeight,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-2)',
            color: 'var(--fg)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: saving ? 'default' : 'pointer',
          }}
        >
          {COPY.cancel}
        </button>
      </div>
    </div>
  );

  return phone ? (
    <AdminSheet
      fullScreen
      title={COPY.title}
      subtitle={COPY.lede}
      backLabel={COPY.back}
      onClose={onClose}
      dismissible={!saving}
      footer={footer}
    >
      {form}
    </AdminSheet>
  ) : (
    <SidePanel
      eyebrow={<KindLabel kind="show" />}
      title={COPY.title}
      subtitle={COPY.lede}
      onClose={onClose}
      dismissible={!saving}
      footer={footer}
    >
      {form}
    </SidePanel>
  );
};
