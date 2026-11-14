'use client';

import { useId, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import type { Venue } from '@concert-crawl/types';
import { updateVenue } from '@/lib/actions/venues';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useIsPhone } from '@/components/admin/primitives';
import { Card, inputStyle } from '../source/source-parts';
import { Field, Pair } from './details-parts';
import { DetailsSaveBar } from './DetailsSaveBar';
import {
  CAPACITY_TYPES,
  DRAFT_KEYS,
  TICKET_SELLERS,
  applyColumns,
  capacityTypeLabel,
  changedColumns,
  detailsColumnsOf,
  detailsFieldOf,
  detailsFormData,
  draftOf,
  editedFields,
  rebaseDraft,
  slugify,
  validateDetails,
  websiteHost,
  type DetailsColumns,
  type DetailsDraft,
  type DetailsErrors,
  type DetailsField,
} from './details-rules';

const COPY = ADMIN_COPY.venueDetails;
const FIELDS = COPY.fields;

export type DetailsVenue = DetailsColumns & Pick<Venue, 'id' | 'websiteUrl'>;

/** What went wrong on the last save, for the toast. */
type Failure = { attempt: DetailsDraft | null; saved: string };

const selectStyle = (invalid: boolean): CSSProperties => ({
  ...inputStyle(invalid),
  appearance: 'auto',
});

/**
 * The venue page's Details tab (3b part 5): the Venue, Tickets and Contact
 * cards, with their own Save bar. Only the Details columns it changed are
 * ever sent: never a Source column (the Website is Source's calendar page,
 * shown read-only, ruling b) or a crawl rule. About and City are not edited
 * here yet, so they are never sent; the shell's older sections own them.
 */
export const DetailsTab = ({ venue }: { venue: DetailsVenue }) => {
  const router = useRouter();
  const phone = useIsPhone();
  const ids = useId();
  const idOf = (field: DetailsField | 'website') => `${ids}-${field}`;

  const fromServer = detailsColumnsOf(venue);
  const serverKey = JSON.stringify(fromServer);
  const [baseline, setBaseline] = useState<DetailsColumns>(fromServer);
  const [draft, setDraft] = useState<DetailsDraft>(() => draftOf(fromServer));
  const [seenKey, setSeenKey] = useState(serverKey);
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const savedDraft = draftOf(baseline);
  const edited = editedFields(draft, savedDraft);

  // A fresh server row (after a save, or another tab's) becomes the baseline.
  // Only the fields edited here survive it, so a save never writes an old
  // value back over someone's newer one.
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setBaseline(fromServer);
    setDraft(rebaseDraft(draft, draftOf(baseline), draftOf(fromServer)));
  }

  const edit = (patch: Partial<DetailsDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of DRAFT_KEYS) if (key in patch) delete next[key];
      return next;
    });
  };

  const discard = () => {
    setDraft(draftOf(baseline));
    setErrors({});
    setFailure(null);
  };

  const save = async (attempt: DetailsDraft) => {
    const invalid = validateDetails(attempt);
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid);
      return;
    }
    const keys = changedColumns(attempt, baseline);
    if (keys.length === 0) {
      // Only formatting changed ("19500" for "19,500"): nothing to send.
      setDraft(draftOf(baseline));
      return;
    }
    const target = applyColumns(baseline, attempt, keys);
    setErrors({});
    setFailure(null);
    setSaving(true);
    try {
      const result = await updateVenue(venue.id, detailsFormData(target, keys));
      if (result.success) {
        setBaseline(target);
        setDraft(draftOf(target));
        router.refresh();
        return;
      }
      const saved = [result.error, COPY.failed.saved].filter(Boolean).join(' ');
      const field = detailsFieldOf(result.field);
      if (field !== null && result.error !== undefined) {
        // A refusal names its input (the slug 409 lands on Link); a retry
        // would only be refused again, so the edit stays for fixing.
        setErrors({ [field]: result.error });
        setFailure({ attempt: null, saved });
        return;
      }
      // Rule 10: snap back to what is saved, and offer Try again.
      setDraft(draftOf(baseline));
      setFailure({ attempt, saved });
    } catch (err) {
      console.error('DetailsTab: save failed', { venueId: venue.id, err });
      setDraft(draftOf(baseline));
      setFailure({ attempt, saved: COPY.failed.saved });
    } finally {
      setSaving(false);
    }
  };

  /** A one-line text input bound to a draft field. */
  const text = (
    field: DetailsField,
    type: 'text' | 'url' | 'email' = 'text',
  ) => (
    <input
      id={idOf(field)}
      type={type}
      value={draft[field]}
      disabled={saving}
      aria-invalid={errors[field] !== undefined}
      onChange={(evt) => edit({ [field]: evt.target.value })}
      style={inputStyle(errors[field] !== undefined)}
    />
  );

  const typeKnown = CAPACITY_TYPES.some(
    (type) => capacityTypeLabel(type) === draft.venueType,
  );

  const venueCard = (
    <Card title={COPY.cards.venue} phone={false} testId="details-venue">
      <Field id={idOf('name')} label={FIELDS.name} error={errors.name}>
        {text('name')}
      </Field>
      <Field id={idOf('address')} label={FIELDS.address} error={errors.address}>
        {text('address')}
      </Field>
      <Pair phone={phone}>
        <Field
          id={idOf('neighborhood')}
          label={FIELDS.neighborhood}
          error={errors.neighborhood}
        >
          {text('neighborhood')}
        </Field>
        <Field
          id={idOf('mapPin')}
          label={FIELDS.mapPin.label}
          hint={FIELDS.mapPin.hint}
          error={errors.mapPin}
        >
          {text('mapPin')}
        </Field>
      </Pair>
      {/* The "Change it before it goes live" line is for drafts (3c), and
          the redirect line waits on slug redirects: both held. */}
      <Field id={idOf('slug')} label={FIELDS.link.label} error={errors.slug}>
        <div
          style={{
            ...inputStyle(errors.slug !== undefined),
            display: 'flex',
            alignItems: 'center',
            padding: '0 0 0 12px',
          }}
        >
          <span aria-hidden style={{ color: 'var(--fg-muted)' }}>
            {FIELDS.link.prefix}
          </span>
          <input
            id={idOf('slug')}
            value={draft.slug}
            disabled={saving}
            aria-invalid={errors.slug !== undefined}
            onChange={(evt) => edit({ slug: evt.target.value })}
            style={{
              all: 'unset',
              flex: 1,
              minWidth: 0,
              height: '100%',
              fontSize: 13.5,
            }}
          />
          <button
            type="button"
            disabled={saving}
            aria-label={FIELDS.link.regenerate}
            title={FIELDS.link.regenerate}
            onClick={() => edit({ slug: slugify(draft.name) })}
            style={{
              flex: 'none',
              width: 36,
              height: '100%',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--fg-muted)',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RefreshCw size={13} aria-hidden />
          </button>
        </div>
      </Field>
      <Pair phone={phone}>
        <Field
          id={idOf('venueType')}
          label={FIELDS.capacityType.label}
          error={errors.venueType}
        >
          <select
            id={idOf('venueType')}
            value={draft.venueType}
            disabled={saving}
            onChange={(evt) => edit({ venueType: evt.target.value })}
            style={selectStyle(errors.venueType !== undefined)}
          >
            <option value="">{FIELDS.capacityType.none}</option>
            {CAPACITY_TYPES.map((type) => (
              <option key={type} value={capacityTypeLabel(type)}>
                {capacityTypeLabel(type)}
              </option>
            ))}
            {!typeKnown && draft.venueType !== '' && (
              <option value={draft.venueType}>
                {FIELDS.capacityType.current(draft.venueType)}
              </option>
            )}
          </select>
        </Field>
        <Field
          id={idOf('capacity')}
          label={FIELDS.capacity.label}
          error={errors.capacity}
        >
          <input
            id={idOf('capacity')}
            inputMode="numeric"
            value={draft.capacity}
            disabled={saving}
            aria-invalid={errors.capacity !== undefined}
            onChange={(evt) => edit({ capacity: evt.target.value })}
            style={inputStyle(errors.capacity !== undefined)}
          />
        </Field>
      </Pair>
    </Card>
  );

  const ticketsCard = (
    <Card title={COPY.cards.tickets} phone={false} testId="details-tickets">
      <Field
        id={idOf('ticketVendor')}
        label={FIELDS.ticketSeller.label}
        error={errors.ticketVendor}
      >
        <select
          id={idOf('ticketVendor')}
          value={draft.ticketVendor}
          disabled={saving}
          onChange={(evt) => edit({ ticketVendor: evt.target.value })}
          style={selectStyle(errors.ticketVendor !== undefined)}
        >
          <option value="">{FIELDS.ticketSeller.none}</option>
          {TICKET_SELLERS.map((seller) => (
            <option key={seller} value={seller}>
              {COPY.ticketSellers[seller]}
            </option>
          ))}
        </select>
      </Field>
      {/* Box office has no column (A3 §3b row 16): held. */}
      <Field
        id={idOf('priceUrl')}
        label={FIELDS.pricePage.label}
        hint={FIELDS.pricePage.hint}
        error={errors.priceUrl}
      >
        {text('priceUrl', 'url')}
      </Field>
    </Card>
  );

  const contactCard = (
    <Card title={COPY.cards.contact} phone={false} testId="details-contact">
      {/* Ruling b: Website is Source's calendar page, the one `website_url`.
          Shown here, edited and saved there. */}
      <Field id={idOf('website')} label={FIELDS.website}>
        <input
          id={idOf('website')}
          value={websiteHost(venue.websiteUrl)}
          readOnly
          style={{ ...inputStyle(false), color: 'var(--fg-muted)' }}
        />
      </Field>
      {/* "Used by Ask the venue." is held with Ask the venue (3c, 3e). */}
      <Field
        id={idOf('contactEmail')}
        label={FIELDS.contactEmail.label}
        error={errors.contactEmail}
      >
        {text('contactEmail', 'email')}
      </Field>
    </Card>
  );

  const column: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: phone ? 12 : 16,
    minWidth: 0,
  };

  const retry =
    failure?.attempt == null
      ? undefined
      : () => {
          const { attempt } = failure;
          if (attempt === null) return;
          setDraft(attempt);
          void save(attempt);
        };

  return (
    <div
      data-testid="venue-details"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {phone ? (
        // `details-m`: Venue, Tickets, Contact.
        <div style={column}>
          {venueCard}
          {ticketsCard}
          {contactCard}
        </div>
      ) : (
        // `details-d`: two balanced columns, 1fr each (rule 5).
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 16,
            alignItems: 'start',
          }}
        >
          <div style={column}>{venueCard}</div>
          <div style={column}>
            {ticketsCard}
            {contactCard}
          </div>
        </div>
      )}

      <DetailsSaveBar
        phone={phone}
        edited={edited.length}
        saving={saving}
        failure={
          failure === null
            ? null
            : {
                saved: failure.saved,
                ...(retry === undefined ? {} : { onRetry: retry }),
              }
        }
        onDiscard={discard}
        onSave={() => void save(draft)}
      />
    </div>
  );
};
