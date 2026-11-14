'use client';

import { useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useContentBox } from './useContentBox';
import { useDialogKeyboard } from './useDialogKeyboard';
import { useIsNarrowDesktop } from './useIsPhone';

export interface SidePanelProps {
  onClose: () => void;
  /** Text, or a styled node such as an invite code in mono. */
  title: ReactNode;
  /** A `KindLabel` or similar, above the title. */
  eyebrow?: ReactNode;
  /**
   * The title sits in the close button's row at 18px instead of under it,
   * as `12/code-taken-d` draws the new-code panel. It shows no eyebrow and
   * no subtitle.
   */
  titleInHeader?: boolean;
  /** The accessible name, when it should say more than the visible title. */
  label?: string;
  /** A ⋯ menu, just before the close button. */
  menu?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * `ruled`: the footer starts at the left under a top border, as
   * `07/a-code-in-flow` draws it. Omitted, it stays right-aligned.
   */
  footerLayout?: 'end' | 'ruled';
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
  titleInHeader = false,
  menu,
  subtitle,
  children,
  footer,
  footerLayout = 'end',
  onClose,
  dismissible = true,
}: Omit<SidePanelProps, 'width' | 'inline'> & {
  titleId: string;
}) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {titleInHeader ? (
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--fg)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h2>
      ) : (
        eyebrow
      )}
      <span style={{ flex: 1 }} />
      {menu}
      {/* Mid-request the ✕ is off too, like the scrim and Escape, so a reply
          the panel still has to show (a refused date) isn't closed away. */}
      <button
        type="button"
        onClick={onClose}
        disabled={!dismissible}
        aria-label={ADMIN_COPY.panel.close}
        style={{
          display: 'flex',
          padding: 6,
          border: 'none',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--fg-muted)',
          cursor: dismissible ? 'pointer' : 'default',
          opacity: dismissible ? 1 : 0.45,
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
    {!titleInHeader && (
      <div>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--fg)',
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 13,
              color: 'var(--fg-muted)',
              // A byline can carry a long handle with nowhere to break.
              overflowWrap: 'anywhere',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    )}
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{children}</div>
    {footer && (
      <div
        style={{
          display: 'flex',
          gap: 8,
          ...(footerLayout === 'ruled'
            ? { paddingTop: 12, borderTop: '1px solid var(--border)' }
            : { justifyContent: 'flex-end' }),
        }}
      >
        {footer}
      </div>
    )}
  </>
);

/** The docked panel's width on the Needs you boards (`02/needs-you-desktop`). */
export const DOCKED_PANEL_WIDTH = 440;

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
  const content = useContentBox();
  useDialogKeyboard(panelRef, props.onClose, { dismissible });
  return (
    <div
      data-testid="side-panel-scrim"
      onClick={(evt) => {
        if (dismissible && evt.target === evt.currentTarget) props.onClose();
      }}
      style={{
        position: 'fixed',
        top: content.top,
        left: content.left,
        right: 0,
        bottom: 0,
        zIndex: 90,
        background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        {...(props.label
          ? { 'aria-label': props.label }
          : { 'aria-labelledby': titleId })}
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
        <PanelBody {...props} dismissible={dismissible} titleId={titleId} />
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
  const content = useContentBox();
  const narrow = useIsNarrowDesktop();
  // A desktop too narrow to dock the panel beside the list overlays it instead.
  if (!props.inline || narrow) return <OverlayPanel {...props} />;
  return (
    <aside
      {...(props.label
        ? { 'aria-label': props.label }
        : { 'aria-labelledby': titleId })}
      data-testid="side-panel"
      style={{
        ...panelStyle(props.width ?? DOCKED_PANEL_WIDTH),
        // `02/needs-you-desktop`: docked flush to the right edge, the full
        // height under the topbar, with the list keeping `right: 440`. Fixed to
        // the content area's top (the page scrolls under it), and it scrolls
        // on its own when taller than the screen.
        position: 'fixed',
        top: content.top,
        right: 0,
        bottom: 0,
        zIndex: 40,
        gap: 20,
        overflowY: 'auto',
      }}
    >
      <PanelBody {...props} titleId={titleId} />
    </aside>
  );
};
