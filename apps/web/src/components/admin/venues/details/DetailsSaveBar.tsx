'use client';

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { PinnedSaveBar } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.venueDetails;

/**
 * Details' pinned Save bar (`details-d`, `details-m`): "{N} unsaved
 * change(s)", Discard, Save, shown only once something changed. A failed
 * save's toast floats above it, or above the screen's bottom once the bar is
 * gone (`07/save-failed`), as Source's does: both are `PinnedSaveBar`.
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
}) => (
  <PinnedSaveBar
    phone={phone}
    dirty={edited > 0}
    saving={saving}
    testId="details-save-bar"
    message={COPY.saveBar.unsaved(edited)}
    labels={COPY.saveBar}
    failure={failure === null ? null : { title: COPY.failed.title, ...failure }}
    onDiscard={onDiscard}
    onSave={onSave}
    look={{
      gap: phone ? 8 : 10,
      padding: phone ? '12px 16px 24px' : '0 28px',
      // `details-d` runs the bar across the whole content pane, 64 tall, with
      // a top rule only and the panel colour at 85%.
      ...(phone
        ? {}
        : {
            pane: { height: 64 },
            barStyle: {
              border: 'none',
              borderTop: '1px solid var(--border)',
              borderRadius: 0,
              background:
                'color-mix(in srgb, var(--bg-elevated) 85%, transparent)',
            },
          }),
      messageStyle: { fontSize: 12.5, color: 'var(--warning)', flex: 1 },
      discardVariant: 'ghost',
      // `details-m` draws both buttons 42 tall and Save at 14px; `details-d`
      // draws them 38 tall at 13.5px. Both round them to 9.
      discardStyle: {
        height: phone ? 42 : 38,
        fontSize: 13.5,
        fontWeight: 600,
        borderRadius: 9,
      },
      saveStyle: {
        height: phone ? 42 : 38,
        padding: '0 22px',
        fontSize: phone ? 14 : 13.5,
        borderRadius: 9,
      },
    }}
  />
);
