'use client';

import { useState, useTransition } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mintInviteCodeWithOptions } from '@/app/(protected)/admin/invite-codes/actions';

type ExpiresIn = '7d' | '30d' | 'never';

/** Seats a labelled (poster) code starts with. */
const POSTER_SEATS = 50;
/** The API's cap on seats per code. */
const MAX_SEATS = 500;

/**
 * The typed seat count, or null when the API would refuse it. Never clamped:
 * a silently rewritten count mints a code the admin did not ask for.
 */
export const parseSeats = (typed: string): number | null => {
  if (!/^\d+$/.test(typed.trim())) return null;
  const seats = Number(typed.trim());
  return seats >= 1 && seats <= MAX_SEATS ? seats : null;
};

const FIELD_STYLE = {
  height: 32,
  padding: '0 10px',
  borderRadius: 6,
  fontSize: 16,
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--fg)',
} as const;

// #1085 — default the expiry to "never" rather than 30d. Beta invite
// codes have been long-lived in practice, and a 30-day auto-expiry
// silently rots the batches Hugh sends to prospects; "never" matches
// how admins actually use the mint form.
export function InviteCreatorPanel() {
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('never');
  const [label, setLabel] = useState('');
  // A labelled code is a poster code, so the seats follow the label (50, as
  // the plan defaults) until the admin sets them by hand.
  // Held as typed, so the field can be cleared on the way to a new number;
  // clamped only when the code is minted.
  const [seats, setSeats] = useState('1');
  const [seatsTouched, setSeatsTouched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    code?: string;
    error?: string;
    /** The seats the code was minted with, after clamping. */
    seats?: number;
  } | null>(null);

  const seatsInvalid = parseSeats(seats) === null;

  function handleMint() {
    setResult(null);
    startTransition(async () => {
      const maxUses = parseSeats(seats);
      if (maxUses === null) return;
      const res = await mintInviteCodeWithOptions({
        expiresIn,
        label,
        maxUses,
      });
      setResult(res.ok ? { ...res, seats: maxUses } : res);
      // A fresh form after a mint, so pressing Mint again makes a personal
      // code rather than a second copy of the poster code just made.
      if (res.ok) {
        setLabel('');
        setSeats('1');
        setSeatsTouched(false);
      }
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', gap: 4 }}>
        {(['7d', '30d', 'never'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setExpiresIn(opt)}
            style={{
              height: 32,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border:
                expiresIn === opt
                  ? '2px solid var(--signal)'
                  : '1px solid var(--border)',
              background:
                expiresIn === opt ? 'rgba(29,95,191,0.08)' : 'transparent',
              color: expiresIn === opt ? 'var(--signal)' : 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={label}
        maxLength={120}
        placeholder={ADMIN_COPY.inviteCodes.labelPlaceholder}
        aria-label={ADMIN_COPY.inviteCodes.labelPlaceholder}
        onChange={(event) => {
          setLabel(event.target.value);
          if (!seatsTouched)
            setSeats(event.target.value.trim() ? String(POSTER_SEATS) : '1');
        }}
        style={{ ...FIELD_STYLE, flex: '1 1 220px', minWidth: 0 }}
      />
      <label
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
      >
        {ADMIN_COPY.inviteCodes.seatsLabel}
        <input
          type="number"
          min={1}
          max={MAX_SEATS}
          value={seats}
          onChange={(event) => {
            setSeatsTouched(true);
            setSeats(event.target.value);
          }}
          aria-invalid={seatsInvalid}
          aria-describedby="invite-seats-hint"
          style={{ ...FIELD_STYLE, width: 72 }}
        />
      </label>
      <small
        id="invite-seats-hint"
        style={{
          flexBasis: '100%',
          fontSize: 11,
          color: seatsInvalid ? 'var(--danger)' : 'var(--fg-muted)',
        }}
      >
        {ADMIN_COPY.inviteCodes.seatsHint}
      </small>
      <button
        type="button"
        onClick={handleMint}
        disabled={isPending || seatsInvalid}
        style={{
          height: 32,
          padding: '0 16px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 500,
          border: 'none',
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending
          ? ADMIN_COPY.inviteCodes.mintButton.pending
          : ADMIN_COPY.inviteCodes.mintButton.idle}
      </button>
      {result?.ok === true && result.code !== undefined && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--success)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '3px 8px',
            background: 'rgba(47,122,77,0.08)',
            borderRadius: 6,
          }}
        >
          &#10003; {result.code}
          {result.seats !== undefined
            ? ` · ${ADMIN_COPY.inviteCodes.seatsMinted(result.seats)}`
            : null}
        </span>
      )}
      {result?.ok === false && result.error !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--danger)' }}>
          {result.error}
        </span>
      )}
    </div>
  );
}
