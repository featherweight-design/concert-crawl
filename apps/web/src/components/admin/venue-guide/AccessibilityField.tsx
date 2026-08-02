'use client'

import { deriveChipState } from '@concert-crawl/types'
import { ADMIN_COPY } from '../definitions/copy'
import { ChipStateDot } from './ChipStateDot'
import { GuideIcon } from './GuideIcon'

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

interface AccessibilityFieldProps {
  value: string
  onChange: (next: string) => void
  placeholderMode: boolean
  onTogglePlaceholder: () => void
  error: boolean
}

const FIELD_ID = 'venue-guide-accessibility'
const HELP_ID = 'venue-guide-accessibility-help'

export const AccessibilityField = ({
  value,
  onChange,
  placeholderMode,
  onTogglePlaceholder,
  error,
}: AccessibilityFieldProps) => {
  const state = deriveChipState({ body: value, isPlaceholder: placeholderMode })

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 10,
        background: 'var(--surface-1)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'var(--font-sans)',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--fg)',
          }}
        >
          <span style={{ color: 'var(--fg-muted)', display: 'flex' }}>
            <GuideIcon name="accessibility" />
          </span>
          <label htmlFor={FIELD_ID}>{GUIDE_COPY.accessibility.label}</label>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--signal)',
            }}
          >
            {GUIDE_COPY.accessibility.requiredTag}
          </span>
        </span>
        <ChipStateDot state={state} />
      </div>

      {placeholderMode ? (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--bg-elevated)',
            border: '1px dashed var(--border-strong)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12.5,
            color: 'var(--fg-muted)',
            lineHeight: 1.5,
          }}
        >
          {GUIDE_COPY.accessibility.previewIntro}
          <span
            style={{
              display: 'block',
              marginTop: 4,
              color: 'var(--fg)',
              fontStyle: 'italic',
            }}
          >
            “{GUIDE_COPY.accessibility.previewBody}”
          </span>
        </div>
      ) : (
        <textarea
          id={FIELD_ID}
          value={value}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          placeholder={GUIDE_COPY.accessibility.placeholder}
          aria-invalid={error}
          aria-describedby={HELP_ID}
          style={{
            boxSizing: 'border-box',
            display: 'block',
            width: '100%',
            padding: '9px 12px',
            borderRadius: 8,
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
            background: 'var(--bg-elevated)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--fg)',
            lineHeight: 1.5,
            resize: 'vertical',
          }}
        />
      )}

      <div
        style={{
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <span
          id={HELP_ID}
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11.5,
            lineHeight: 1.45,
            color: error ? 'var(--danger)' : 'var(--fg-muted)',
            flex: '1 1 200px',
          }}
        >
          {error
            ? GUIDE_COPY.accessibility.error
            : GUIDE_COPY.accessibility.help}
        </span>

        <button
          type="button"
          onClick={onTogglePlaceholder}
          role="switch"
          aria-checked={placeholderMode}
          style={{
            all: 'unset',
            cursor: 'pointer',
            boxSizing: 'border-box',
            flexShrink: 0,
            // 44px floor — the handoff drew a 15px-tall switch (§C.1).
            minHeight: 44,
            padding: '0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--font-sans)',
            fontSize: 11.5,
            fontWeight: 600,
            color: placeholderMode ? 'var(--warning)' : 'var(--fg-muted)',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 26,
              height: 15,
              borderRadius: 999,
              position: 'relative',
              flexShrink: 0,
              background: placeholderMode
                ? 'var(--warning)'
                : 'var(--surface-3)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: placeholderMode ? 13 : 2,
                width: 11,
                height: 11,
                borderRadius: 999,
                background: 'var(--bg-elevated)',
              }}
            />
          </span>
          {GUIDE_COPY.accessibility.toggleLabel}
        </button>
      </div>
    </div>
  )
}
