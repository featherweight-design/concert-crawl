'use client';

import { useId, useState } from 'react';
import type { CSSProperties } from 'react';
import { ExternalLink } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AdminButton,
  AdminSheet,
  SidePanel,
  useIsPhone,
} from '@/components/admin/primitives';
import { SafeExternalLink } from '@/components/admin/SafeExternalLink';
import type { MissingRow, NewPrice } from './prices-api';
import {
  asHttpUrl,
  parseDollars,
  shortDate,
  vendorOfUrl,
} from './prices-rules';

const COPY = ADMIN_COPY.pricesPage.add;

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

export interface AddPriceOutcome {
  ok: boolean;
  /** The reason a refused save gives, shown under the form. */
  error?: string;
}

interface AddPricePanelProps {
  row: MissingRow;
  onClose: () => void;
  /** Saves the price (and the sold-out mark); `next` opens the next show. */
  onSubmit: (
    price: NewPrice,
    extras: { soldOut: boolean; sourceUrl: string | null },
    next: boolean,
  ) => Promise<AddPriceOutcome>;
  /**
   * Opened for one show from Event edit (4b#19): no Publish and next, and no
   * Sold out row, which lives in that page's Status card (4b#20).
   */
  single?: boolean;
}

/**
 * Add a price to one show (`06/prices-add-a-price-in-flow`, `add-a-price-mobile`):
 * a right-docked panel on a desktop, a bottom sheet on a phone. It publishes now
 * as the admin's own submission; Publish and next then opens the next show.
 */
export const AddPricePanel = ({
  row,
  onClose,
  onSubmit,
  single = false,
}: AddPricePanelProps) => {
  const isPhone = useIsPhone();
  const formId = useId();
  const [lowest, setLowest] = useState('');
  const [highest, setHighest] = useState('');
  const [free, setFree] = useState(false);
  const [soldOut, setSoldOut] = useState(false);
  const [source, setSource] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (next: boolean) => {
    const sourceUrl = source.trim() === '' ? null : asHttpUrl(source);
    if (source.trim() !== '' && sourceUrl === null) {
      setError(COPY.needsSource);
      return;
    }
    const min = free ? '0.00' : parseDollars(lowest);
    if (min === null) {
      setError(COPY.needsPrice);
      return;
    }
    const max = free || highest.trim() === '' ? null : parseDollars(highest);
    if (
      !free &&
      highest.trim() !== '' &&
      (max === null || Number(max) < Number(min))
    ) {
      setError(COPY.needsHighest);
      return;
    }
    setError(null);
    setBusy(true);
    const outcome = await onSubmit(
      {
        eventId: row.eventId,
        priceMin: min,
        ...(max === null ? {} : { priceMax: max }),
        vendor: sourceUrl === null ? 'Other' : vendorOfUrl(sourceUrl),
        howFound: 'saw_listing',
      },
      { soldOut, sourceUrl },
      next,
    );
    setBusy(false);
    if (!outcome.ok) setError(outcome.error ?? COPY.saveFailed);
  };

  const fields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SafeExternalLink
        href={row.ticketUrl}
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: isPhone ? 38 : 36,
          padding: '0 12px',
          borderRadius: 9,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--fg)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-strong)',
          textDecoration: 'none',
        }}
      >
        <ExternalLink size={14} strokeWidth={1.8} />
        {COPY.openTicketPage}
      </SafeExternalLink>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label htmlFor={`${formId}-lowest`} style={labelStyle}>
            {COPY.lowest}
          </label>
          <input
            id={`${formId}-lowest`}
            inputMode="decimal"
            autoComplete="off"
            disabled={free || busy}
            value={free ? '' : lowest}
            onChange={(event) => setLowest(event.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-highest`} style={labelStyle}>
            {isPhone ? COPY.highest : COPY.highestOptional}
          </label>
          <input
            id={`${formId}-highest`}
            inputMode="decimal"
            autoComplete="off"
            disabled={free || busy}
            value={free ? '' : highest}
            onChange={(event) => setHighest(event.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: isPhone ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: isPhone ? 16 : 8,
          fontSize: isPhone ? 14 : 13.5,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={free}
            disabled={busy}
            onChange={(event) => setFree(event.target.checked)}
          />
          {COPY.free}
        </label>
        {!single && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={soldOut}
              disabled={busy}
              onChange={(event) => setSoldOut(event.target.checked)}
            />
            {COPY.soldOut}
          </label>
        )}
      </div>
      {!isPhone && (
        <>
          <div>
            <label htmlFor={`${formId}-source`} style={labelStyle}>
              {COPY.source}
            </label>
            <input
              id={`${formId}-source`}
              inputMode="url"
              autoComplete="off"
              disabled={busy}
              placeholder={COPY.sourcePlaceholder}
              value={source}
              onChange={(event) => setSource(event.target.value)}
              style={inputStyle}
            />
          </div>
          <div
            style={{
              borderRadius: 10,
              background: 'var(--surface-2)',
              padding: '10px 12px',
              fontSize: 12.5,
              color: 'var(--fg-muted)',
            }}
          >
            {COPY.note}
          </div>
        </>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 13, color: 'var(--danger-fg)' }}>
          {error}
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      {!single && (
        <AdminButton
          variant="gradient"
          size="md"
          disabled={busy}
          onClick={() => void submit(true)}
          style={{ flex: 1, height: isPhone ? 44 : 40 }}
        >
          {COPY.publishAndNext}
        </AdminButton>
      )}
      <AdminButton
        variant={single ? 'gradient' : 'outline'}
        size="md"
        disabled={busy}
        onClick={() => void submit(false)}
        style={{ height: isPhone ? 44 : 40, ...(single && { flex: 1 }) }}
      >
        {COPY.publish}
      </AdminButton>
    </>
  );

  if (isPhone) {
    return (
      <AdminSheet
        onClose={onClose}
        title={COPY.sheetTitle}
        subtitle={[row.title, row.venueName, shortDate(row.date)]
          .filter(Boolean)
          .join(' · ')}
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
          {COPY.eyebrow}
        </span>
      }
      title={row.title}
      subtitle={[
        row.venueName,
        shortDate(row.date),
        ADMIN_COPY.pricesPage.missing.watching(row.watching),
      ]
        .filter(Boolean)
        .join(' · ')}
      footer={footer}
      width={460}
      dismissible={!busy}
    >
      {fields}
    </SidePanel>
  );
};
