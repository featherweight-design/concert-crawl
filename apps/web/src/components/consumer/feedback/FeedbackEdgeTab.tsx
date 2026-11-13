'use client';

import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

export function FeedbackEdgeTab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The fixed anchor is a wrapper so positioning and the focus ring can
          be classes: the button's `all: unset` would beat any class on the
          button itself. It sits flush at every width, as drawn. Under 1280 it
          used to be half tucked behind the screen edge and slide out on focus
          or press, but focus returned to it when the modal closed, so the tab
          read as clipped until its first tap and whole ever after. */}
      <div
        data-testid="feedback-edge-tab-anchor"
        className="fixed right-0 top-[70%] z-[35] rounded-l-[10px] [&:has(:focus-visible)]:outline [&:has(:focus-visible)]:outline-2 [&:has(:focus-visible)]:outline-offset-2 [&:has(:focus-visible)]:outline-[var(--signal)]"
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
          {/* No transparent hit slop: a slop would steal taps meant for
              content near the edge (the same class of bug as the venues
              click-through). The tab itself is the whole target. */}
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
