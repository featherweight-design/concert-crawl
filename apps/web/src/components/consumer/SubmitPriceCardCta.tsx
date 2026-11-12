'use client';

import { useState } from 'react';
import { SubmitPriceModal } from '@/components/consumer/submit-price';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

const copy = CONSUMER_COPY;

interface SubmitPriceCardCtaProps {
  eventId: string;
  artist: string;
  venueName: string;
  date: string;
}

// Presentational-only version: renders the dashed "submit another price" card
// and delegates the click. Pending branches that already mount a state-wired
// SubmitPriceModal use this so the CTA routes into that shared modal (keeping
// localSubmissions/MTAddTierSuccess in sync) instead of spawning a second one.
export function SubmitPriceCardButton({
  onClick,
  signedOut = false,
}: {
  onClick: () => void;
  /**
   * Announces the sign-up gate to assistive tech without drawing it (#1247).
   * The card is unchanged visually and still opens on tap; SubmitPriceModal
   * swaps itself for the tier picker once it is open.
   */
  signedOut?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...(signedOut
        ? { 'aria-label': copy.submitPriceCardCta.ariaSignedOut }
        : {})}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-1"
      style={{
        appearance: 'none',
        background: 'none',
        font: 'inherit',
        textAlign: 'left',
        margin: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        // more-p-price_states, measured: a 74px dashed card, radius 12,
        // 11px / 16px inside, the copy column wrapping before the CTA.
        gap: 16,
        padding: '11px 16px',
        borderRadius: 12,
        border: '1px dashed var(--border-strong)',
        color: 'var(--fg-muted)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          data-testid="submit-another-heading"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: 14,
            lineHeight: 1.25,
            color: 'var(--fg)',
          }}
        >
          {copy.submitPriceCardCta.heading}
        </span>
        <span
          data-testid="submit-another-body"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            lineHeight: '16px',
            color: 'var(--fg-muted)',
          }}
        >
          {copy.submitPriceCardCta.subheading}
        </span>
      </div>
      <span
        data-testid="submit-another-cta"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          color: 'var(--signal)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {copy.submitPriceCardCta.ctaLabel}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path
            d="M3 2l4 3-4 3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}

// Self-contained version: the button plus its own SubmitPriceModal. Used in
// contexts (e.g. the no-price state) where no other SubmitPriceModal is mounted
// and a reload picks up the new price.
export function SubmitPriceCardCta({
  eventId,
  artist,
  venueName,
  date,
}: SubmitPriceCardCtaProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <SubmitPriceCardButton onClick={() => setIsOpen(true)} />

      <SubmitPriceModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        eventId={eventId}
        artist={artist}
        venueName={venueName}
        date={date}
      />
    </>
  );
}
