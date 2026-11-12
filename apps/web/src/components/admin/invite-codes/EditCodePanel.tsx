'use client';

import { useEffect, useRef, useState } from 'react';
import type { AdminInviteCode } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, useIsPhone } from '@/components/admin/primitives';
import { seatsTaken } from '@/lib/poster/poster-rule';
import type { CodeEdit } from './codes-api';
import {
  expiresAtFor,
  hasFutureExpiry,
  initialExpiry,
  seatsFloorError,
  seatsFrom,
  shortDate,
  type ExpiryChoice,
} from './code-rules';
import {
  ExpiryPills,
  Field,
  INPUT,
  SeatsField,
  type SeatsChoice,
} from './CodeFormParts';
import { CodeSurface, CodeTitle } from './CodeSurface';

const COPY = ADMIN_COPY.codesPage.form;
const PRESETS = [25, 50, 100] as const;

const startingSeats = (maxUses: number): SeatsChoice =>
  PRESETS.some((seats) => seats === maxUses) ? `${maxUses}` : 'other';

/**
 * `07/edit-an-invite-code`: label, seats and expiry. The code never changes.
 * Add seats opens this with Seats in focus (A3 5b row 7).
 */
export const EditCodePanel = ({
  code,
  now,
  focusSeats = false,
  onSave,
  onClose,
}: {
  code: AdminInviteCode;
  now: Date;
  focusSeats?: boolean;
  onSave: (edit: CodeEdit) => void;
  onClose: () => void;
}) => {
  const isPhone = useIsPhone();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState(code.label ?? '');
  const [seatsChoice, setSeatsChoice] = useState<SeatsChoice>(
    startingSeats(code.maxUses),
  );
  const [typed, setTyped] = useState(String(code.maxUses));
  const [expiry, setExpiry] = useState<ExpiryChoice>(
    initialExpiry(code.expiresAt, now, 'never'),
  );

  useEffect(() => {
    if (!focusSeats) return;
    bodyRef.current
      ?.querySelector<HTMLElement>(
        `[aria-label="${COPY.seats}"] [aria-checked="true"]`,
      )
      ?.focus();
  }, [focusSeats]);

  const used = seatsTaken(code);
  const seats = seatsFrom(seatsChoice, typed);
  const floor = seatsFloorError(seats, used);
  const canSave = seats != null && floor == null;

  const save = () => {
    if (!canSave) return;
    const edit: CodeEdit = {};
    const nextLabel = label.trim() || null;
    if (nextLabel !== code.label) edit.label = nextLabel;
    if (seats !== code.maxUses) edit.maxUses = seats;
    const expiresAt = expiresAtFor(expiry, now);
    if (expiresAt !== undefined && expiresAt !== code.expiresAt)
      edit.expiresAt = expiresAt;
    if (Object.keys(edit).length === 0) onClose();
    else onSave(edit);
  };

  return (
    <CodeSurface
      title={<CodeTitle code={code.code} />}
      label={code.code}
      subtitle={COPY.editNote}
      onClose={onClose}
      footer={
        <>
          <AdminButton
            type="button"
            disabled={!canSave}
            onClick={save}
            fullWidth={isPhone}
            variant="gradient"
            style={{ height: 40, fontSize: 14, flex: 1 }}
          >
            {COPY.save}
          </AdminButton>
          <AdminButton
            type="button"
            variant="outline"
            onClick={onClose}
            fullWidth={isPhone}
            style={{ height: 40, fontSize: 14 }}
          >
            {COPY.cancel}
          </AdminButton>
        </>
      }
    >
      <div
        ref={bodyRef}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Field label={COPY.label} htmlFor="edit-code-label">
          <input
            id="edit-code-label"
            value={label}
            maxLength={120}
            onChange={(evt) => setLabel(evt.target.value)}
            style={INPUT}
          />
        </Field>
        <SeatsField
          presets={PRESETS}
          choice={seatsChoice}
          typed={typed}
          onChoice={setSeatsChoice}
          onTyped={setTyped}
          hint={COPY.seatsEditHint(used)}
          error={floor}
        />
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
    </CodeSurface>
  );
};
