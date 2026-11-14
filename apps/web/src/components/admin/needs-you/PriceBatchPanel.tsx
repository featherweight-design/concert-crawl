'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { KindLabel, SidePanel } from '@/components/admin/primitives';
import {
  PriceBatchActions,
  PriceBatchList,
  batchNote,
  usePriceBatch,
  type PriceBatchRow,
} from './price-batch-parts';
import { kindLabelOf } from './needs-you-rules';

const copy = ADMIN_COPY.needsYou.priceBatch;

/**
 * `10-needs-you-panels/price-batch-d`: a batch's panel on desktop, docked beside
 * the queue like every other item. The prices are ticked to untick, Approve
 * counts the ticks, and the footnote says what approving does. The phone draws
 * the same list as a sheet (`PriceBatchSheet`).
 */
export const PriceBatchPanel = ({
  row,
  onApprove,
  onClose,
}: {
  row: PriceBatchRow;
  /** Approve exactly these submissions; a rejection keeps the panel open. */
  onApprove: (submissionIds: string[]) => Promise<void> | void;
  onClose: () => void;
}) => {
  const batch = usePriceBatch(row, onApprove);
  return (
    <SidePanel
      inline
      onClose={onClose}
      dismissible={!batch.busy}
      eyebrow={<KindLabel kind={kindLabelOf('price-batch')} />}
      title={copy.title(batch.count)}
      subtitle={copy.panelSub}
      footer={
        <div style={{ display: 'grid', gap: 14, width: '100%' }}>
          <PriceBatchActions batch={batch} onClose={onClose} height={48} />
          <p style={batchNote}>{copy.footnote}</p>
        </div>
      }
    >
      <div data-testid="price-batch-panel">
        <PriceBatchList batch={batch} size="panel" />
      </div>
    </SidePanel>
  );
};
