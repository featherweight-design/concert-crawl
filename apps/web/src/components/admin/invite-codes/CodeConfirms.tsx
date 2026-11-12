'use client';

import { useState } from 'react';
import type { AdminInviteCode } from '@concert-crawl/types';
import type { ListedInviteCode } from './codes-api';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ConfirmDialog } from '@/components/admin/primitives';
import { seatsTaken } from '@/lib/poster/poster-rule';
import {
  expiresAtFor,
  hasFutureExpiry,
  initialExpiry,
  shortDate,
  type ExpiryChoice,
} from './code-rules';
import { ExpiryPills } from './CodeFormParts';

const COPY = ADMIN_COPY.codesPage;

/** `07/revoke-asks-first`. */
export const RevokeConfirm = ({
  code,
  pending,
  onConfirm,
  onCancel,
}: {
  // Revoke applies to every kind, so it takes a list row as it is.
  code: ListedInviteCode;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <ConfirmDialog
    tone="danger"
    confirmVariant="dangerOutline"
    buttonSize="large"
    title={COPY.revoke.title(code.code)}
    body={COPY.revoke.body(code.code, seatsTaken(code))}
    confirmLabel={COPY.revoke.confirm}
    cancelLabel={COPY.revoke.keep}
    pending={pending}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);

/**
 * `07/reactivate-a-code`, without "because…" (no reason is stored). Keeps the
 * old expiry when it's still ahead (A3 5b row 13).
 */
export const ReactivateConfirm = ({
  code,
  now,
  pending,
  onConfirm,
  onCancel,
}: {
  code: AdminInviteCode;
  now: Date;
  pending: boolean;
  onConfirm: (expiresAt: string | null | undefined) => void;
  onCancel: () => void;
}) => {
  const [expiry, setExpiry] = useState<ExpiryChoice>(
    initialExpiry(code.expiresAt, now, 'd7'),
  );
  return (
    <ConfirmDialog
      title={COPY.reactivate.title(code.code)}
      body={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span>
            {COPY.reactivate.body(code.code, code.maxUses, seatsTaken(code))}
          </span>
          <ExpiryPills
            value={expiry}
            onChange={setExpiry}
            keepDate={
              hasFutureExpiry(code.expiresAt, now) && code.expiresAt
                ? shortDate(code.expiresAt)
                : null
            }
          />
        </div>
      }
      confirmLabel={COPY.reactivate.confirm}
      confirmVariant="gradient"
      buttonSize="large"
      cancelLabel={COPY.reactivate.keep}
      pending={pending}
      onConfirm={() => onConfirm(expiresAtFor(expiry, new Date()))}
      onCancel={onCancel}
    />
  );
};
