'use client';

import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useDialogKeyboard } from './useDialogKeyboard';

export interface SidePanelProps {
  onClose: () => void;
  title: string;
  /** A `KindLabel` or similar, above the title. */
  eyebrow?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  /**
   * No scrim, no trap: the panel sits beside the page. Only Needs you on
   * desktop uses it, so you can work down the queue (rule 4).
   */
  inline?: boolean;
  /** False mid-request: the scrim and Escape stop closing it. */
  dismissible?: boolean;
}

const PanelBody = ({
  title,
  titleId,
  eyebrow,
  subtitle,
  children,
  footer,
  onClose,
}: Omit<SidePanelProps, 'width' | 'inline' | 'dismissible'> & {
  titleId: string;
}) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {eyebrow}
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onClose}
        aria-label={ADMIN_COPY.panel.close}
        style={{
          display: 'flex',
          padding: 6,
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--fg-muted)',
          cursor: 'pointer',
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
    <div>
      <h2
        id={titleId}
        style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--fg-muted)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</div>
    {footer && (
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {footer}
      </div>
    )}
  </>
);

const panelStyle = (width: number): React.CSSProperties => ({
  width,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '22px 24px',
  background: 'var(--bg-elevated)',
  borderLeft: '1px solid var(--border)',
});

const OverlayPanel = ({
  width = 460,
  dismissible = true,
  ...props
}: SidePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(panelRef, props.onClose, { dismissible });
  return (
    <div
      data-testid="side-panel-scrim"
      onClick={(evt) => {
        if (dismissible && evt.target === evt.currentTarget) props.onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="side-panel"
        style={{
          ...panelStyle(width),
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <PanelBody {...props} titleId={titleId} />
      </div>
    </div>
  );
};

/**
 * An edit in flow (rule 4): a panel that overlays the page with a dim scrim,
 * so the table underneath keeps its full width. Render it only while open.
 */
export const SidePanel = (props: SidePanelProps) => {
  const titleId = useId();
  if (!props.inline) return <OverlayPanel {...props} />;
  return (
    <aside
      aria-labelledby={titleId}
      data-testid="side-panel"
      style={{ ...panelStyle(props.width ?? 460), alignSelf: 'stretch' }}
    >
      <PanelBody {...props} titleId={titleId} />
    </aside>
  );
};
