'use client'

import { useState } from 'react'
import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'
import { ReportTypeMark } from './ReportTypeMark'

// ── Report type glyphs (15×15) ────────────────────────────────────

const CancelledGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.2" fill="none" />
    <path
      d="M3 3 L7 7 M7 3 L3 7"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="5" cy="5" r="4" stroke={color} strokeWidth="1.2" fill="none" />
    <path
      d="M5 3 L5 5 L6.5 6.5"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SoldOutGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="8"
      height="5"
      rx="1"
      stroke={color}
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3.5 3.5 L6.5 6.5 M6.5 3.5 L3.5 6.5"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const AvailableGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 10 10"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2.5"
      width="8"
      height="5"
      rx="1"
      stroke={color}
      strokeWidth="1.2"
      fill="none"
    />
    <path
      d="M3.5 5 L4.5 6 L6.5 4"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const copy = REPORTING_COPY.reportSheet

// ── Report type ───────────────────────────────────────────────────
type ReportType = 'sold-out' | 'cancelled' | 'postponed' | 'available'

// ── Token accessor ────────────────────────────────────────────────
export const reportTokens = (kind: ReportType) => REPORT_TOKENS[kind]

// ── Option data ───────────────────────────────────────────────────
interface ReportOptionData {
  type: ReportType
  title: string
  subtitle: string
}

const OPTION_DATA: Record<ReportType, ReportOptionData> = {
  'sold-out': {
    type: 'sold-out',
    title: copy.options.soldOut.title,
    subtitle: copy.options.soldOut.subtitle,
  },
  postponed: {
    type: 'postponed',
    title: copy.options.postponed.title,
    subtitle: copy.options.postponed.subtitle,
  },
  cancelled: {
    type: 'cancelled',
    title: copy.options.cancelled.title,
    subtitle: copy.options.cancelled.subtitle,
  },
  available: {
    type: 'available',
    title: copy.options.available.title,
    subtitle: copy.options.available.subtitle,
  },
}

// ── ReportOptionRow (internal) ────────────────────────────────────
interface ReportOptionRowProps {
  option: ReportOptionData
  isSelected: boolean
  onSelect: (type: ReportType) => void
}

const ReportOptionRow = ({
  option,
  isSelected,
  onSelect,
}: ReportOptionRowProps) => {
  const tokens = reportTokens(option.type)

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onClick={() => onSelect(option.type)}
      onKeyDown={(evt) => {
        if (evt.key === 'Enter' || evt.key === ' ') {
          evt.preventDefault()
          onSelect(option.type)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 14px',
        borderRadius: '10px',
        border: isSelected
          ? `1.5px solid ${tokens.color}`
          : '1px solid var(--border)',
        background: isSelected ? tokens.bg : 'var(--surface-1)',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background 0.12s',
      }}
    >
      {/* Icon container */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: tokens.bgStrong,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        {option.type === 'cancelled' && (
          <CancelledGlyph15 color={tokens.color} />
        )}
        {option.type === 'postponed' && (
          <PostponedGlyph15 color={tokens.color} />
        )}
        {option.type === 'sold-out' && <SoldOutGlyph15 color={tokens.color} />}
        {option.type === 'available' && (
          <AvailableGlyph15 color={tokens.color} />
        )}
      </div>

      {/* Text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flex: 1,
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
            color: 'var(--fg)',
            lineHeight: 1.3,
          }}
        >
          {option.title}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            fontSize: '12.5px',
            color: 'var(--fg-muted)',
            lineHeight: 1.4,
          }}
        >
          {option.subtitle}
        </span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────
export interface ReportSheetProps {
  open: boolean
  onClose: () => void
  liveStatus: null | 'sold-out' | 'cancelled' | 'postponed'
  eventDate: string
  onSelect: (reportType: ReportType) => void
}

// ── Derive visible options from liveStatus ────────────────────────
const getVisibleOptions = (
  liveStatus: ReportSheetProps['liveStatus'],
): ReportType[] => {
  if (liveStatus === null) return ['sold-out', 'postponed', 'cancelled']
  if (liveStatus === 'sold-out') return ['available', 'postponed', 'cancelled']
  if (liveStatus === 'postponed') return ['available', 'cancelled']
  if (liveStatus === 'cancelled') return ['available']
  return ['sold-out', 'postponed', 'cancelled']
}

// ── Main component ────────────────────────────────────────────────
export const ReportSheet = ({
  open,
  onClose,
  liveStatus,
  eventDate: _eventDate,
  onSelect,
}: ReportSheetProps) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null)

  if (!open) return null

  const visibleOptions = getVisibleOptions(liveStatus)
  const sheetHeight = visibleOptions.length === 1 ? '600px' : '760px'

  const handleContinue = () => {
    if (selectedType !== null) {
      onSelect(selectedType)
    }
  }

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden"
        style={{
          maxWidth: '393px',
          margin: '0 auto',
          borderRadius: '18px 18px 0 0',
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          maxHeight: sheetHeight,
        }}
      >
        {/* Drag handle */}
        <div
          style={{ position: 'relative', height: '20px', flexShrink: 0 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '36px',
              height: '4px',
              borderRadius: '999px',
              background: 'var(--border-strong)',
            }}
          />
        </div>

        {/* Eyebrow / cancel row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px 0',
          }}
        >
          <span
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {copy.eyebrow}
          </span>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '9px',
              color: 'var(--fg-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'none',
              border: 'none',
              padding: '4px 0',
              cursor: 'pointer',
            }}
          >
            {copy.cancelButton}
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Heading */}
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: '24px',
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {copy.heading}
          </h2>

          {/* Currently live section */}
          {liveStatus !== null && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '14px',
              }}
            >
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '9px',
                  color: 'var(--fg-subtle)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {copy.currentlyShowingAs}
              </span>
              <ReportTypeMark kind={liveStatus} />
            </div>
          )}

          {/* Report options */}
          <div
            role="radiogroup"
            aria-label="Report type"
            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {visibleOptions.map((optionType) => (
              <ReportOptionRow
                key={optionType}
                option={OPTION_DATA[optionType]}
                isSelected={selectedType === optionType}
                onSelect={setSelectedType}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px 28px',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleContinue}
            disabled={selectedType === null}
            style={{
              background: 'var(--signal)',
              height: '48px',
              borderRadius: '10px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: '14.5px',
              color: 'var(--fg-on-accent)',
              border: 'none',
              cursor: selectedType !== null ? 'pointer' : 'not-allowed',
              opacity: selectedType !== null ? 1 : 0.45,
              width: '100%',
              transition: 'opacity 0.12s',
            }}
          >
            {copy.continueButton}
          </button>
        </div>
      </div>
    </>
  )
}
