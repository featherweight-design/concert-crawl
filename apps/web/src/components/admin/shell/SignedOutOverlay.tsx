'use client';

import { useId, useRef } from 'react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { useDialogKeyboard } from '@/components/admin/primitives/useDialogKeyboard';

const copy = ADMIN_COPY.states.signedOut;

/**
 * `07/signed-out`: a scrim over the whole admin shell (sidebar and bottom bar
 * included) and one centred card with a single action. It cannot be dismissed:
 * there is nothing to go back to until the session is back. It sits over the
 * page and never navigates, so what the admin was editing stays mounted.
 *
 * The board is drawn on the desktop only; the phone shows the same card,
 * centred with a 16px margin each side.
 */
export const SignedOutOverlay = ({ onSignIn }: { onSignIn: () => void }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const bodyId = useId();
  // Focus lands on the button and stays inside the card; Escape does nothing.
  useDialogKeyboard(panelRef, () => undefined, { dismissible: false });

  return (
    <div
      data-testid="admin-signed-out-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        // Above every admin surface, dialogs (100) included.
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(4, 6, 16, 0.6)',
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        style={{
          width: '100%',
          maxWidth: 360,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          borderRadius: 16,
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-elevated)',
        }}
      >
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 800,
            color: 'var(--fg)',
          }}
        >
          {copy.title}
        </h2>
        <p
          id={bodyId}
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--fg-muted)',
          }}
        >
          {copy.body}
        </p>
        <button
          type="button"
          onClick={onSignIn}
          style={{
            width: '100%',
            height: 42,
            marginTop: 4,
            border: 'none',
            borderRadius: 9,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--fg-on-accent)',
            background: 'linear-gradient(135deg, var(--signal), var(--accent))',
          }}
        >
          {copy.signIn}
        </button>
      </div>
    </div>
  );
};
