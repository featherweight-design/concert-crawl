'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton } from '@/components/admin/primitives';
import { priceRange } from '@/components/admin/prices/submitted-rules';
import {
  submittedApi,
  type SubmittedRow,
} from '@/components/admin/prices/submitted-api';
import { metaDate } from './needs-you-rules';

const copy = ADMIN_COPY.needsYou.priceBatch;

/** The pending list's page size, the endpoint's cap. */
const PAGE = 100;

/** What a price batch needs of a queue row: its key and the batch's submissions. */
export interface PriceBatchRow {
  key: string;
  submissionIds: readonly string[];
}

export type PriceBatchLoad =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'ready'; rows: SubmittedRow[]; gone: number };

/**
 * A price batch's prices, ticked, to untick before Approve. The queue item
 * carries only submission ids, so the prices are read from the pending list and
 * matched by id; ids no longer waiting are counted, not shown, and never sent.
 * The phone sheet (`02/a-batch-of-prices`) and the desktop panel
 * (`10/price-batch-d`) both draw from this.
 *
 * `onApprove` approves exactly the ticked ids. A rejection keeps the surface
 * open with a line saying nothing changed; a resolve is the caller's cue to
 * close. Ids left unticked stay waiting: the caller re-reads the queue (the
 * batch's key changes after a partial approval).
 */
export const usePriceBatch = (
  row: PriceBatchRow,
  onApprove: (submissionIds: string[]) => Promise<void> | void,
) => {
  const { getToken } = useAuth();
  // Read through a ref: a `getToken` that changes identity on a render must not
  // restart the load (and, through it, the render) in a loop.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const [load, setLoad] = useState<PriceBatchLoad>({ kind: 'loading' });
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState(false);

  // Keyed on the ids' text, not the array's identity, so a parent that rebuilds
  // an identical list on every render does not restart the load.
  const idKey = row.submissionIds.join(',');
  const wanted = useMemo(
    () => new Set(idKey === '' ? [] : idKey.split(',')),
    [idKey],
  );

  // Each read takes a turn number; a read that is no longer the latest (the
  // batch changed, or the surface closed) drops its answer.
  const turn = useRef(0);
  useEffect(
    () => () => {
      turn.current += 1;
    },
    [],
  );

  const read = useCallback(async () => {
    turn.current += 1;
    const mine = turn.current;
    setLoad({ kind: 'loading' });
    try {
      const api = submittedApi(() => tokenRef.current());
      const found: SubmittedRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const page = await api.list('waiting', '', offset, PAGE);
        found.push(...page.rows.filter((entry) => wanted.has(entry.id)));
        // Stop at the end of the list, once every id has turned up, or when
        // the server stops giving rows or a usable total (no endless paging).
        if (
          page.rows.length === 0 ||
          !Number.isFinite(page.total) ||
          offset + PAGE >= page.total ||
          found.length >= wanted.size
        )
          break;
      }
      if (mine !== turn.current) return;
      // What was unticked belongs to the list just replaced.
      setUnticked(new Set());
      setLoad({
        kind: 'ready',
        rows: found,
        gone: Math.max(0, wanted.size - found.length),
      });
    } catch (err) {
      if (mine !== turn.current) return;
      console.error('[admin] price batch failed to load', err);
      setLoad({ kind: 'failed' });
    }
  }, [wanted]);

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

  return {
    load,
    rows,
    ticked,
    unticked,
    busy,
    refused,
    toggle,
    approve,
    read,
    /** The batch's size for the title: the read rows once known, else the ids. */
    count: load.kind === 'ready' ? rows.length : row.submissionIds.length,
  };
};

export type PriceBatch = ReturnType<typeof usePriceBatch>;

export const batchNote = {
  margin: 0,
  fontSize: 13.5,
  lineHeight: 1.45,
  color: 'var(--fg-muted)',
} satisfies CSSProperties;

/** Where the prices stand: loading, failed, all gone, then the ticked list. */
export const PriceBatchList = ({
  batch,
  size = 'sheet',
}: {
  batch: PriceBatch;
  /** The phone sheet and the desktop panel draw the row at their own sizes. */
  size?: 'sheet' | 'panel';
}) => {
  const { load, rows, unticked, busy, refused, toggle, read } = batch;
  const wide = size === 'panel';
  return (
    <>
      {load.kind === 'loading' && (
        <p role="status" style={batchNote}>
          {copy.loading}
        </p>
      )}
      {load.kind === 'failed' && (
        <div role="alert" style={{ ...batchNote, display: 'grid', gap: 10 }}>
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
        <p role="status" style={batchNote}>
          {copy.allGone}
        </p>
      )}
      {load.kind === 'ready' && rows.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((entry, index) => {
            const on = !unticked.has(entry.id);
            const name = entry.title === '' ? copy.untitled : entry.title;
            return (
              <li
                key={entry.id}
                style={{
                  borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                <label
                  className="price-batch-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: wide ? '10px 0' : '12px 0',
                    cursor: 'pointer',
                  }}
                >
                  {/* The board's tile: cyan with a dark check when ticked.
                      The native box stays under it for the keyboard and
                      screen readers. */}
                  <span
                    style={{
                      position: 'relative',
                      flex: 'none',
                      width: 22,
                      height: 22,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={busy}
                      aria-label={copy.rowLabel(name)}
                      onChange={() => toggle(entry.id)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        margin: 0,
                        opacity: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <span
                      aria-hidden="true"
                      className="price-batch-tile"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        boxSizing: 'border-box',
                        color: 'var(--bg)',
                        background: on ? 'var(--signal)' : 'transparent',
                        border: `1.5px solid ${on ? 'var(--signal)' : 'var(--border-strong)'}`,
                      }}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: wide ? 15 : 14.5,
                        fontWeight: wide ? 600 : 700,
                        color: 'var(--fg)',
                      }}
                    >
                      {name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: wide ? 13 : 12.5,
                        color: 'var(--fg-muted)',
                        // One line, as the board draws it; a long venue or a
                        // narrow phone cuts with an ellipsis.
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {[entry.venueName, entry.date && metaDate(entry.date)]
                        .filter(Boolean)
                        .join(copy.metaSeparator)}
                    </span>
                  </span>
                  {/* The board sets the price and the chip on one line. */}
                  <span
                    style={{
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: wide ? 15 : 14.5,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {priceRange(entry.priceMin, entry.priceMax)}
                    </span>
                    <span
                      style={{
                        padding: '3px 11px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: 'var(--success)',
                        border:
                          '1px solid color-mix(in srgb, var(--success) 45%, transparent)',
                        background:
                          'color-mix(in srgb, var(--success) 12%, transparent)',
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
        <p style={{ ...batchNote, marginTop: 8 }}>{copy.gone(load.gone)}</p>
      )}
      {refused && (
        <p
          role="alert"
          style={{ ...batchNote, color: 'var(--danger)', marginTop: 8 }}
        >
          {copy.approveFailed}
        </p>
      )}
    </>
  );
};

/** Approve N (taking the width) beside Cancel, as both boards set them. */
export const PriceBatchActions = ({
  batch,
  onClose,
  height,
}: {
  batch: PriceBatch;
  onClose: () => void;
  /** The desktop panel's buttons are taller than the sheet's. */
  height?: number;
}) => (
  <div style={{ display: 'flex', gap: 10 }}>
    <AdminButton
      type="button"
      variant="gradient"
      style={{ flex: 1, ...(height ? { height } : {}) }}
      disabled={batch.busy || batch.ticked.length === 0}
      onClick={() => void batch.approve()}
    >
      {batch.busy ? copy.approving : copy.approve(batch.ticked.length)}
    </AdminButton>
    <AdminButton
      type="button"
      variant="outline"
      style={height ? { height } : undefined}
      disabled={batch.busy}
      onClick={onClose}
    >
      {copy.cancel}
    </AdminButton>
  </div>
);
