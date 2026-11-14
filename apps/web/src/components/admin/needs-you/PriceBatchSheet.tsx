'use client';

import { useEffect, useRef } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminSheet } from '@/components/admin/primitives';
import {
  PriceBatchActions,
  PriceBatchList,
  usePriceBatch,
  type PriceBatchRow,
} from './price-batch-parts';

const copy = ADMIN_COPY.needsYou.priceBatch;

export type { PriceBatchRow };

export interface PriceBatchSheetProps {
  row: PriceBatchRow;
  /**
   * Approve exactly these submissions. A rejection keeps the sheet open with a
   * line saying nothing changed; a resolve is the caller's cue to close. Ids
   * left unticked stay waiting: the caller re-reads the queue (the batch's key
   * changes after a partial approval) rather than treating the batch as done.
   */
  onApprove: (submissionIds: string[]) => Promise<void> | void;
  onClose: () => void;
}

/**
 * The price batch sheet (`02-needs-you/a-batch-of-prices`, phone): every price
 * in the batch, ticked, to untick before Approve. The desktop draws the same
 * list as a docked panel (`PriceBatchPanel`).
 */
export const PriceBatchSheet = ({
  row,
  onApprove,
  onClose,
}: PriceBatchSheetProps) => {
  const batch = usePriceBatch(row, onApprove);

  // The sheet's trap puts focus on its first enabled control, which is Cancel
  // while the prices load (Approve is off at 0), and that draws Cancel's focus
  // ring. Rest focus on the list's own box instead, so the sheet opens neutral.
  // It runs after the trap's own effect (a parent effect follows its children).
  const restRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Only take focus from the trap's own opening choice (a button, or
      // nothing), never from a control the person has already moved to.
      const active = document.activeElement;
      if (
        active === null ||
        active === document.body ||
        active instanceof HTMLButtonElement
      )
        restRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AdminSheet
      onClose={onClose}
      title={copy.title(batch.count)}
      subtitle={copy.sub}
      footer={<PriceBatchActions batch={batch} onClose={onClose} />}
      dismissible={!batch.busy}
    >
      <div
        ref={restRef}
        tabIndex={-1}
        data-testid="price-batch-sheet"
        style={{ outline: 'none' }}
      >
        <PriceBatchList batch={batch} />
      </div>
    </AdminSheet>
  );
};
