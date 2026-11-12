'use client';

import { useState } from 'react';
import { FeedbackModal } from './FeedbackModal';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

export function FeedbackEdgeTab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={CONSUMER_COPY.feedback.edgeTab.ariaLabel}
        style={{
          all: 'unset',
          cursor: 'pointer',
          position: 'fixed',
          right: 0,
          top: '44%',
          // Under every sheet and its scrim: the filter and verify sheets sit
          // at 40/50 and ModalShell at 90/100, and at 80 the tab drew over the
          // first two. Over page content, which is the board's (it overlaps
          // the content edge by design, bp-s-feedback_tab_m).
          zIndex: 35,
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

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
