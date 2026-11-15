'use client';

import { useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { AdminFeatureFlag } from '@concert-crawl/entitlements';
import { AdminButton, useDialogKeyboard } from '@/components/admin/primitives';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FlagHistory } from './FlagHistory';
import { StageLadder, stageOf, type Stage } from './StageLadder';
import { mention, shortDate } from './flag-drawer-format';

const COPY = ADMIN_COPY.featureFlags;
const DRAWER = COPY.drawer;

const SECTION_LABEL = {
  fontSize: 10,
  letterSpacing: '0.14em',
  fontWeight: 600,
  color: 'var(--fg-subtle)',
  textTransform: 'uppercase',
} as const;

interface FlagDrawerProps {
  flag: AdminFeatureFlag;
  onClose: () => void;
  onPick: (stage: Stage) => void;
  onMarkVerified: () => void;
  onUndoVerified: () => void;
  saving: boolean;
}

// The flag's panel: a 460px drawer on the right of the list
// (`07-people-flags-operations/a-flag-in-staging-admin-in-flow`). The boards do
// not draw what opens it; the flag's name does. Phone width is not drawn, so
// the drawer takes the full width there until the phone sheets are built.
export const FlagDrawer = ({
  flag,
  onClose,
  onPick,
  onMarkVerified,
  onUndoVerified,
  saving,
}: FlagDrawerProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // A press that starts inside the panel and ends on the scrim (a text
  // selection dragged out) is not a click on the scrim.
  const pressedOnScrim = useRef(false);
  useDialogKeyboard(panelRef, onClose);

  const onStaging = flag.environment !== 'production';
  const stage = stageOf(flag);

  // What changes the History list: any save moves one of these.
  const version = [flag.updatedAt, flag.verifiedAt].join('|');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={flag.label}
      data-testid={`flag-drawer-${flag.key}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(4,6,16,0.55)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onMouseDown={(evt) => {
        pressedOnScrim.current = evt.target === evt.currentTarget;
      }}
      onClick={(evt) => {
        if (evt.target === evt.currentTarget && pressedOnScrim.current) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          outline: 'none',
          width: 460,
          maxWidth: '100%',
          height: '100%',
          overflowY: 'auto',
          padding: '22px 24px',
          background: 'var(--bg-elevated)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-18px 0 40px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              ...SECTION_LABEL,
              display: 'inline-flex',
              alignItems: 'center',
              height: 18,
              padding: '0 6px',
              borderRadius: 5,
              color: 'var(--signal)',
              border:
                '1px solid color-mix(in oklab, var(--signal) 35%, transparent)',
            }}
          >
            {DRAWER.tag}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 26,
              padding: '0 10px',
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--warning)',
              border:
                '1px solid color-mix(in oklab, var(--warning) 35%, transparent)',
            }}
          >
            {onStaging ? DRAWER.envStaging : DRAWER.envProduction}
          </span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            aria-label={DRAWER.closeAriaLabel(flag.label)}
            data-testid="flag-drawer-close"
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              color: 'var(--fg-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--fg)',
            }}
          >
            {flag.label}
          </h3>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'var(--fg-muted)',
            }}
          >
            {flag.description}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={SECTION_LABEL}>
            {onStaging ? DRAWER.whoSeesStaging : DRAWER.whoSeesProduction}
          </span>
          <StageLadder flag={flag} onPick={onPick} scope="drawer" />
        </div>

        {flag.verifiedAt ? (
          <div
            data-testid="flag-drawer-verified"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'color-mix(in oklab, var(--success) 8%, transparent)',
              border:
                '1px solid color-mix(in oklab, var(--success) 30%, transparent)',
            }}
          >
            <Check
              size={14}
              aria-hidden="true"
              style={{ color: 'var(--success)', marginTop: 2 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--fg)' }}>
                {DRAWER.verifiedBy(
                  shortDate(flag.verifiedAt),
                  mention(flag.verifiedByHandle ?? null),
                )}
              </div>
              {flag.verifiedNote && (
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {`“${flag.verifiedNote}”`}
                </div>
              )}
            </div>
            {onStaging && (
              <button
                type="button"
                onClick={onUndoVerified}
                disabled={saving}
                aria-label={COPY.markVerified.undoAriaLabel(flag.label)}
                data-testid="flag-drawer-undo-verified"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 6px',
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  cursor: 'pointer',
                }}
              >
                {COPY.markVerified.undo}
              </button>
            )}
          </div>
        ) : (
          onStaging &&
          stage !== 'off' && (
            <div>
              <AdminButton
                variant="outline"
                size="sm"
                onClick={onMarkVerified}
                disabled={saving}
                data-testid="flag-drawer-mark-verified"
              >
                {COPY.markVerified.button}
              </AdminButton>
            </div>
          )
        )}

        <FlagHistory flagKey={flag.key} version={version} />
      </div>
    </div>
  );
};
