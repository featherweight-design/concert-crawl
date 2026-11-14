'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { RefreshCw, X } from 'lucide-react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { AdminButton, adminButtonVariantStyle } from './AdminButton';
import { COULDNT_LOAD_X_STROKE, StateMessage } from './StateMessage';

/**
 * A whole page's failure: the page's own title (if it draws one) above a
 * filled `CouldntLoad`. On desktop it fills the content area as a 16-gap
 * column, as `02/couldnt-load` lays out under the title (admin.css
 * `.admin-couldnt-load-page`).
 */
export const CouldntLoadPage = ({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) => (
  <div data-testid="couldnt-load-page" className="admin-couldnt-load-page">
    {title && <header>{title}</header>}
    {children}
  </div>
);

const copy = ADMIN_COPY.states.couldntLoad;

/**
 * The two buttons' box. `02/couldnt-load` draws them 38 tall, radius 9, 13.5px
 * side by side; `01/couldnt-load-m` stacks them full width at 44 and 14px.
 * The phone values come from `.admin-couldnt-load-actions` in admin.css, so
 * the route's `error.tsx` needs no viewport hook.
 */
export const COULDNT_LOAD_BUTTON_BOX: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 'var(--couldnt-load-button-height, 38px)',
  width: 'var(--couldnt-load-button-width, auto)',
  boxSizing: 'border-box',
  padding: '0 12px',
  borderRadius: 9,
  fontSize: 'var(--couldnt-load-button-size, 13.5px)',
  whiteSpace: 'nowrap',
};

/**
 * `02/couldnt-load`: the chrome stays, only the content area changes, and
 * nothing the admin decided is lost. Try again re-runs the page; Open Health
 * is the way out when it keeps failing.
 */
export const CouldntLoad = ({
  page,
  onRetry,
  fill = false,
}: {
  /** The page's name, e.g. "Needs you". Omitted, the title stays generic. */
  page?: string | undefined;
  onRetry: () => void;
  /**
   * The whole page failed: centre the state in the content area on desktop,
   * as `02/couldnt-load`'s `margin:auto` does. Render it inside a
   * `CouldntLoadPage` so there is height to centre in.
   */
  fill?: boolean;
}) => (
  <StateMessage
    testId="couldnt-load"
    role="alert"
    icon={X}
    tone="var(--danger)"
    tinted
    iconStrokeWidth={COULDNT_LOAD_X_STROKE}
    className={
      fill ? 'admin-couldnt-load admin-couldnt-load-fill' : 'admin-couldnt-load'
    }
    title={page ? copy.title(page) : copy.titleGeneric}
    body={copy.body}
    actions={
      <div
        data-testid="couldnt-load-actions"
        className="admin-couldnt-load-actions"
        style={{ display: 'flex', gap: 8 }}
      >
        <AdminButton
          type="button"
          variant="gradient"
          icon={RefreshCw}
          onClick={onRetry}
          style={COULDNT_LOAD_BUTTON_BOX}
        >
          {copy.tryAgain}
        </AdminButton>
        <Link
          href="/admin"
          style={{
            ...COULDNT_LOAD_BUTTON_BOX,
            ...adminButtonVariantStyle('outline'),
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          {copy.openHealth}
        </Link>
      </div>
    }
  />
);
