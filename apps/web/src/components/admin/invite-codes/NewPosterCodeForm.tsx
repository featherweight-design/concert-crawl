'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mintInviteCodeWithOptions } from '@/app/(protected)/admin/invite-codes/actions';
import { parseSeats } from './InviteCreatorPanel';

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
 * back so the tab selects it.
 */
export function NewPosterCodeForm({
  onCancel,
  onMinted,
}: {
  onCancel: () => void;
  onMinted: (id: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [preset, setPreset] = useState<string>('50');
  const [other, setOther] = useState('');
  const [expiresIn, setExpiresIn] = useState<Expiry>('never');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const seats = parseSeats(preset === 'other' ? other : preset);

  const submit = (evt: FormEvent) => {
    evt.preventDefault();
    if (seats === null) return;
    setError(null);
    startTransition(async () => {
      const res = await mintInviteCodeWithOptions({
        expiresIn,
        label,
        maxUses: seats,
      });
      if (res.ok && res.id) onMinted(res.id);
      else setError(res.error ?? null);
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
            aria-invalid={seats === null}
            value={other}
            onChange={(evt) => setOther(evt.target.value)}
          />
        ) : null}
        <small data-invalid={seats === null}>{copy.seatsHint}</small>
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
      {error ? (
        <p role="alert" className="pt-error">
          {error}
        </p>
      ) : null}
      <div className="pt-form-act">
        <button type="button" className="pt-ghost" onClick={onCancel}>
          {copy.cancel}
        </button>
        <button
          type="submit"
          className="pt-solid"
          disabled={seats === null || isPending}
        >
          {isPending ? copy.pending : copy.submit}
        </button>
      </div>
    </form>
  );
}
