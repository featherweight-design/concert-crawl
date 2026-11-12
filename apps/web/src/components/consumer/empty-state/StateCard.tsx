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
  /**
   * `notif-tab` draws the addendum-3 notification tab boards' measurements
   * (`notif-tab-empty-m`, `notif-tab-failed-m`): 9.5px eyebrow, explicit
   * margins instead of a flex gap, and the board's own title, body and action
   * sizes. Every other caller keeps the default.
   */
  variant?: 'default' | 'notif-tab';
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
 * The failed board's Retry: 12/24 padding, r12, 14.5px, a 135deg sweep that
 * ends on the signal/accent mix and a 22% signal glow. The 44px floor stays
 * (the board draws ~42px; the repo's tap-target rule wins by 2px).
 */
const TAB_ACTION_STYLE: React.CSSProperties = {
  ...ACTION_STYLE,
  marginTop: 0,
  padding: '12px 24px',
  borderRadius: 12,
  fontSize: 14.5,
  letterSpacing: 0,
  background:
    'linear-gradient(135deg, var(--signal), color-mix(in oklch, var(--signal), var(--accent)))',
  boxShadow: '0 8px 24px color-mix(in oklch, var(--signal) 22%, transparent)',
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
  variant = 'default',
}: StateCardProps) {
  const tab = variant === 'notif-tab';
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
        gap: tab ? 0 : 10,
        padding: tab
          ? framed
            ? '34px 18px 30px'
            : '30px 22px'
          : framed
            ? '34px 22px 30px'
            : '34px 22px',
        borderRadius: 18,
        border: framed ? '1px dashed var(--border-strong)' : 'none',
        background: framed
          ? tab
            ? 'color-mix(in oklch, var(--surface-1) 45%, transparent)'
            : 'linear-gradient(180deg, color-mix(in oklch, var(--surface-1) 70%, transparent), transparent)'
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
          marginBottom: tab ? 0 : 12,
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
          fontSize: tab ? 9.5 : 10.5,
          fontWeight: 700,
          letterSpacing: tab ? '0.16em' : '0.2em',
          textTransform: 'uppercase',
          color: ink,
          ...(tab ? { marginTop: tone === 'danger' ? 18 : 16 } : {}),
        }}
      >
        {eyebrow}
      </span>
      <h2
        id={titleId}
        style={{
          margin: 0,
          fontSize: tab && tone === 'danger' ? 28 : 24,
          fontWeight: 900,
          letterSpacing: tab
            ? tone === 'danger'
              ? '-0.03em'
              : '-0.025em'
            : '-0.035em',
          lineHeight: 1.1,
          textWrap: 'balance',
          ...(tab
            ? {
                marginTop: 8,
                ...(tone === 'danger' ? { maxWidth: 320 } : {}),
              }
            : {}),
        }}
      >
        {title}
      </h2>
      {body !== undefined && (
        <span
          style={{
            fontSize: tab && tone === 'danger' ? 14.5 : 14,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
            maxWidth: tab && tone === 'danger' ? 320 : 300,
            textWrap: 'pretty',
            ...(tab ? { marginTop: tone === 'danger' ? 10 : 8 } : {}),
          }}
        >
          {body}
        </span>
      )}
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onClick}
          style={tab ? { ...TAB_ACTION_STYLE, marginTop: 22 } : ACTION_STYLE}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
