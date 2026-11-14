'use client';

import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import { TAB_BAR_HEIGHT } from '@/components/admin/shell/tab-bar-height';
import { AdminButton } from './AdminButton';
import { SaveFailedToast } from './SaveFailedToast';

/**
 * What differs between the boards that draw this bar (Details' `details-d`
 * and `details-m`, Source's `venue-source` and `G4/source-feed-edited`).
 * Each call site passes its own, so neither board is bent to the other.
 */
export type PinnedSaveBarLook = {
  gap: number;
  padding: string;
  /** Lets the message wrap onto a row of its own when the bar runs short. */
  wrap?: boolean;
  /**
   * Message on one row, Discard and Save on a row under it, both `gap` apart
   * (Source on the phone, `G4/source-feed-edited`).
   */
  stack?: boolean;
  messageStyle: CSSProperties;
  discardVariant: NonNullable<ComponentProps<typeof AdminButton>['variant']>;
  discardStyle?: CSSProperties;
  saveStyle?: CSSProperties;
};

export type PinnedSaveBarProps = {
  phone: boolean;
  /** Something changed; false takes the bar down. */
  dirty: boolean;
  saving: boolean;
  testId: string;
  /** The "unsaved" line before Discard. */
  message: ReactNode;
  labels: { discard: string; save: string; saving: string };
  /** Left without `onRetry` for a refusal that would only be refused again. */
  failure: { title: string; saved: string; onRetry?: () => void } | null;
  onDiscard: () => void;
  onSave: () => void;
  look: PinnedSaveBarLook;
};

/**
 * A venue tab's pinned Save bar: the "unsaved" line, Discard and Save, shown
 * only while something changed. A failed save's toast (`07/save-failed`)
 * floats 12px above the bar, or 24px above the screen's bottom (above the
 * tab bar on the phone) once the bar is gone (`G4/source-save-failed`).
 */
export const PinnedSaveBar = ({
  phone,
  dirty,
  saving,
  testId,
  message,
  labels,
  failure,
  onDiscard,
  onSave,
  look,
}: PinnedSaveBarProps) => {
  // No Dismiss: the board draws Try again only; the next save or Discard
  // clears it.
  const toast =
    failure === null ? null : (
      <div
        style={{ borderRadius: 12, boxShadow: '0 14px 30px rgba(0,0,0,0.45)' }}
      >
        <SaveFailedToast
          title={failure.title}
          saved={failure.saved}
          retrying={saving}
          {...(failure.onRetry === undefined
            ? {}
            : { onRetry: failure.onRetry })}
        />
      </div>
    );

  const buttons = (
    <>
      <AdminButton
        type="button"
        variant={look.discardVariant}
        disabled={saving}
        onClick={onDiscard}
        style={look.discardStyle}
      >
        {labels.discard}
      </AdminButton>
      <AdminButton
        type="button"
        variant="gradient"
        disabled={saving}
        onClick={onSave}
        style={look.saveStyle}
      >
        {saving ? labels.saving : labels.save}
      </AdminButton>
    </>
  );

  if (!dirty) {
    if (toast === null) return null;
    return (
      <div
        style={{
          position: 'sticky',
          bottom: phone
            ? `calc(${TAB_BAR_HEIGHT + 24}px + env(safe-area-inset-bottom))`
            : 24,
          height: 0,
          // Cancels the column's gap, so the anchor takes no room.
          marginTop: -16,
          zIndex: 30,
        }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          {toast}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        display: 'flex',
        ...(look.stack === true
          ? { flexDirection: 'column' }
          : { alignItems: 'center' }),
        gap: look.gap,
        ...(look.wrap === true ? { flexWrap: 'wrap' } : {}),
        padding: look.padding,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: phone ? 0 : 12,
      }}
    >
      {/* A refusal keeps the edit, so the bar stays: float above it. */}
      {toast !== null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'calc(100% + 12px)',
          }}
        >
          {toast}
        </div>
      )}
      <span style={look.messageStyle}>{message}</span>
      {look.stack === true ? (
        <div style={{ display: 'flex', gap: look.gap }}>{buttons}</div>
      ) : (
        buttons
      )}
    </div>
  );
};
