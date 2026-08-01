'use client'

import { useId, useState } from 'react'
import { REPORTING_COPY } from './definitions/copy'
import { REPORT_TOKENS } from './reportTokens'
import { ReportTypeMark } from './ReportTypeMark'
import { ModalShell } from '@/components/consumer/modal-shell/ModalShell'

// ── Report type glyphs (15×15) ────────────────────────────────────

const CancelledGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 3l6 6M9 3L3 9"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const PostponedGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke={color}
      strokeWidth="1.3"
      fill="none"
    />
    <path
      d="M6 3.5V6l2 1.4"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const SoldOutGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <circle
      cx="6"
      cy="6"
      r="4.5"
      stroke={color}
      strokeWidth="1.4"
      fill="none"
    />
    <path
      d="M3.5 8.5L8.5 3.5"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
)

const AvailableGlyph15 = ({ color }: { color: string }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 5a1.5 1.5 0 010 3v2h8V8a1.5 1.5 0 010-3V3H2v2z"
      stroke={color}
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path
      d="M5 5v3"
      stroke={color}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeDasharray="1.2 1.6"
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
  isPending?: boolean
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
  isPending = false,
  eventDate: _eventDate,
  onSelect,
}: ReportSheetProps) => {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null)
  const hintId = useId()

  const visibleOptions = getVisibleOptions(liveStatus)
  const sheetHeight: 'tall' | 'short' =
    visibleOptions.length === 1 ? 'short' : 'tall'

  const handleContinue = () => {
    if (selectedType !== null) {
      onSelect(selectedType)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      ariaLabel="Report a status change"
      sheetHeight={sheetHeight}
      header={
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
              }}
            >
              {liveStatus !== null ? copy.eyebrowContext : copy.eyebrow}
            </span>
            <button
              onClick={onClose}
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
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
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 900,
              fontSize: 24,
              letterSpacing: '-0.025em',
              color: 'var(--fg)',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {liveStatus !== null ? copy.headingContext : copy.heading}
          </h2>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13.5,
              color: 'var(--fg-muted)',
              lineHeight: 1.5,
              margin: '8px 0 0',
            }}
          >
            {liveStatus !== null
              ? copy.subtitleByStatus[liveStatus]
              : copy.subtitle}
          </p>
        </>
      }
      footer={
        <div className="flex w-full flex-col items-center gap-2">
          <button
            onClick={handleContinue}
            disabled={selectedType === null}
            aria-describedby={selectedType === null ? hintId : undefined}
            style={{
              background: 'var(--signal)',
              height: 48,
              borderRadius: 10,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              fontSize: 14.5,
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
          {selectedType === null && (
            <p
              id={hintId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg-subtle)',
                margin: 0,
              }}
            >
              {copy.continueHint}
            </p>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {liveStatus !== null && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'var(--fg-subtle)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
              }}
            >
              {copy.currentlyLive}
            </span>
            <ReportTypeMark kind={liveStatus} pending={isPending} />
          </div>
        )}
        <div
          role="radiogroup"
          aria-label="Report type"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
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
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'color-mix(in oklab, var(--fg) 5%, transparent)',
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: 'var(--fg-subtle)',
              lineHeight: 1.5,
              letterSpacing: '-0.005em',
            }}
          >
            {copy.footnote}
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
