/**
 * The B+ sheet rail (`08-prices-and-status/more-st-counter_m`): a status dot
 * and label on the left, a hairline, and a short status code on the right in
 * the status's own color (rule 3). The dot holds still, so nothing here needs
 * a reduced-motion guard.
 */

export type SheetRailTone = 'warning' | 'signal' | 'danger';

const TONE_VAR: Record<SheetRailTone, string> = {
  warning: 'var(--warning)',
  signal: 'var(--signal)',
  danger: 'var(--danger)',
};

interface SheetRailProps {
  label: string;
  code: string;
  tone: SheetRailTone;
}

export const SheetRail = ({ label, code, tone }: SheetRailProps) => {
  const color = TONE_VAR[tone];
  return (
    <div
      data-testid="sheet-rail"
      data-tone={tone}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
    >
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
    </div>
  );
};
