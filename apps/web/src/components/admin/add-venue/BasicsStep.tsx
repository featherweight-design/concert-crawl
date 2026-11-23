'use client';

/**
 * Step 1, Basics (`05/basics-desktop`, `05/step-1-basics-mobile`): name,
 * address, link, capacity and website. Desktop draws the fields in a
 * `1.25fr 1fr` grid with the robots.txt card on the right; the phone draws
 * the fields alone, Capacity's two inputs under one label.
 */

import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminCard, StatusBadge } from '@/components/admin/primitives';
import type { StatusKind } from '@/components/admin/primitives/utils';
import {
  Field,
  fieldErrorId,
  fieldHintId,
} from '@/components/admin/venues/details/details-parts';
import {
  CAPACITY_TYPES,
  capacityTypeLabel,
} from '@/components/admin/venues/details/details-rules';
import { inputStyle } from '@/components/admin/venues/source/source-parts';
import { adminFetch } from '@/lib/api';
import {
  basicsFieldId,
  normalizeWebsite,
  type BasicsDraft,
  type BasicsErrors,
  type BasicsField,
} from './add-venue-rules';

const COPY = ADMIN_COPY.addVenue;
const FIELDS = ADMIN_COPY.venueDetails.fields;
const ROBOTS = COPY.basics.robots;

/** iOS Safari zooms a focused input under 16px, so the phone draws 16. */
const fieldFontSize = (phone: boolean) => (phone ? 16 : 13.5);

const boxStyle = (invalid: boolean, phone: boolean): CSSProperties => ({
  ...inputStyle(invalid),
  fontSize: fieldFontSize(phone),
});

// The boards draw the type control as a plain box; the phone adds its own
// chevron (`step-1-basics-mobile`), so the native one is dropped on both.
const selectStyle = (phone: boolean): CSSProperties => ({
  ...boxStyle(false, phone),
  appearance: 'none',
  paddingRight: phone ? 32 : 12,
});

/** The phone board's chevron: 13px, muted, 1.8 stroke, at the box's right. */
const SelectChevron = () => (
  <ChevronDown
    aria-hidden
    size={13}
    strokeWidth={1.8}
    style={{
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--fg-muted)',
      pointerEvents: 'none',
    }}
  />
);

const idOf = basicsFieldId;

/** The error line under a field, else its hint, for `aria-describedby`. */
const describedBy = (
  field: BasicsField,
  errors: BasicsErrors,
  hasHint = false,
): string | undefined =>
  errors[field] !== undefined
    ? fieldErrorId(idOf(field))
    : hasHint
      ? fieldHintId(idOf(field))
      : undefined;

/** `all: unset` drops the slug input's focus ring, so its box draws one. */
const SLUG_BOX_FOCUS =
  'focus-within:[box-shadow:0_0_0_2px_var(--bg),0_0_0_4px_var(--signal)]';

type RobotsState = 'idle' | 'checking' | 'allowed' | 'disallowed' | 'unknown';

const ROBOTS_KIND: Record<'allowed' | 'disallowed' | 'unknown', StatusKind> = {
  allowed: 'success',
  disallowed: 'danger',
  unknown: 'neutral',
};

/** How long the website must sit still before it is checked. */
const ROBOTS_DEBOUNCE_MS = 600;

/**
 * The robots.txt verdict for the website as typed: the same check the crawler
 * runs (`/api/admin/robots-check`), once the field settles on a valid link.
 */
export const useRobotsVerdict = (website: string): RobotsState => {
  const [state, setState] = useState<RobotsState>('idle');
  const url = normalizeWebsite(website);
  useEffect(() => {
    if (url === null) {
      setState('idle');
      return;
    }
    let stale = false;
    setState('checking');
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await adminFetch(
            `/api/admin/robots-check?url=${encodeURIComponent(url)}`,
          );
          const body: unknown = res.ok ? await res.json() : null;
          const allowed =
            typeof body === 'object' && body !== null && 'allowed' in body
              ? body.allowed
              : null;
          if (stale) return;
          setState(
            allowed === true
              ? 'allowed'
              : allowed === false
                ? 'disallowed'
                : 'unknown',
          );
        } catch {
          if (!stale) setState('unknown');
        }
      })();
    }, ROBOTS_DEBOUNCE_MS);
    return () => {
      stale = true;
      window.clearTimeout(timer);
    };
  }, [url]);
  return state;
};

/** The desktop board's robots.txt card: a pill and "Checked just now". */
const RobotsCard = ({ state }: { state: RobotsState }) => (
  <AdminCard title={ROBOTS.title} phone={false} testId="add-venue-robots">
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {state === 'idle' ? (
        <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {ROBOTS.waiting}
        </span>
      ) : state === 'checking' ? (
        <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
          {ROBOTS.checking}
        </span>
      ) : (
        <>
          <StatusBadge kind={ROBOTS_KIND[state]} dot size="tile">
            {ROBOTS[state]}
          </StatusBadge>
          {state !== 'unknown' && (
            <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>
              {ROBOTS.checkedNow}
            </span>
          )}
        </>
      )}
    </div>
  </AdminCard>
);

interface BasicsStepProps {
  phone: boolean;
  draft: BasicsDraft;
  errors: BasicsErrors;
  /** Set when a save failed for a reason no field owns. */
  formError: string | null;
  busy: boolean;
  onChange: (patch: Partial<BasicsDraft>) => void;
}

export const BasicsStep = ({
  phone,
  draft,
  errors,
  formError,
  busy,
  onChange,
}: BasicsStepProps) => {
  // Only desktop draws the robots.txt card, so only desktop checks.
  const robots = useRobotsVerdict(phone ? '' : draft.website);
  const text = (field: 'name' | 'address' | 'capacity') => (
    <input
      id={idOf(field)}
      value={draft[field]}
      disabled={busy}
      aria-invalid={errors[field] !== undefined}
      aria-describedby={describedBy(field, errors)}
      inputMode={field === 'capacity' ? 'numeric' : undefined}
      onChange={(evt) => onChange({ [field]: evt.target.value })}
      style={boxStyle(errors[field] !== undefined, phone)}
    />
  );
  const capacityType = (
    <select
      id={idOf('capacityType')}
      aria-label={phone ? FIELDS.capacityType.label : undefined}
      value={draft.capacityType}
      disabled={busy}
      onChange={(evt) => onChange({ capacityType: evt.target.value })}
      style={selectStyle(phone)}
    >
      <option value="">{FIELDS.capacityType.none}</option>
      {CAPACITY_TYPES.map((type) => (
        <option key={type} value={type}>
          {capacityTypeLabel(type)}
        </option>
      ))}
    </select>
  );

  const fields = (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: phone ? 14 : 16 }}
    >
      {formError !== null && (
        <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>
          {formError}
        </div>
      )}
      <Field id={idOf('name')} label={FIELDS.name} error={errors.name}>
        {text('name')}
      </Field>
      <Field id={idOf('address')} label={FIELDS.address} error={errors.address}>
        {text('address')}
      </Field>
      <Field
        id={idOf('slug')}
        label={FIELDS.link.label}
        hint={COPY.basics.linkHint}
        error={errors.slug}
      >
        <div
          className={SLUG_BOX_FOCUS}
          style={{
            ...boxStyle(errors.slug !== undefined, phone),
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span aria-hidden style={{ color: 'var(--fg-muted)' }}>
            {FIELDS.link.prefix}
          </span>
          <input
            id={idOf('slug')}
            value={draft.slug}
            disabled={busy}
            aria-invalid={errors.slug !== undefined}
            aria-describedby={describedBy('slug', errors, true)}
            onChange={(evt) => onChange({ slug: evt.target.value })}
            style={{
              all: 'unset',
              flex: 1,
              minWidth: 0,
              height: '100%',
              fontSize: fieldFontSize(phone),
            }}
          />
        </div>
      </Field>
      {phone ? (
        // `step-1-basics-mobile`: one "Capacity" label over the type and the
        // number, side by side at 1.2 : 1.
        <Field
          id={idOf('capacity')}
          label={FIELDS.capacity.label}
          error={errors.capacity}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1.2, minWidth: 0, position: 'relative' }}>
              {capacityType}
              <SelectChevron />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>{text('capacity')}</div>
          </div>
        </Field>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: 10,
            alignItems: 'start',
          }}
        >
          <Field id={idOf('capacityType')} label={FIELDS.capacityType.label}>
            {capacityType}
          </Field>
          <Field
            id={idOf('capacity')}
            label={FIELDS.capacity.label}
            error={errors.capacity}
          >
            {text('capacity')}
          </Field>
        </div>
      )}
      <Field id={idOf('website')} label={FIELDS.website} error={errors.website}>
        <input
          id={idOf('website')}
          value={draft.website}
          disabled={busy}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={COPY.basics.websitePlaceholder}
          aria-invalid={errors.website !== undefined}
          aria-describedby={describedBy('website', errors)}
          onChange={(evt) => onChange({ website: evt.target.value })}
          style={boxStyle(errors.website !== undefined, phone)}
        />
      </Field>
    </div>
  );

  if (phone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
          {COPY.basics.title}
        </h1>
        {fields}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: '-0.02em',
          }}
        >
          {COPY.basics.title}
        </h1>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13.5,
            color: 'var(--fg-muted)',
            maxWidth: '70ch',
          }}
        >
          {COPY.basics.subtitle}
        </p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {fields}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RobotsCard state={robots} />
        </div>
      </div>
    </div>
  );
};
