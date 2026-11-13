'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, AdminSheet } from '@/components/admin/primitives';
import { priceRange } from '@/components/admin/prices/submitted-rules';
import {
  submittedApi,
  type SubmittedRow,
} from '@/components/admin/prices/submitted-api';
import { metaDate } from './needs-you-rules';

const copy = ADMIN_COPY.needsYou.priceBatch;

/** The pending list's page size, the endpoint's cap. */
const PAGE = 100;

/** What the sheet needs of a queue row: its key and the batch's submissions. */
export interface PriceBatchRow {
  key: string;
  submissionIds: readonly string[];
}

export interface PriceBatchSheetProps {
  row: PriceBatchRow;
  /**
   * Approve exactly these submissions. A rejection keeps the sheet open with a
   * line saying nothing changed; a resolve is the caller's cue to close.
   */
  onApprove: (submissionIds: string[]) => Promise<void> | void;
  onClose: () => void;
}

type Load =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; rows: SubmittedRow[]; gone: number };

/**
 * The price batch sheet (`02-needs-you/a-batch-of-prices`, phone only): every
 * price in the batch, ticked, to untick before Approve. The queue item carries
 * only submission ids, so the prices are read from the pending list and matched
 * by id; ids no longer waiting are counted, not shown, and never sent.
 */
export const PriceBatchSheet = ({
  row,
  onApprove,
  onClose,
}: PriceBatchSheetProps) => {
  const { getToken } = useAuth();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  const wanted = useMemo(() => new Set(row.submissionIds), [row.submissionIds]);

  const read = useCallback(async () => {
    setLoad({ kind: 'loading' });
    try {
      const api = submittedApi(getToken);
      const found: SubmittedRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const page = await api.list('waiting', '', offset, PAGE);
        found.push(...page.rows.filter((entry) => wanted.has(entry.id)));
        // Stop at the end of the list, or once every id has turned up.
        if (offset + PAGE >= page.total || found.length >= wanted.size) break;
      }
      setLoad({
        kind: 'ready',
        rows: found,
        gone: Math.max(0, wanted.size - found.length),
      });
    } catch {
      setLoad({ kind: 'failed' });
    }
  }, [getToken, wanted]);

  useEffect(() => {
    void read();
  }, [read]);

  const rows = load.kind === 'ready' ? load.rows : [];
  const ticked = rows.filter((entry) => !unticked.has(entry.id));

  const toggle = (id: string) =>
    setUnticked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const approve = async () => {
    if (ticked.length === 0 || busy) return;
    setBusy(true);
    setRefused(false);
    try {
      await onApprove(ticked.map((entry) => entry.id));
    } catch {
      setRefused(true);
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      <AdminButton
        type="button"
        variant="gradient"
        fullWidth
        disabled={busy || ticked.length === 0}
        onClick={() => void approve()}
      >
        {busy ? copy.approving : copy.approve(ticked.length)}
      </AdminButton>
      <AdminButton
        type="button"
        variant="outline"
        disabled={busy}
        onClick={onClose}
      >
        {copy.cancel}
      </AdminButton>
    </>
  );

  return (
    <AdminSheet
      onClose={onClose}
      title={copy.title(
        load.kind === 'ready' ? rows.length : row.submissionIds.length,
      )}
      subtitle={copy.sub}
      footer={footer}
      dismissible={!busy}
    >
      <div data-testid="price-batch-sheet">
        {load.kind === 'loading' && (
          <p role="status" style={note}>
            {copy.loading}
          </p>
        )}
        {load.kind === 'failed' && (
          <div role="alert" style={{ ...note, display: 'grid', gap: 10 }}>
            <span>{copy.loadFailed}</span>
            <span>
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void read()}
              >
                {copy.retry}
              </AdminButton>
            </span>
          </div>
        )}
        {load.kind === 'ready' && rows.length === 0 && (
          <p role="status" style={note}>
            {copy.allGone}
          </p>
        )}
        {load.kind === 'ready' && rows.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((entry, index) => {
              const on = !unticked.has(entry.id);
              const name = entry.title === '' ? '—' : entry.title;
              return (
                <li
                  key={entry.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      aria-label={copy.rowLabel(name)}
                      onChange={() => toggle(entry.id)}
                      style={{ width: 18, height: 18, flex: 'none' }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14.5,
                          fontWeight: 700,
                          color: 'var(--fg)',
                        }}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12.5,
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {[entry.venueName, entry.date && metaDate(entry.date)]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <span style={{ flex: 'none', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 14.5,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {priceRange(entry.priceMin, entry.priceMax)}
                      </span>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 3,
                          padding: '1px 8px',
                          borderRadius: 999,
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--success)',
                          background:
                            'color-mix(in srgb, var(--success) 14%, transparent)',
                        }}
                      >
                        {copy.fans(entry.backedBy)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {load.kind === 'ready' && load.gone > 0 && rows.length > 0 && (
          <p style={{ ...note, marginTop: 8 }}>{copy.gone(load.gone)}</p>
        )}
        {refused && (
          <p
            role="alert"
            style={{ ...note, color: 'var(--danger)', marginTop: 8 }}
          >
            {copy.approveFailed}
          </p>
        )}
      </div>
    </AdminSheet>
  );
};

const note = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.45,
  color: 'var(--fg-muted)',
} satisfies React.CSSProperties;
