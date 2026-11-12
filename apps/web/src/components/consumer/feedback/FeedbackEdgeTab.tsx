'use client';

import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

export function FeedbackEdgeTab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The fixed anchor is a wrapper so the phone inset can be a class: the
          button's `all: unset` would beat any class on the button itself.
          Under 1280 the tab is half tucked behind the screen edge so it stops
          covering page text (venue titles, artist rows at 390), and slides out
          on focus or press. From 1280 up it sits flush as drawn. */}
      <div
        data-testid="feedback-edge-tab-anchor"
        className="fixed right-0 top-[70%] z-[35] transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] max-xl:translate-x-3 max-xl:focus-within:translate-x-0 max-xl:active:translate-x-0 rounded-l-[10px] [&:has(:focus-visible)]:outline [&:has(:focus-visible)]:outline-2 [&:has(:focus-visible)]:outline-offset-2 [&:has(:focus-visible)]:outline-[var(--signal)]"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={CONSUMER_COPY.feedback.edgeTab.ariaLabel}
          style={{
            all: 'unset',
            cursor: 'pointer',
            position: 'relative',
            // Under every sheet and its scrim: the filter and verify sheets sit
            // at 40/50 and ModalShell at 90/100, and at 80 the tab drew over the
            // first two (the anchor carries zIndex 35). Over page content, which
            // is the board's (it overlaps the content edge by design,
            // bp-s-feedback_tab_m).
            padding: '12px 6px',
            background: 'var(--surface-1)',
            border: '1px solid var(--border-strong)',
            borderRight: 'none',
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            color: 'var(--fg)',
          }}
        >
          {/* Transparent hit slop to the left of the tab. Tucked, only ~13px
              of the tab shows, so this widens the tap target to 25px. It sits
              inside the button, so it triggers the same click. */}
          <span
            aria-hidden="true"
            data-testid="feedback-edge-tab-hit-slop"
            className="absolute -left-3 top-0 hidden h-full w-3 max-xl:block"
          />
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 6,
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--fg)',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            {CONSUMER_COPY.feedback.edgeTab.label}
          </span>
        </button>
      </div>

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
