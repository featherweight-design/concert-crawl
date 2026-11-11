'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mintInviteCodeWithOptions } from '@/app/(protected)/admin/invite-codes/actions';
import { POSTER_MIN_SEATS, parseSeats } from '@/lib/poster/poster-rule';

const copy = ADMIN_COPY.inviteCodes.poster.form;
const PRESETS = ['25', '50', '100'] as const;
const EXPIRIES = [
  { key: 'never', label: copy.never },
  { key: '30d', label: copy.days30 },
  { key: '90d', label: copy.days90 },
] as const;
type Expiry = (typeof EXPIRIES)[number]['key'];

/**
 * The Posters tab's inline mint: where it's going, seats and expiry. Mints
 * through the audited `mintInviteCodeWithOptions` and hands the new code's id
 * back so the tab selects it once the revalidated list brings it in. After a
 * mint the form stays shut: a second press would mint a second code.
 */
export function NewPosterCodeForm({
  onCancel,
  onMinted,
  onBusyChange,
  notice,
}: {
  onCancel: () => void;
  onMinted: (id: string) => void;
  /** Told when a mint starts and when it (and its revalidation) settles. */
  onBusyChange: (busy: boolean) => void;
  /** The tab's word on a mint that never showed up in the list. */
  notice: string | null;
}) {
  const [label, setLabel] = useState('');
  const [preset, setPreset] = useState<string>('50');
  const [other, setOther] = useState('');
  const [otherTouched, setOtherTouched] = useState(false);
  const [minted, setMinted] = useState(false);
  const [expiresIn, setExpiresIn] = useState<Expiry>('never');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const seats = parseSeats(
    preset === 'other' ? other : preset,
    POSTER_MIN_SEATS,
  );
  const showInvalid = seats === null && (otherTouched || other !== '');

  useEffect(() => onBusyChange(isPending), [isPending, onBusyChange]);

  const submit = (evt: FormEvent) => {
    evt.preventDefault();
    if (seats === null || minted) return;
    setError(null);
    startTransition(async () => {
      const res = await mintInviteCodeWithOptions({
        expiresIn,
        label,
        maxUses: seats,
      });
      if (res.ok) {
        setMinted(true);
        if (res.id) onMinted(res.id);
        else setError(copy.mintedNoId);
      } else setError(res.error ?? copy.mintFailed);
    });
  };

  return (
    <form className="pt-form" onSubmit={submit} data-testid="new-poster-code">
      <p className="pt-form-h">{ADMIN_COPY.inviteCodes.poster.newCode}</p>
      <label className="pt-field">
        <span>{copy.label}</span>
        <input
          value={label}
          maxLength={120}
          onChange={(evt) => setLabel(evt.target.value)}
        />
        <small>{copy.labelHint}</small>
      </label>
      <fieldset className="pt-field">
        <legend>{copy.seats}</legend>
        <div className="pt-seg">
          {[...PRESETS, 'other'].map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="poster-seats"
                checked={preset === key}
                onChange={() => setPreset(key)}
              />
              {key === 'other' ? copy.seatsOther : key}
            </label>
          ))}
        </div>
        {preset === 'other' ? (
          <input
            inputMode="numeric"
            aria-label={copy.seats}
            aria-invalid={showInvalid}
            value={other}
            onBlur={() => setOtherTouched(true)}
            onChange={(evt) => setOther(evt.target.value)}
          />
        ) : null}
        <small data-invalid={showInvalid}>{copy.seatsHint}</small>
      </fieldset>
      <fieldset className="pt-field">
        <legend>{copy.expires}</legend>
        <div className="pt-seg">
          {EXPIRIES.map((option) => (
            <label key={option.key}>
              <input
                type="radio"
                name="poster-expiry"
                checked={expiresIn === option.key}
                onChange={() => setExpiresIn(option.key)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      {error || notice ? (
        <p role="alert" className="pt-error">
          {error ?? notice}
        </p>
      ) : null}
      <div className="pt-form-act">
        <button
          type="button"
          className="pt-ghost"
          disabled={isPending}
          onClick={onCancel}
        >
          {copy.cancel}
        </button>
        <button
          type="submit"
          className="pt-solid"
          disabled={seats === null || isPending || minted}
        >
          {isPending ? copy.pending : copy.submit}
        </button>
      </div>
    </form>
  );
}
