import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The centred icon, title, line and actions that empty, couldn't-load and
 * not-found share (`02/couldnt-load`, `07/not-found`). Only the content area
 * changes; the page chrome stays.
 */
export const StateMessage = ({
  icon: Icon,
  tone,
  title,
  body,
  actions,
  testId,
  role,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  body?: ReactNode;
  actions?: ReactNode;
  testId: string;
  role?: 'alert' | 'status';
}) => (
  <div
    data-testid={testId}
    role={role}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 10,
      padding: '64px 16px',
    }}
  >
    <span
      aria-hidden
      style={{
        width: 52,
        height: 52,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: tone,
        background: `color-mix(in srgb, ${tone} 10%, var(--bg-elevated))`,
        border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)`,
      }}
    >
      <Icon size={22} />
    </span>
    <h2
      style={{
        margin: '4px 0 0',
        fontSize: 18,
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
          maxWidth: 400,
          fontSize: 13.5,
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
          marginTop: 4,
        }}
      >
        {actions}
      </div>
    )}
  </div>
);
