import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The failure boards draw their X at stroke 1.8 in a 16 grid at 24px, which
 * is 2.7 in Lucide's 24 grid.
 */
export const COULDNT_LOAD_X_STROKE = 2.7;

/**
 * The 52 tile. Tinted is the failure boards' rgba(255,122,138,0.08) fill and
 * 0.4 edge, the tone over nothing; the rest keep their tone-mixed tile.
 */
export const stateTileStyle = (
  tone: string,
  tinted: boolean,
  neutral = false,
): CSSProperties => ({
  width: 52,
  height: 52,
  borderRadius: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: tone,
  // The empty boards (`06/events-no-results`, `07/people-no-results`) draw a
  // plain surface tile, not a tone-tinted one.
  background: neutral
    ? 'var(--surface-1)'
    : tinted
      ? `color-mix(in srgb, ${tone} 8%, transparent)`
      : `color-mix(in srgb, ${tone} 10%, var(--bg-elevated))`,
  border: neutral
    ? '1px solid var(--border)'
    : tinted
      ? `1px solid color-mix(in srgb, ${tone} 40%, transparent)`
      : `1px solid color-mix(in srgb, ${tone} 30%, transparent)`,
});

/**
 * The centred icon, title, line and actions that empty, couldn't-load and
 * not-found share (`02/couldnt-load`, `07/not-found`). Only the content area
 * changes; the page chrome stays. Every state board stacks the four 10 apart
 * with no extra margins, and draws a 52 tile at radius 15 holding a 24 icon.
 */
export const StateMessage = ({
  icon: Icon,
  tone,
  title,
  body,
  actions,
  testId,
  role,
  tinted = false,
  // Lucide's own default.
  iconStrokeWidth = 2,
  className,
  empty = false,
}: {
  /**
   * The empty-list boards' type and tile: a 17px title over a 13px line at 320
   * wide, on a plain surface tile. The failure and not-found boards keep the
   * default 18 / 13.5 / 400.
   */
  empty?: boolean;
  icon: LucideIcon;
  tone: string;
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  testId: string;
  role?: 'alert' | 'status';
  /**
   * The failure boards' tile: the tone at 8% over nothing, with a 40% edge
   * (`02/couldnt-load`, `10/panel-couldnt-load`, `inspect-couldnt-load`).
   */
  tinted?: boolean;
  /** The icon's stroke in Lucide's 24 grid, when a board draws it heavier. */
  iconStrokeWidth?: number;
  /** A hook for admin.css to place the state (padding, centring). */
  className?: string;
}) => (
  <div
    data-testid={testId}
    role={role}
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 10,
      // A var, so admin.css can place a state per board and breakpoint.
      padding: 'var(--state-message-padding, 64px 16px)',
    }}
  >
    <span
      aria-hidden
      data-testid={`${testId}-tile`}
      style={stateTileStyle(tone, tinted, empty)}
    >
      <Icon size={24} strokeWidth={iconStrokeWidth} />
    </span>
    <h2
      style={{
        margin: 0,
        fontSize: empty ? 17 : 18,
        fontWeight: 800,
        color: 'var(--fg)',
      }}
    >
      {title}
    </h2>
    {body && (
      <p
        style={{
          margin: 0,
          maxWidth: empty ? 320 : 400,
          fontSize: empty ? 13 : 13.5,
          lineHeight: 1.5,
          color: 'var(--fg-muted)',
        }}
      >
        {body}
      </p>
    )}
    {actions && (
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
          // A var, so admin.css can stretch the row to the state's width
          // (`01/couldnt-load-m`'s full-width buttons).
          alignSelf: 'var(--state-message-actions-align, auto)',
        }}
      >
        {actions}
      </div>
    )}
  </div>
);
