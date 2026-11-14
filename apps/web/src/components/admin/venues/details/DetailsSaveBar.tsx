'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { TAB_BAR_HEIGHT } from '@/components/admin/shell/MobileBottomBar';
import { AdminButton, SaveFailedToast } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.venueDetails;

/**
 * Details' pinned Save bar (`details-d`, `details-m`): "{N} unsaved
 * change(s)", Discard, Save, shown only once something changed. A failed
 * save's toast floats above it, or above the screen's bottom once the bar is
 * gone (`07/save-failed`), as Source's does.
 */
export const DetailsSaveBar = ({
  phone,
  edited,
  saving,
  failure,
  onDiscard,
  onSave,
}: {
  phone: boolean;
  /** How many fields changed; none hides the bar. */
  edited: number;
  saving: boolean;
  /** Left without `onRetry` for a refusal that would only be refused again. */
  failure: { saved: string; onRetry?: () => void } | null;
  onDiscard: () => void;
  onSave: () => void;
}) => {
  // No Dismiss: the board draws Try again only; the next save or Discard
  // clears it.
  const toast =
    failure === null ? null : (
      <div
        style={{ borderRadius: 12, boxShadow: '0 14px 30px rgba(0,0,0,0.45)' }}
      >
        <SaveFailedToast
          title={COPY.failed.title}
          saved={failure.saved}
          retrying={saving}
          {...(failure.onRetry === undefined
            ? {}
            : { onRetry: failure.onRetry })}
        />
      </div>
    );

  if (edited === 0) {
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
      data-testid="details-save-bar"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        gap: phone ? 8 : 10,
        padding: phone ? '12px 16px 24px' : '13px 16px',
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
      <span style={{ fontSize: 12.5, color: 'var(--warning)', flex: 1 }}>
        {COPY.saveBar.unsaved(edited)}
      </span>
      <AdminButton
        type="button"
        variant="ghost"
        disabled={saving}
        onClick={onDiscard}
        style={{ height: 38, fontSize: 13.5, fontWeight: 600 }}
      >
        {COPY.saveBar.discard}
      </AdminButton>
      <AdminButton
        type="button"
        variant="gradient"
        disabled={saving}
        onClick={onSave}
        style={{
          height: 38,
          padding: '0 22px',
          fontSize: 13.5,
          borderRadius: 9,
        }}
      >
        {saving ? COPY.saveBar.saving : COPY.saveBar.save}
      </AdminButton>
    </div>
  );
};
