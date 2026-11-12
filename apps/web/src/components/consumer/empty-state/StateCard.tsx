import { useId, type ReactNode } from 'react';

/**
 * The B+ cyan-to-pink sweep a state card's one action wears, through the
 * violet the two mix to (the same sweep the invite landing's CTA uses).
 */
export const STATE_CTA_GRADIENT =
  'linear-gradient(90deg, var(--signal), color-mix(in oklch, var(--signal), var(--accent)), var(--accent))';

interface StateCardAction {
  label: string;
  onClick: () => void;
}

interface StateCardProps {
  /** `signal` for an empty state, `danger` for a failure. */
  tone?: 'signal' | 'danger';
  /** A 24px line icon. Decorative: the eyebrow and title say what happened. */
  icon: ReactNode;
  eyebrow: string;
  title: string;
  /** Omitted by a card that is only an eyebrow and a title. */
  body?: string | undefined;
  action?: StateCardAction | undefined;
  /**
   * Empty states sit in a dashed card (README "one pattern everywhere"); the
   * error state is drawn bare, so the failure reads as the page, not a slot.
   */
  framed?: boolean;
  role?: 'alert' | 'status' | undefined;
}

const ACTION_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 44,
  marginTop: 6,
  padding: '0 22px',
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  background: STATE_CTA_GRADIENT,
  color: 'var(--fg-on-accent)',
  fontFamily: 'var(--font-ui)',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
  boxShadow:
    '0 8px 24px -8px color-mix(in oklch, var(--signal) 45%, transparent)',
};

/**
 * The B+ empty and error state (`06-states/bp-s-notif_empty_m`,
 * `bp-s-notif_error_m`, `bp-s-empty_search_m`): an icon in a dashed ring (or a
 * tinted tile for a failure), a mono eyebrow, a heavy title, a muted body and
 * one gradient action.
 */
export function StateCard({
  tone = 'signal',
  icon,
  eyebrow,
  title,
  body,
  action,
  framed = true,
  role,
}: StateCardProps) {
  const ink = tone === 'danger' ? 'var(--danger)' : 'var(--signal)';
  // The title is the card's heading, and names the card when it carries a role
  // (an alert would otherwise be read as three unstructured runs of text).
  const titleId = useId();

  return (
    <div
      role={role}
      {...(role === undefined ? {} : { 'aria-labelledby': titleId })}
      data-testid="state-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
        padding: framed ? '34px 22px 30px' : '34px 22px',
        borderRadius: 18,
        border: framed ? '1px dashed var(--border-strong)' : 'none',
        background: framed
          ? 'linear-gradient(180deg, color-mix(in oklch, var(--surface-1) 70%, transparent), transparent)'
          : 'transparent',
        fontFamily: 'var(--font-ui)',
        color: 'var(--fg)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: tone === 'danger' ? 84 : 96,
          height: tone === 'danger' ? 84 : 96,
          marginBottom: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: ink,
          ...(tone === 'danger'
            ? {
                // B19a (`notif-tab-failed-m`): 84px r24 tile, 10% fill, 45%
                // border and a soft 20% glow.
                borderRadius: 24,
                border: `1px solid color-mix(in oklch, ${ink} 45%, transparent)`,
                background: `color-mix(in oklch, ${ink} 10%, transparent)`,
                boxShadow: `0 0 40px color-mix(in oklch, ${ink} 20%, transparent)`,
              }
            : {
                // B19a (`notif-tab-empty-m`): a 1.5px signal-tinted dashed
                // ring over a faint signal radial.
                borderRadius: '50%',
                border: `1.5px dashed color-mix(in oklch, ${ink} 55%, transparent)`,
                background: `radial-gradient(circle, color-mix(in oklch, ${ink} 10%, transparent), transparent 70%)`,
              }),
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: ink,
        }}
      >
        {eyebrow}
      </span>
      <h2
        id={titleId}
        style={{
          margin: 0,
          fontSize: 24,
          fontWeight: 900,
          letterSpacing: '-0.035em',
          lineHeight: 1.1,
          textWrap: 'balance',
        }}
      >
        {title}
      </h2>
      {body !== undefined && (
        <span
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            maxWidth: 300,
            textWrap: 'pretty',
          }}
        >
          {body}
        </span>
      )}
      {action !== undefined && (
        <button type="button" onClick={action.onClick} style={ACTION_STYLE}>
          {action.label}
        </button>
      )}
    </div>
  );
}
