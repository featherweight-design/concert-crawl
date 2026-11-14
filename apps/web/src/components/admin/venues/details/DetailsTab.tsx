'use client';

import { useId, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import type { Venue } from '@concert-crawl/types';
import { updateVenue } from '@/lib/actions/venues';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminCard as Card, useIsPhone } from '@/components/admin/primitives';
import { inputStyle } from '../source/source-parts';
import { Field, LookCard, Pair } from './details-parts';
import { DetailsAbout, useAboutDraft } from './DetailsAbout';
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

/** A failed save's draft and the baseline it was made against. */
type RetryFrom = { attempt: DetailsDraft; base: DetailsColumns };

/**
 * What went wrong on the last save, for the toast. `retryFrom` is null for a
 * refusal that names its field: a retry would only be refused again.
 */
type Failure = { saved: string; retryFrom: RetryFrom | null };

const selectStyle = (invalid: boolean): CSSProperties => ({
  ...inputStyle(invalid),
  appearance: 'auto',
});

/**
 * The venue page's Details tab (3b part 5): the Venue, About, Tickets,
 * Contact and Look cards, with its own Save bar. Only
 * the Details columns it changed are ever sent: never a Source column (the
 * Website is Source's calendar page, shown read-only, ruling b) or a crawl
 * rule.
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
  // About sits in different parents on phone and desktop, so it remounts
  // across the breakpoint: its state lives here, never in it.
  const aboutDraft = useAboutDraft(venue.id);

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
    // A review left open would let Accept bring back what was discarded.
    aboutDraft.reset();
    setDraft(draftOf(baseline));
    setErrors({});
    setFailure(null);
  };

  const save = async (attempt: DetailsDraft) => {
    const pristine = draftOf(baseline);
    const invalid = validateDetails(attempt, pristine);
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid);
      return;
    }
    const keys = changedColumns(attempt, baseline);
    if (keys.length === 0) {
      // Only formatting changed ("19500" for "19,500"): nothing to send.
      setDraft(pristine);
      return;
    }
    const target = applyColumns(baseline, attempt, keys);
    setErrors({});
    setFailure(null);
    setSaving(true);
    // Every failure keeps the draft, so no edit is lost: the toast's "as they
    // were" is about the saved row, which a failed save leaves untouched.
    const retryFrom = { attempt, base: baseline };
    try {
      const result = await updateVenue(venue.id, detailsFormData(target, keys));
      if (result.success) {
        // A newer server row may have landed mid-save: lay the sent columns
        // over whatever the baseline is now, not the one this save began on.
        setBaseline((current) => applyColumns(current, attempt, keys));
        const sent = draftOf(target);
        const sentFields = editedFields(attempt, pristine);
        setDraft((current) => {
          const next = { ...current };
          for (const key of sentFields) next[key] = sent[key];
          return next;
        });
        router.refresh();
        return;
      }
      const saved = [result.error, COPY.failed.saved].filter(Boolean).join(' ');
      const field = detailsFieldOf(result.field);
      if (field !== null && result.error !== undefined) {
        // A refusal names its input (the slug 409 lands on Link); a retry
        // would only be refused again, so there is no Try again.
        setErrors({ [field]: result.error });
        setFailure({ saved, retryFrom: null });
        return;
      }
      setFailure({ saved, retryFrom });
    } catch (err) {
      console.error('DetailsTab: save failed', { venueId: venue.id, err });
      setFailure({ saved: COPY.failed.saved, retryFrom });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Try again: the failed attempt moved onto the current baseline first, so a
   * server row that landed since is never written back over.
   */
  const retry = ({ attempt, base }: RetryFrom) => {
    const next = rebaseDraft(attempt, draftOf(base), draftOf(baseline));
    setDraft(next);
    void save(next);
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

  // `details-m` draws the cards at 16/18 on phone too (Source's Card takes 14
  // there), so the cards never take the phone padding.
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
        {/* Addendum 5 `details-d`: City sits beside Neighborhood. */}
        <Field
          id={idOf('city')}
          label={FIELDS.city}
          hint={phone ? undefined : FIELDS.cityHint}
          error={errors.city}
        >
          {text('city')}
        </Field>
      </Pair>
      <Field
        id={idOf('mapPin')}
        label={FIELDS.mapPin.label}
        hint={FIELDS.mapPin.hint}
        error={errors.mapPin}
      >
        {text('mapPin')}
      </Field>
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

  const aboutCard = (
    <DetailsAbout
      id={idOf('about')}
      draft={draft}
      saved={savedDraft}
      error={errors.about}
      saving={saving}
      edit={edit}
      review={aboutDraft.review}
      filled={aboutDraft.filled}
      onDraft={() => void aboutDraft.run()}
      onStop={aboutDraft.stop}
      onFilled={aboutDraft.remember}
    />
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

  const lookCard = (
    <LookCard slug={venue.slug} name={venue.name} phone={phone} />
  );

  const column: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: phone ? 12 : 16,
    minWidth: 0,
  };

  const pendingRetry = failure?.retryFrom ?? null;
  const barFailure =
    failure === null
      ? null
      : pendingRetry === null
        ? { saved: failure.saved }
        : { saved: failure.saved, onRetry: () => retry(pendingRetry) };

  return (
    <div
      data-testid="venue-details"
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {phone ? (
        // `details-m`: Venue, Tickets, Contact, Look, then About.
        <div style={column}>
          {venueCard}
          {ticketsCard}
          {contactCard}
          {lookCard}
          {aboutCard}
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
          <div style={column}>
            {venueCard}
            {aboutCard}
          </div>
          <div style={column}>
            {ticketsCard}
            {contactCard}
            {lookCard}
          </div>
        </div>
      )}

      <DetailsSaveBar
        phone={phone}
        edited={edited.length}
        saving={saving}
        failure={barFailure}
        onDiscard={discard}
        onSave={() => void save(draft)}
      />
    </div>
  );
};
