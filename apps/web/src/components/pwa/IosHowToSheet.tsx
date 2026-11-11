'use client';

import { BottomSheet } from './BottomSheet';
import { CCMark } from '@/components/brand/cc-mark';
import { INSTALL_COPY } from './definitions/copy';
import {
  EYEBROW_STYLE,
  PWA_GRADIENT,
  SHEET_PRIMARY_CLASS,
} from './definitions/styles';

interface IosHowToSheetProps {
  open: boolean;
  onClose: () => void;
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
    );
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
    );
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
  );
};

const StepTile = ({ icon, num }: { icon: string; num: string }) => (
  <div className="relative mt-1 shrink-0">
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl border text-signal"
      style={{
        borderColor: 'color-mix(in oklab, var(--signal) 45%, transparent)',
        background: 'color-mix(in oklab, var(--signal) 8%, var(--surface-1))',
      }}
    >
      {icon === 'home' ? <CCMark size={26} /> : <StepIcon icon={icon} />}
    </div>
    <span
      aria-hidden="true"
      className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-extrabold text-fg-on-accent"
      style={{ background: PWA_GRADIENT }}
    >
      {num}
    </span>
  </div>
);

export const IosHowToSheet = ({ open, onClose }: IosHowToSheetProps) => (
  <BottomSheet open={open} onClose={onClose} title={INSTALL_COPY.sheet.title}>
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl bg-bg shadow-lg">
          <CCMark size={40} />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-signal" style={EYEBROW_STYLE}>
            {INSTALL_COPY.sheet.eyebrow}
          </span>
          <h3 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
            {INSTALL_COPY.sheet.title}
          </h3>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-fg-muted">
        {INSTALL_COPY.sheet.sub}
      </p>
      <ol className="flex flex-col gap-3">
        {INSTALL_COPY.sheet.steps.map((step) => (
          <li
            key={step.num}
            className="flex items-start gap-4 rounded-2xl border border-border bg-surface-2 p-4"
          >
            <StepTile icon={step.icon} num={step.num} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[16px] font-bold text-fg">
                <span className="sr-only">{step.num}. </span>
                {step.label}
              </span>
              <span className="text-[14px] leading-snug text-fg-muted">
                {step.detail}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onClose}
        className={`mt-1 ${SHEET_PRIMARY_CLASS}`}
        style={{ background: PWA_GRADIENT }}
      >
        {INSTALL_COPY.sheet.done}
      </button>
    </div>
  </BottomSheet>
);
