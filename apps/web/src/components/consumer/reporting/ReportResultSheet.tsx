'use client';

import type { ReactNode } from 'react';

import { ModalShell } from '@/components/consumer/modal-shell/ModalShell';

import { REPORT_TOKENS } from './reportTokens';

const AMBER = REPORT_TOKENS.postponed;

const MONO = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

export interface ReportResultSheetProps {
  open: boolean;
  onClose: () => void;
  /** The mono label after the dot, e.g. `GOT IT · SENT`. */
  rail: string;
  /** The amber code at the rail's right end, e.g. `SENT`. */
  code: string;
  title: string;
  body: string;
  closeLabel: string;
  /** Anything between the body and the buttons (a recap stub). */
  children?: ReactNode;
  /** The buttons, stacked. Use `ResultPrimaryButton` and `ResultOutlineButton`. */
  actions: ReactNode;
}

/**
 * The result sheet the price and status flows share: a rail with a coloured
 * dot and a code, a big title, a body, then stacked buttons. The wrong-artist
 * report uses it for sent, already reported and didn't go through.
 */
export const ReportResultSheet = ({
  open,
  onClose,
  rail,
  code,
  title,
  body,
  closeLabel,
  children,
  actions,
}: ReportResultSheetProps) => (
  <ModalShell
    open={open}
    onClose={onClose}
    ariaLabel={title}
    sheetHeight="short"
    header={
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: AMBER.color,
              flexShrink: 0,
            }}
          />
          <span style={{ ...MONO, color: 'var(--fg-subtle)' }}>{rail}</span>
          <span
            aria-hidden="true"
            style={{ flex: 1, height: 1, background: 'var(--border)' }}
          />
          <span style={{ ...MONO, color: AMBER.color, fontWeight: 700 }}>
            {code}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: '1px solid var(--border-strong)',
              background: 'none',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <h2
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: '-0.03em',
            color: 'var(--fg)',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </>
    }
    footer={
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions}
      </div>
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
          margin: 0,
        }}
      >
        {body}
      </p>
      {children}
    </div>
  </ModalShell>
);

const BUTTON_BASE = {
  height: 48,
  width: '100%',
  borderRadius: 10,
  fontFamily: 'Inter, sans-serif',
  fontSize: 14.5,
} as const;

export const ResultPrimaryButton = ({
  onClick,
  disabled = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      ...BUTTON_BASE,
      fontWeight: 800,
      border: 'none',
      color: 'var(--fg-on-accent)',
      background: 'linear-gradient(90deg, var(--signal), var(--accent))',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
    }}
  >
    {children}
  </button>
);

export const ResultOutlineButton = ({
  onClick,
  disabled = false,
  amber = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  /** The destructive-ish choice (Withdraw) carries the report amber. */
  amber?: boolean;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      ...BUTTON_BASE,
      fontWeight: 700,
      background: 'none',
      border: '1px solid var(--border-strong)',
      color: amber ? AMBER.color : 'var(--fg)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
    }}
  >
    {children}
  </button>
);
