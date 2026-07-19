'use client'

import { BottomSheet } from './BottomSheet'
import { INSTALL_COPY } from './definitions/copy'

interface IosHowToSheetProps {
  open: boolean
  onClose: () => void
}

const StepIcon = ({ icon }: { icon: string }) => {
  // Simple inline icons — Share (square + up arrow), Plus (rounded), Home (square).
  // aria-hidden because the adjacent step label + detail carry the meaning.
  if (icon === 'share') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 3v9M10 3l-3 3M10 3l3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 10v6a1 1 0 001 1h8a1 1 0 001-1v-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (icon === 'plus') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2.5"
          y="2.5"
          width="15"
          height="15"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10 6v8M6 10h8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8l7-5 7 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const IosHowToSheet = ({ open, onClose }: IosHowToSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title={INSTALL_COPY.sheet.title}>
    <div className="flex flex-col gap-4">
      <span
        className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {INSTALL_COPY.sheet.eyebrow}
      </span>
      <h3 className="text-lg font-extrabold text-fg">
        {INSTALL_COPY.sheet.title}
      </h3>
      <p className="text-sm text-fg-muted">{INSTALL_COPY.sheet.sub}</p>
      <ol className="flex flex-col gap-3">
        {INSTALL_COPY.sheet.steps.map((step) => (
          <li key={step.num} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-fg">
              <StepIcon icon={step.icon} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-fg">
                <span className="mr-1 text-fg-subtle">{step.num}.</span>
                {step.label}
              </span>
              <span className="text-xs text-fg-muted">{step.detail}</span>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-fg-on-accent"
      >
        {INSTALL_COPY.sheet.done}
      </button>
      <p className="text-xs text-fg-subtle">{INSTALL_COPY.dismissNote}</p>
    </div>
  </BottomSheet>
)
