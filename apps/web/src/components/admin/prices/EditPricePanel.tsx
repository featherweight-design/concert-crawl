'use client';

import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import type { SubmittedRow } from './submitted-api';
import { parseDollars, shortDate } from './prices-rules';

const ADD = ADMIN_COPY.pricesPage.add;
const COPY = ADMIN_COPY.pricesSubmitted.edit;

const inputStyle: CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 12px',
  borderRadius: 10,
  fontSize: 13.5,
  color: 'var(--fg)',
  background: 'var(--bg)',
  border: '1px solid var(--border-strong)',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--fg-muted)',
  marginBottom: 6,
};

/** "45.00" as typed back into the field: "45"; "45.50" stays. */
const asTyped = (value: string | null): string => {
  if (value === null) return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

interface EditPricePanelProps {
  /** Only what the sheet draws, so Event edit can open it for its own price. */
  row: Pick<
    SubmittedRow,
    'title' | 'venueName' | 'date' | 'priceMin' | 'priceMax'
  >;
  onClose: () => void;
  /** Saves the two amounts; resolves with the refusal's text, or null when saved. */
  onSave: (priceMin: string, priceMax: string | null) => Promise<string | null>;
}

/**
 * Edit price on a waiting or published submission: the Add a price sheet
 * (`06/prices-row-menu` says "Same sheet as Add a price") with the price fields
 * only, filled with what is stored. A right-docked panel on a desktop, a
 * bottom sheet on a phone.
 */
export const EditPricePanel = ({
  row,
  onClose,
  onSave,
}: EditPricePanelProps) => {
  const isPhone = useIsPhone();
  const formId = useId();
  const startsFree = Number(row.priceMin) === 0 && row.priceMax === null;
  const [lowest, setLowest] = useState(startsFree ? '' : asTyped(row.priceMin));
  const [highest, setHighest] = useState(asTyped(row.priceMax));
  const [free, setFree] = useState(startsFree);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const min = free ? '0.00' : parseDollars(lowest);
    // A zero lowest is "It's free", as the Add sheet reads it.
    if (min === null || (!free && Number(min) === 0)) {
      setError(ADD.needsPrice);
      return;
    }
    const max = free || highest.trim() === '' ? null : parseDollars(highest);
    if (
      !free &&
      highest.trim() !== '' &&
      (max === null || Number(max) < Number(min))
    ) {
      setError(ADD.needsHighest);
      return;
    }
    // Nothing changed: close without a write (and without an audit row).
    if (
      Number(min) === Number(row.priceMin) &&
      (max === null
        ? row.priceMax === null
        : row.priceMax !== null && Number(max) === Number(row.priceMax))
    ) {
      onClose();
      return;
    }
    setError(null);
    setBusy(true);
    const refused = await onSave(min, max);
    // A saved price closes the panel, so only a refusal needs the form back.
    if (refused !== null) {
      setBusy(false);
      setError(refused);
    }
  };

  const fields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label htmlFor={`${formId}-lowest`} style={labelStyle}>
            {ADD.lowest}
          </label>
          <input
            id={`${formId}-lowest`}
            inputMode="decimal"
            autoComplete="off"
            disabled={free || busy}
            value={free ? '' : lowest}
            onChange={(event) => setLowest(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !busy) void save();
            }}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-highest`} style={labelStyle}>
            {isPhone ? ADD.highest : ADD.highestOptional}
          </label>
          <input
            id={`${formId}-highest`}
            inputMode="decimal"
            autoComplete="off"
            disabled={free || busy}
            value={free ? '' : highest}
            onChange={(event) => setHighest(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !busy) void save();
            }}
            style={inputStyle}
          />
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={free}
          disabled={busy}
          onChange={(event) => setFree(event.target.checked)}
        />
        {ADD.free}
      </label>
      {error && (
        <div role="alert" style={{ fontSize: 13, color: 'var(--danger-fg)' }}>
          {error}
        </div>
      )}
    </div>
  );

  const footer = (
    <AdminButton
      variant="gradient"
      size="md"
      disabled={busy}
      onClick={() => void save()}
      style={{ flex: 1, height: isPhone ? 44 : 40 }}
    >
      {COPY.save}
    </AdminButton>
  );

  const sub = [row.venueName, row.date === null ? '' : shortDate(row.date)]
    .filter(Boolean)
    .join(' · ');

  if (isPhone) {
    return (
      <AdminSheet
        onClose={onClose}
        title={COPY.sheetTitle}
        subtitle={[row.title, sub].filter(Boolean).join(' · ')}
        footer={footer}
        dismissible={!busy}
      >
        {fields}
      </AdminSheet>
    );
  }

  return (
    <SidePanel
      onClose={onClose}
      eyebrow={
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--success)',
          }}
        >
          {ADD.eyebrow}
        </span>
      }
      title={row.title}
      subtitle={sub}
      footer={footer}
      width={460}
      dismissible={!busy}
    >
      {fields}
    </SidePanel>
  );
};
