import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { SIDEBAR_WIDTH } from '@/components/admin/shell/content-pane';
import { useIsPhone } from './useIsPhone';
import { TOAST_SHADOW } from './shadows';

/**
 * Where a bottom toast sits: centred under the content column on desktop,
 * above the tab bar on the phone, `width` wide (the full row on the phone).
 * Toast uses it, and so does a `SaveFailedToast` that floats in the same
 * place (`43/approve-failed-d`).
 */
export const ToastDock = ({
  children,
  role,
  testId,
}: {
  children: ReactNode;
  role?: 'status';
  testId?: string;
}) => {
  const isPhone = useIsPhone();
  return (
    <div
      {...(role !== undefined && { role })}
      data-testid={testId}
      style={{
        position: 'fixed',
        zIndex: 60,
        // `07/role-changed-with-undo` centres it under the content column
        // (left:232px;right:0), not the viewport; the phone keeps 16 sides.
        left: isPhone ? 16 : SIDEBAR_WIDTH,
        right: isPhone ? 16 : 0,
        // `43/approve-m` floats it at bottom:96px, 32 above the 64px tab bar.
        bottom: isPhone ? 'calc(96px + env(safe-area-inset-bottom))' : 24,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: isPhone ? '100%' : 420,
          pointerEvents: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * The bottom toast (`07/role-changed-with-undo`, `12/signed-out-everywhere-d`,
 * `07/test-email-sent`): centred under the page on desktop, above the tab bar
 * on the phone.
 */
export const Toast = ({
  title,
  body,
  action,
  testId = 'admin-toast',
}: {
  title: string;
  body: string | null;
  action?: ReactNode;
  testId?: string;
}) => (
  <ToastDock role="status" testId={testId}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        border: '1px solid color-mix(in srgb, var(--success) 45%, transparent)',
        boxShadow: TOAST_SHADOW,
      }}
    >
      <Check
        size={16}
        strokeWidth={2.2}
        color="var(--success)"
        aria-hidden
        style={{ flex: 'none' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* A long unbroken handle ("@<50 chars> is now Beta") wraps inside
              the toast instead of running off a phone's edge (as #260). */}
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--fg-muted)',
              marginTop: 2,
              overflowWrap: 'anywhere',
            }}
          >
            {body}
          </div>
        )}
      </div>
      {action}
    </div>
  </ToastDock>
);
