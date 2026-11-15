'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  todayInDenver,
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
/** The 409 warning's Open it, where focus lands on an exact duplicate. */
const OPEN_EXISTING_ID = 'add-show-open-existing';

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
 *
 * `phone` is the opener's `useIsPhone()`, already settled when Add a show is
 * pressed, so the form never paints a desktop frame first on a phone.
 */
export const AddShow = ({
  onClose,
  phone,
}: {
  onClose: () => void;
  phone: boolean;
}) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const api = useMemo(() => addShowApi(getToken), [getToken]);
  // The day the API's `date_past` reads, read each render so a form left
  // open past midnight moves with it.
  const today = todayInDenver();

  const [draft, setDraft] = useState<AddShowDraft>(EMPTY_DRAFT);
  const [touched, setTouched] = useState<ReadonlySet<AddShowField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  // `failed`: nothing was added; a retry may succeed. `maybe`: a timed-out
  // POST may have committed and no single new show was found; the retry's
  // 409 opens one that did land. `refused`: the API refused the body with
  // nothing the form can pin on a field, so a retry would only be refused
  // again; the toast offers none, and editing a field clears it.
  const [failure, setFailure] = useState<'failed' | 'maybe' | 'refused' | null>(
    null,
  );
  const [venues, setVenues] = useState<PickVenue[] | 'failed' | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateShow[]>([]);
  const [exactId, setExactId] = useState<string | null>(null);

  // A reply that lands after the form closed must not navigate or set state.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // A second press before the first re-render sends no second POST.
  const savingRef = useRef(false);
  // The element to focus once a refused save re-enables the form.
  const focusAfterSave = useRef<string | null>(null);
  useEffect(() => {
    if (saving || focusAfterSave.current === null) return;
    document.getElementById(focusAfterSave.current)?.focus();
    focusAfterSave.current = null;
  }, [saving]);

  const loadVenues = useCallback(() => {
    setVenues(null);
    api.venues().then(setVenues, (err: unknown) => {
      console.error('[admin add show] venues failed', err);
      setVenues('failed');
    });
  }, [api]);
  useEffect(loadVenues, [loadVenues]);

  // The warning follows venue, date and title as they're typed. A new venue
  // or date is another night, so its warning clears at once; a title edit
  // keeps the last warning until the next check lands, so it never flickers.
  const { venueId, date, title } = draft;
  useEffect(() => {
    setDuplicates([]);
  }, [venueId, date]);
  useEffect(() => {
    if (venueId === '' || date === '') return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .duplicates({ venueId, date, title: title.trim() }, controller.signal)
        .then(
          (rows) => {
            if (!controller.signal.aborted) setDuplicates(rows);
          },
          () => {
            // A newer keystroke's abort keeps the last warning; a failed
            // check shows none, as it's a warning only.
            if (!controller.signal.aborted) setDuplicates([]);
          },
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

  // The text inputs' drawn focus: a 1px signal border, unless invalid. Kept
  // here, not in the shared `inputStyle`, which other screens draw unfocused.
  const [focused, setFocused] = useState<AddShowField | null>(null);
  const textInput = (field: 'title' | 'ticketUrl') => {
    const { invalid } = look(field);
    return {
      className: 'admin-add-show-input',
      onFocus: () => setFocused(field),
      style: {
        ...inputStyle(invalid),
        ...(focused === field &&
          !invalid && { border: '1px solid var(--signal)', outline: 'none' }),
        ...(phone && { fontSize: 16 }),
      },
    };
  };

  const set = <K extends AddShowField>(field: K, value: AddShowDraft[K]) => {
    setDraft((was) => ({ ...was, [field]: value }));
    // The API's refusal for a field clears once that field changes.
    setServerErrors((was) => {
      const next = { ...was };
      delete next[field];
      return next;
    });
    setExactId(null);
    setFailure(null);
  };
  const touch = (field: AddShowField) =>
    setTouched((was) => new Set(was).add(field));

  const leave = (href: string) => {
    router.push(href);
    onClose();
  };

  /** The one new show a timed-out POST may have saved, or null. */
  const findAfterTimeout = async (
    body: ReturnType<typeof toBody>,
    before: ReadonlySet<string> | null,
  ): Promise<string | null> => {
    // No before-read: an older twin can't be told apart, so don't guess.
    if (before === null) return null;
    try {
      return await api.findCreated(body, before);
    } catch (err) {
      console.error('[admin add show] finding a timed-out show failed', err);
      return null;
    }
  };

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFailure(null);
    const body = toBody(draft);
    let next: typeof failure = null;
    try {
      // Read first, so a timed-out create can tell its own show from an
      // older twin that night (add-show-api `create`). A failed read never
      // blocks the save: it only rules out finding the show after a timeout.
      let before: ReadonlySet<string> | null = null;
      try {
        before = await api.manualIdsBefore(body);
      } catch (err) {
        console.error('[admin add show] reading the night failed', err);
      }
      if (!mounted.current) return;
      const result = await api.create(body);
      if (!mounted.current) return;
      if (result.kind === 'created') {
        leave(editEventHref(result.id));
        return;
      }
      if (result.kind === 'timeout') {
        // The POST may still have saved it: open the one new show, if found.
        const found = await findAfterTimeout(body, before);
        if (!mounted.current) return;
        if (found !== null) {
          leave(editEventHref(found));
          return;
        }
        // None, several, or no way to tell: it may have been added. If it
        // did land, the retry's 409 opens it through the duplicate warning.
        console.error('[admin add show] create timed out, no show found');
        next = 'maybe';
      } else if (result.kind === 'duplicate') {
        setExactId(result.existingId);
        focusAfterSave.current = OPEN_EXISTING_ID;
      } else {
        const refused: FieldErrors = {};
        for (const issue of result.issues)
          if (isAddShowField(issue.field)) refused[issue.field] ??= issue.code;
        setServerErrors(refused);
        const first = ADD_SHOW_FIELDS.find((field) => refused[field]);
        if (first) focusAfterSave.current = fieldId(first);
        else {
          console.error('[admin add show] create refused', result.issues);
          next = 'refused';
        }
      }
    } catch (err) {
      if (!mounted.current) return;
      console.error('[admin add show] create failed', err);
      next = 'failed';
    } finally {
      savingRef.current = false;
    }
    setFailure(next);
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
  const openIt = (id: string, buttonId?: string) => (
    <button
      type="button"
      id={buttonId}
      onClick={() => leave(editEventHref(id))}
      style={LINK}
    >
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
            {openIt(exactId, OPEN_EXISTING_ID)}
            {COPY.duplicate.exactTail}
          </>
        ) : likeliest && venueName ? (
          <>
            {COPY.duplicate.lead(
              venueName,
              fieldDate(date, false),
              !likeliest.manual,
            )}
            <b>{likeliest.title.replace(/\.+$/, '')}</b>
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

  // After Add show, the first error is announced: the inline lines alone
  // are silent to a screen reader.
  const firstShown = ADD_SHOW_FIELDS.find((field) => shown[field]);
  const announced = submitted && firstShown ? errorOf(firstShown) : '';

  const form = (
    <fieldset
      data-testid="add-show"
      // Read-only mid-save: what was sent is what's on screen.
      disabled={saving}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minWidth: 0,
        margin: 0,
        padding: 0,
        border: 'none',
      }}
    >
      <div
        data-testid="add-show-announcer"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announced}
      </div>
      <Field field="title" label={COPY.titleField} error={errorOf('title')}>
        <input
          id={fieldId('title')}
          value={draft.title}
          placeholder={COPY.titlePlaceholder}
          aria-invalid={look('title').invalid || undefined}
          aria-describedby={look('title').describedBy}
          onChange={(evt) => set('title', evt.target.value)}
          {...textInput('title')}
          onBlur={() => {
            setFocused(null);
            touch('title');
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
          {...textInput('ticketUrl')}
          onBlur={() => {
            setFocused(null);
            touch('ticketUrl');
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
    </fieldset>
  );

  const buttonHeight = phone ? 46 : 40;
  const footer = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {failure && (
        <div
          // The phone floats it 12px in, 96px up, over the pinned bar (S13
          // `merge-failed`); the AdminSheet panel is its containing block.
          style={
            phone
              ? {
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 'calc(96px + env(safe-area-inset-bottom))',
                  zIndex: 1,
                }
              : undefined
          }
        >
          <SaveFailedToast
            title={COPY.saveFailed.title}
            body={
              failure === 'refused'
                ? COPY.saveFailed.refused
                : failure === 'maybe'
                  ? COPY.saveFailed.maybe
                  : COPY.saveFailed.body
            }
            {...(failure !== 'refused' && { onRetry: () => void save() })}
            retrying={saving}
            {...(phone && {
              padding: '12px',
              gap: 10,
              crossStroke: 2.2,
              shadow: '0 14px 30px rgba(0,0,0,.45)',
            })}
          />
        </div>
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
      formPage
      eyebrow={<KindLabel kind="show" />}
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
