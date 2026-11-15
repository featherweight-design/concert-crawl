import type { ReactNode } from 'react';

/**
 * A page card: title, an optional action at the right, then its body. Drawn
 * on the venue Overview (`04/venue-overview`) and Event edit (`06/event-edit`).
 */
export const AdminCard = ({
  title,
  action,
  phone,
  testId,
  children,
}: {
  title: string;
  action?: ReactNode;
  phone: boolean;
  testId: string;
  children: ReactNode;
}) => (
  <section
    data-testid={testId}
    aria-label={title}
    style={{
      borderRadius: 14,
      border: '1px solid var(--border)',
      background: 'var(--bg-elevated)',
      padding: phone ? '14px 16px' : '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 0,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>
      <span style={{ flex: 1 }} />
      {action}
    </div>
    {children}
  </section>
);

/** A card's ruled key/value row: the label muted at the left, the value right. */
export const AdminCardRow = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 13,
      padding: '8px 0',
      borderTop: '1px solid var(--border)',
    }}
  >
    {/* The label keeps its width; a long value wraps instead (at 320 a
        link squeezed "Source" into "Sourc e"). */}
    <span style={{ color: 'var(--fg-muted)', flex: 'none' }}>{label}</span>
    <span style={{ textAlign: 'right', minWidth: 0 }}>{children}</span>
  </div>
);
