'use client'

import { useState } from 'react'
import { FeedbackModal } from './FeedbackModal'

export function FeedbackPill() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-[72px] right-4 sm:bottom-6 z-[80]"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          height: 36,
          borderRadius: 999,
          background: 'var(--accent)',
          color: 'var(--fg-on-accent)',
          border: '1.5px solid var(--border-strong)',
          boxShadow: '0 8px 24px -8px var(--accent)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 800,
          fontSize: 12.5,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg-on-accent)',
            opacity: 0.75,
          }}
        >
          BETA
        </span>
        Feedback
      </button>

      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
