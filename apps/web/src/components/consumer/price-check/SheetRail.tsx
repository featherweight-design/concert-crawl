import { CCMark } from '@/components/brand/cc-mark';

/**
 * The B+ sheet rail (`08-prices-and-status/more-st-counter_m`): a status dot
 * and label on the left, a hairline, and a short status code on the right in
 * the status's own color (rule 3). The dot holds still, so nothing here needs
 * a reduced-motion guard.
 *
 * Passing `onClose` draws the board's full rail: the brand tile on the left
 * and a close button on the right. Without it the rail is the bare status
 * line, so a sheet that owns its own chrome keeps it.
 */

export type SheetRailTone = 'warning' | 'signal' | 'danger';

const TONE_VAR: Record<SheetRailTone, string> = {
  warning: 'var(--warning)',
  signal: 'var(--signal)',
  danger: 'var(--danger)',
};

type SheetRailProps = {
  label: string;
  code: string;
  tone: SheetRailTone;
} & (
  | { onClose?: undefined; closeLabel?: undefined }
  | { onClose: () => void; closeLabel: string }
);

const CloseGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 2l8 8M10 2l-8 8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

export const SheetRail = ({
  label,
  code,
  tone,
  onClose,
  closeLabel,
}: SheetRailProps) => {
  const color = TONE_VAR[tone];
  return (
    <div
      data-testid="sheet-rail"
      data-tone={tone}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
      {onClose !== undefined && (
        <span
          data-testid="sheet-rail-tile"
          style={{ display: 'inline-flex', flexShrink: 0 }}
        >
          <CCMark size={22} />
        </span>
      )}
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 10,
          flexShrink: 0,
          background: color,
          boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 22%, transparent)`,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--fg-muted)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <span
        aria-hidden
        style={{ flex: 1, height: 1, background: 'var(--border)' }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          color,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {code}
      </span>
      {onClose !== undefined && (
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border)',
          }}
        >
          <CloseGlyph />
        </button>
      )}
    </div>
  );
};
